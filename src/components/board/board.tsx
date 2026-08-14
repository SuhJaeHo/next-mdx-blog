"use client";

import React, { useRef, useEffect, useLayoutEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getGroupElementBoundaryPositions,
  getContainerEdgeIndicator,
  getGroupTabsNewIdList,
  getTabMoveStatus,
  handleTabJoinGroup,
  handleTabLeaveGroup,
  resetGroupTabsTranslate,
  setGroupElementForeground,
  shiftSiblingTabs,
} from "./utils";
import { CUSTOM_ZINDEX, GROUP_RESIZE_SNAP_DURATION_MS, RESIZE_DIRECTIONS, TAB_MOVE_STATUS, TAB_TRANSLATE_STATUS } from "./constants";
import { IGroup, IPosition, IGroupIndicate } from "./types";
import { cn } from "@lib/utils";
import { cva } from "class-variance-authority";
import { usePathname } from "next/navigation";
import { BoardLayoutProvider, BoardLayoutConstants, useBoardLayoutContext } from "./board-layout-provider";
import { BoardDataProvider, BoardDataState, useBoardDataContext } from "./board-data-provider";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { useTranslations } from "next-intl";
import { useLocaleController } from "@app/[locale]/locale-provider";
import { ChevronLeft, ChevronRight } from "lucide-react";

const tabMessageKeys = {
  "portfolio-overview.mdx": "portfolioOverview",
  "introduce.mdx": "introduce",
  "career.mdx": "career",
  "npm-publish.mdx": "npmPublish",
  "mdx.mdx": "mdx",
  "npm-readme.mdx": "npmReadme",
} as const;

const tabMessageKeysById = {
  "introduce-portfolio-tab": "careerPortfolio",
} as const;

// Only applied when a dragged group snaps into the half-size drop indicator on release.
const GROUP_RESIZE_SNAP_TRANSITION = ["top", "left", "width", "height"]
  .map((property) => `${property} ${GROUP_RESIZE_SNAP_DURATION_MS}ms ease-out`)
  .join(", ");

// Shared by the resize-handle math for TOP/LEFT (the "start" edge of an axis, which moves
// as the group is resized) and BOTTOM/RIGHT (the "end" edge, which stays fixed) below.
// These mirror the original per-direction closures' branches exactly (min-size clamp,
// container-boundary clamp, normal drag) â€” see handleResizeXXXDirection call sites for
// how each axis/edge maps onto these params.
const computeResizeStartEdge = (params: { edge: number; size: number; delta: number; minSize: number; minBound: number; containerOffset: number; pointerCoord: number }) => {
  const { edge, size, delta, minSize, minBound, containerOffset, pointerCoord } = params;

  if (size - delta < minSize) {
    const newEdge = edge + (size - minSize);
    return { edge: newEdge, size: minSize, pos: containerOffset + newEdge };
  }
  if (edge + delta <= minBound) {
    return { edge: minBound, size: size + (edge - minBound), pos: containerOffset + minBound };
  }
  return { edge: edge + delta, size: size - delta, pos: pointerCoord };
};

const syncTabDragPreview = (tab: HTMLElement) => {
  const preview = document.querySelector<HTMLElement>("[data-tab-drag-preview]");
  if (!preview) return;

  const rect = tab.getBoundingClientRect();
  preview.style.setProperty("left", `${rect.left}px`, "important");
  preview.style.setProperty("top", `${rect.top}px`, "important");
};

const createTabDragPreview = (tab: HTMLElement) => {
  document.querySelector("[data-tab-drag-preview]")?.remove();

  const rect = tab.getBoundingClientRect();
  const preview = tab.cloneNode(true) as HTMLElement;
  preview.removeAttribute("id");
  Array.from(preview.attributes).forEach(({ name }) => {
    if (name.startsWith("data-")) preview.removeAttribute(name);
  });
  preview.setAttribute("data-tab-drag-preview", "");
  preview.setAttribute("data-selected", "true");
  preview.setAttribute("aria-hidden", "true");
  preview.style.setProperty("position", "fixed", "important");
  preview.style.setProperty("left", `${rect.left}px`, "important");
  preview.style.setProperty("top", `${rect.top}px`, "important");
  preview.style.setProperty("width", `${rect.width}px`, "important");
  preview.style.setProperty("height", `${rect.height}px`, "important");
  preview.style.setProperty("transform", "none", "important");
  preview.style.setProperty("transition", "none", "important");
  preview.style.setProperty("pointer-events", "none", "important");
  preview.style.setProperty("z-index", CUSTOM_ZINDEX.OVERLAY, "important");
  document.body.appendChild(preview);
};

const computeResizeEndEdge = (params: { edge: number; size: number; delta: number; minSize: number; containerSize: number; containerOffset: number; pointerCoord: number }) => {
  const { edge, size, delta, minSize, containerSize, containerOffset, pointerCoord } = params;

  if (size + delta < minSize) {
    return { size: minSize, pos: containerOffset + edge + minSize };
  }
  if (size + delta >= containerSize - edge) {
    return { size: containerSize - edge, pos: containerOffset + containerSize };
  }
  return { size: size + delta, pos: pointerCoord };
};

/* -------------------------------------------------------------------------------------------------
 * Root
 * ----------------------------------------------------------------------------------------------- */

interface IRoot {
  boardData: BoardDataState;
  customConstants?: BoardLayoutConstants;
}

const Root: React.FC<React.PropsWithChildren<IRoot>> = ({ children, boardData, customConstants }) => {
  return (
    <BoardLayoutProvider customConstants={customConstants}>
      <BoardDataProvider boardData={boardData}>{children}</BoardDataProvider>
    </BoardLayoutProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Nav
 * ----------------------------------------------------------------------------------------------- */

interface INav extends React.ComponentPropsWithoutRef<"nav"> {}

const Nav = React.forwardRef<React.ElementRef<"nav">, INav>(({ children, className }, ref) => {
  return (
    <nav className={className} ref={ref}>
      {children}
    </nav>
  );
});

Nav.displayName = "Nav";

/* -------------------------------------------------------------------------------------------------
 * NavList
 * ----------------------------------------------------------------------------------------------- */

interface INavListProps extends React.HTMLAttributes<HTMLElement> {}

const NavList = React.forwardRef<React.ElementRef<"div">, INavListProps>(({ className }, forwardedRef) => {
  const pathname = usePathname();
  const { boardDataState, boardDataDispatch } = useBoardDataContext();
  const { locale } = useLocaleController();
  const t = useTranslations("Navigation");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({ opacity: 0 });
  const currentPageId = boardDataState.selectedPageId;
  const pathnamePageId = pathname.split("/").filter(Boolean).at(-1);
  const pageIds = Object.keys(boardDataState.page);

  const setRootRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );

  const updateIndicator = React.useCallback(() => {
    const currentItem = itemRefs.current[currentPageId];
    if (!currentItem) {
      setIndicatorStyle({ opacity: 0 });
      return;
    }

    setIndicatorStyle({
      width: currentItem.offsetWidth,
      height: currentItem.offsetHeight,
      opacity: 1,
      transform: `translate3d(${currentItem.offsetLeft}px, ${currentItem.offsetTop}px, 0)`,
    });
  }, [currentPageId]);

  useEffect(() => {
    if (pathnamePageId && boardDataState.page[pathnamePageId]) {
      boardDataDispatch({ type: "SELECT_PAGE", payload: { pageId: pathnamePageId } });
    }
  }, [boardDataDispatch, boardDataState.page, pathnamePageId]);

  useLayoutEffect(() => {
    const animationFrame = requestAnimationFrame(updateIndicator);
    const root = rootRef.current;
    if (!root || !("ResizeObserver" in window)) {
      return () => cancelAnimationFrame(animationFrame);
    }

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(root);
    pageIds.forEach((pageId) => {
      const item = itemRefs.current[pageId];
      if (item) observer.observe(item);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [pageIds, updateIndicator]);

  const handleClickNavItem = (pageId: string) => {
    boardDataDispatch({ type: "SELECT_PAGE", payload: { pageId } });
    history.pushState({}, "", `/${locale}/${boardDataState.page[pageId].id}`);
  };

  return (
    <div ref={setRootRef} className="relative">
      <div
        className="pointer-events-none absolute left-0 top-0 z-0 rounded-lg bg-secondary/80 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.5)] transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-indicator dark:bg-secondary/35 dark:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.12)]"
        style={indicatorStyle}
        aria-hidden
      />
      {pageIds.map((pageId) => (
        <div
          ref={(node) => {
            itemRefs.current[pageId] = node;
          }}
          className={cn("relative z-10", className)}
          key={pageId}
          data-selected={pageId === currentPageId}
          onClick={() => handleClickNavItem(pageId)}
        >
          {t(pageId)}
        </div>
      ))}
    </div>
  );
});

NavList.displayName = "NavList";

interface IPanelProps extends React.ComponentPropsWithoutRef<"div"> {
  autoFitIntroduce?: boolean;
}

const Panel: React.FC<React.PropsWithChildren<IPanelProps>> = ({ autoFitIntroduce = true, className, children }) => {
  const { boardDataState, boardDataDispatch } = useBoardDataContext();
  const { boardLayoutState, boardLayoutConstants, boardLayoutDispatch } = useBoardLayoutContext();
  const { GROUP_MINIMUM_SIZE } = boardLayoutConstants;

  const groupIndicateStatus = boardLayoutState.groupIndicate;

  const boardDataContextRef = useRef(boardDataState);
  const groupIndicateRef = useRef<null | IGroupIndicate>(null);
  const containerRef = useRef<React.ElementRef<"div"> | null>(null);

  useEffect(() => {
    groupIndicateRef.current = groupIndicateStatus;
  }, [groupIndicateStatus]);

  useEffect(() => {
    boardDataContextRef.current = boardDataState;
  }, [boardDataState]);

  useLayoutEffect(() => {
    if (!autoFitIntroduce) return;

    const container = containerRef.current;
    if (!container || !("ResizeObserver" in window)) return;

    let previousContainerSize: { width: number; height: number } | null = null;
    const animationFrames = new Set<number>();
    const cleanupTimers = new Set<number>();

    const fitIntroduceGroup = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;

      const groupId = boardDataContextRef.current.page.introduce?.groupIds[0];
      const group = groupId ? boardDataContextRef.current.group[groupId] : null;
      if (!groupId || !group) return;

      const groupElement = container.querySelector<HTMLElement>(`[data-group][data-page-id="introduce"]`);
      const isInitialFit = previousContainerSize === null;
      const wasStillAutoFitted =
        !!groupElement &&
        !!previousContainerSize &&
        groupElement.offsetLeft === 0 &&
        groupElement.offsetTop === 0 &&
        groupElement.offsetWidth === previousContainerSize.width &&
        groupElement.offsetHeight === previousContainerSize.height;

      previousContainerSize = { width, height };
      if (!isInitialFit && !wasStillAutoFitted) return;

      if (groupElement) {
        const clearTransition = (event?: TransitionEvent) => {
          if (event && event.target !== groupElement) return;
          groupElement.style.transition = "";
          groupElement.removeEventListener("transitionend", clearTransition);
        };

        groupElement.addEventListener("transitionend", clearTransition);
        groupElement.style.setProperty("transition", GROUP_RESIZE_SNAP_TRANSITION, "important");

        const cleanupTimer = window.setTimeout(() => {
          clearTransition();
          cleanupTimers.delete(cleanupTimer);
        }, GROUP_RESIZE_SNAP_DURATION_MS + 100);
        cleanupTimers.add(cleanupTimer);
      }

      // Keep the initial dimensions on screen for one frame so the browser can
      // interpolate to the fitted dimensions instead of applying both layouts
      // before the first paint.
      const animationFrame = requestAnimationFrame(() => {
        animationFrames.delete(animationFrame);
        boardDataDispatch({
          type: "UPDATE_GROUP_SIZE",
          payload: { groupId, x: 0, y: 0, width, height },
        });
      });
      animationFrames.add(animationFrame);
    };

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      fitIntroduceGroup(Math.round(entry.contentRect.width), Math.round(entry.contentRect.height));
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      animationFrames.forEach(cancelAnimationFrame);
      cleanupTimers.forEach(window.clearTimeout);
    };
  }, [autoFitIntroduce, boardDataDispatch]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !("ResizeObserver" in window)) return;

    let previousContainerSize: { width: number; height: number } | null = null;
    let correctionTimer: number | null = null;
    const fullScreenGroupIds = new Set<string>();

    const hasActiveInteraction = () =>
      !!document.querySelector(
        '[data-tutorial-active], [data-intro-split-active], [data-tab-is-dragging="true"], [data-resize-handler-is-dragging="true"], [data-group-header-is-dragging="true"]'
      );

    const scheduleCorrection = (width: number, height: number) => {
      if (correctionTimer !== null) window.clearTimeout(correctionTimer);

      correctionTimer = window.setTimeout(() => {
        if (hasActiveInteraction()) {
          scheduleCorrection(width, height);
          return;
        }

        container.querySelectorAll<HTMLElement>("[data-group]").forEach((groupElement) => {
          boardDataDispatch({
            type: "CLAMP_GROUP_TO_CONTAINER",
            payload: {
              groupId: groupElement.id,
              containerWidth: width,
              containerHeight: height,
              isFullScreen: fullScreenGroupIds.has(groupElement.id),
            },
          });
        });

        fullScreenGroupIds.clear();
        correctionTimer = null;
      }, 140);
    };

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;

      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width <= 0 || height <= 0) return;

      if (previousContainerSize) {
        container.querySelectorAll<HTMLElement>("[data-group]").forEach((groupElement) => {
          const wasFullScreen =
            groupElement.offsetLeft === 0 &&
            groupElement.offsetTop === 0 &&
            groupElement.offsetWidth === previousContainerSize?.width &&
            groupElement.offsetHeight === previousContainerSize?.height;
          if (wasFullScreen) fullScreenGroupIds.add(groupElement.id);
        });
      }

      previousContainerSize = { width, height };
      scheduleCorrection(width, height);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (correctionTimer !== null) window.clearTimeout(correctionTimer);
    };
  }, [boardDataDispatch]);

  const handleMouseMoveContainer = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const { offsetTop: containerTop, offsetLeft: containerLeft, offsetHeight: containerHeight, offsetWidth: containerWidth } = containerRef.current;

    // Resize
    const resizeHandlerElement = document.querySelector("[data-resize-handler-is-dragging=true]");
    if (resizeHandlerElement) {
      const dataPos = resizeHandlerElement.getAttribute("data-position");
      const dataDir = resizeHandlerElement.getAttribute("data-direction");
      const dataGroupId = resizeHandlerElement.getAttribute("data-group-id");
      if (dataPos && dataDir && dataGroupId) {
        const pos = JSON.parse(dataPos) as IPosition;
        const dir = RESIZE_DIRECTIONS[dataDir as keyof typeof RESIZE_DIRECTIONS];

        const groupElement = document.getElementById(dataGroupId);
        if (groupElement) {
          groupElement.style.transition = "";

          const dx = e.clientX - pos.x;
          const dy = e.clientY - pos.y;

          const { offsetTop: groupTop, offsetLeft: groupLeft, offsetHeight: groupHeight, offsetWidth: groupWidth } = groupElement;
          const { minTop, minLeft } = getGroupElementBoundaryPositions(containerRef as React.MutableRefObject<HTMLDivElement>, groupElement);

          const handleResizeTopDirection = () => {
            const result = computeResizeStartEdge({
              edge: groupTop,
              size: groupHeight,
              delta: dy,
              minSize: GROUP_MINIMUM_SIZE.HEIGHT,
              minBound: minTop,
              containerOffset: containerTop,
              pointerCoord: e.clientY,
            });
            groupElement.style.top = `${result.edge}px`;
            groupElement.style.height = `${result.size}px`;
            pos.y = result.pos;
          };

          const handleResizeBottomDirection = () => {
            const result = computeResizeEndEdge({
              edge: groupTop,
              size: groupHeight,
              delta: dy,
              minSize: GROUP_MINIMUM_SIZE.HEIGHT,
              containerSize: containerHeight,
              containerOffset: containerTop,
              pointerCoord: e.clientY,
            });
            groupElement.style.height = `${result.size}px`;
            pos.y = result.pos;
          };

          const handleResizeLeftDirection = () => {
            const result = computeResizeStartEdge({
              edge: groupLeft,
              size: groupWidth,
              delta: dx,
              minSize: GROUP_MINIMUM_SIZE.WIDTH,
              minBound: minLeft,
              containerOffset: containerLeft,
              pointerCoord: e.clientX,
            });
            groupElement.style.left = `${result.edge}px`;
            groupElement.style.width = `${result.size}px`;
            pos.x = result.pos;
          };

          const handleResizeRightDirection = () => {
            const result = computeResizeEndEdge({
              edge: groupLeft,
              size: groupWidth,
              delta: dx,
              minSize: GROUP_MINIMUM_SIZE.WIDTH,
              containerSize: containerWidth,
              containerOffset: containerLeft,
              pointerCoord: e.clientX,
            });
            groupElement.style.width = `${result.size}px`;
            pos.x = result.pos;
          };

          if (dir === RESIZE_DIRECTIONS.TOP) {
            handleResizeTopDirection();
          } else if (dir === RESIZE_DIRECTIONS.BOTTOM) {
            handleResizeBottomDirection();
          } else if (dir === RESIZE_DIRECTIONS.LEFT) {
            handleResizeLeftDirection();
          } else if (dir === RESIZE_DIRECTIONS.RIGHT) {
            handleResizeRightDirection();
          } else if (dir === RESIZE_DIRECTIONS.TOPLEFT) {
            handleResizeTopDirection();
            handleResizeLeftDirection();
          } else if (dir === RESIZE_DIRECTIONS.TOPRIGHT) {
            handleResizeTopDirection();
            handleResizeRightDirection();
          } else if (dir === RESIZE_DIRECTIONS.BOTTOMLEFT) {
            handleResizeBottomDirection();
            handleResizeLeftDirection();
          } else {
            handleResizeBottomDirection();
            handleResizeRightDirection();
          }

          resizeHandlerElement.setAttribute("data-position", JSON.stringify(pos));
        }
      }
      return;
    }

    // Move Tab
    const currTabElement = document.querySelector("[data-tab-is-dragging=true]") as HTMLElement;
    if (currTabElement) {
      const pos = JSON.parse(currTabElement.getAttribute("data-position") as string) as IPosition;
      const currGroupId = currTabElement.getAttribute("data-group-id") as string;

      const currGroupElement = document.getElementById(currGroupId);
      if (!currGroupElement) return;

      const dx = e.clientX - pos.x;
      const dy = e.clientY - pos.y;
      pos.x = e.clientX;
      pos.y = e.clientY;
      currTabElement.setAttribute("data-position", JSON.stringify(pos));

      currTabElement.style.top = `${currTabElement.offsetTop + dy}px`;
      currTabElement.style.left = `${currTabElement.offsetLeft + dx}px`;
      syncTabDragPreview(currTabElement);

      const tabMoveStatus = getTabMoveStatus(currTabElement);
      currTabElement.setAttribute("data-tab-move-status", tabMoveStatus);

      if (tabMoveStatus === TAB_MOVE_STATUS.DIVIDED) {
        boardLayoutDispatch({
          type: "UPDATE_TAB_INDICATOR",
          payload: {
            groupId: "",
            tabIdx: 0,
          },
        });

        const { minTop, maxTop, minLeft, maxLeft } = getGroupElementBoundaryPositions(containerRef as React.MutableRefObject<HTMLDivElement>, currGroupElement);
        const { offsetTop: containerTop, offsetWidth: containerWidth, offsetHeight: containerHeight } = containerRef.current;

        const edgeIndicator = getContainerEdgeIndicator(e, { top: containerTop, left: containerLeft, width: containerWidth, height: containerHeight }, minLeft);
        if (edgeIndicator) {
          boardLayoutDispatch({ type: "UPDATE_GROUP_INDICATOR", payload: edgeIndicator });
        } else {
          let dx = e.clientX - containerLeft;
          let dy = e.clientY - containerTop;
          if (dx > maxLeft) dx = maxLeft;
          if (dx < minLeft) dx = minLeft;
          if (dy > maxTop) dy = maxTop;
          if (dy < minTop) dy = minTop;
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: dx,
                y: dy,
              },
              size: { width: currGroupElement.offsetWidth, height: currGroupElement.offsetHeight },
            },
          });
        }

        const combineGroupId = currTabElement.getAttribute("data-tab-combine-group-id") as string;
        const combineGroupElement = document.getElementById(combineGroupId);
        if (combineGroupId.length > 0 && combineGroupElement) {
          handleTabLeaveGroup(combineGroupElement, currTabElement);
          currTabElement.setAttribute("data-tab-combine-group-id", "");
          currTabElement.setAttribute("data-tab-prev-combine-group-id", "");
          currTabElement.setAttribute("data-tab-is-combine", "false");
          const isCurrTabDivided = JSON.parse(currTabElement.getAttribute("data-tab-is-divided") as string) as boolean;
          if (!isCurrTabDivided) {
            currTabElement.setAttribute("data-tab-is-divided", "true");
          }
        }

        const isCurrTabDivided = JSON.parse(currTabElement.getAttribute("data-tab-is-divided") as string) as boolean;
        if (!isCurrTabDivided) {
          handleTabLeaveGroup(currGroupElement, currTabElement);
          currTabElement.setAttribute("data-tab-is-divided", "true");
        }
      } else if (tabMoveStatus === TAB_MOVE_STATUS.COMBINE) {
        boardLayoutDispatch({
          type: "UPDATE_GROUP_INDICATOR",
          payload: null,
        });

        const prevCombineGroupId = currTabElement.getAttribute("data-tab-prev-combine-group-id") as string;
        const combineGroupId = currTabElement.getAttribute("data-tab-combine-group-id") as string;

        if (prevCombineGroupId !== combineGroupId) {
          if (prevCombineGroupId.length > 0) {
            const prevCombineGroupElement = document.getElementById(prevCombineGroupId);
            if (prevCombineGroupElement) {
              handleTabLeaveGroup(prevCombineGroupElement, currTabElement);
            }
          } else {
            currTabElement.setAttribute("data-tab-is-combine", "true");

            const isCurrTabDivided = JSON.parse(currTabElement.getAttribute("data-tab-is-divided") as string) as boolean;
            if (!isCurrTabDivided) {
              handleTabLeaveGroup(currGroupElement, currTabElement);
            } else {
              currTabElement.setAttribute("data-tab-is-divided", "false");
            }
          }

          const combineGroupElement = document.getElementById(combineGroupId);
          if (combineGroupElement) {
            handleTabJoinGroup(combineGroupElement, currTabElement);
          }

          currTabElement.setAttribute("data-tab-prev-combine-group-id", combineGroupId);
          setGroupElementForeground(currGroupId);

          const currTabIdx = currTabElement.getAttribute("data-tab-idx") as string;
          boardLayoutDispatch({
            type: "UPDATE_TAB_INDICATOR",
            payload: {
              groupId: combineGroupId,
              tabIdx: Number(currTabIdx),
            },
          });
        } else {
          const currTabIdx = JSON.parse(currTabElement.getAttribute("data-tab-idx") as string) as number;
          const combineGroupId = currTabElement.getAttribute("data-tab-combine-group-id") as string;

          const combineGroupElement = document.getElementById(combineGroupId);
          if (!combineGroupElement) return;

          let currTabNewIdx = Math.floor(
            (currTabElement.getBoundingClientRect().left - combineGroupElement.getBoundingClientRect().left + currTabElement.offsetWidth / 2) / currTabElement.offsetWidth
          );
          const combineGroupTabCnts = boardDataContextRef.current.group[combineGroupId].tabIds.length;
          if (currTabNewIdx >= combineGroupTabCnts) currTabNewIdx = combineGroupTabCnts;
          if (currTabNewIdx <= 0) currTabNewIdx = 0;
          if (currTabNewIdx === currTabIdx) return;

          shiftSiblingTabs(combineGroupElement, currTabElement, currTabIdx, currTabNewIdx);

          currTabElement.setAttribute("data-tab-idx", JSON.stringify(currTabNewIdx));
          boardLayoutDispatch({
            type: "UPDATE_TAB_INDICATOR",
            payload: {
              groupId: combineGroupId,
              tabIdx: Number(currTabNewIdx),
            },
          });
        }
      } else {
        boardLayoutDispatch({
          type: "UPDATE_GROUP_INDICATOR",
          payload: null,
        });

        setGroupElementForeground(currGroupId);

        const isCurrTabCombine = JSON.parse(currTabElement.getAttribute("data-tab-is-combine") as string) as boolean;
        const isCurrTabDivided = JSON.parse(currTabElement.getAttribute("data-tab-is-divided") as string) as boolean;

        if (isCurrTabCombine || isCurrTabDivided) {
          currTabElement.setAttribute("data-tab-is-combine", "false");
          currTabElement.setAttribute("data-tab-is-divided", "false");

          if (isCurrTabCombine) {
            const combineGroupId = currTabElement.getAttribute("data-tab-combine-group-id") as string;
            const combineGroupElement = document.getElementById(combineGroupId);
            if (combineGroupElement) {
              handleTabLeaveGroup(combineGroupElement, currTabElement);
            }
            currTabElement.setAttribute("data-tab-combine-group-id", "");
            currTabElement.setAttribute("data-tab-prev-combine-group-id", "");
          }

          handleTabJoinGroup(currGroupElement, currTabElement);

          const currTabIdx = currTabElement.getAttribute("data-tab-idx") as string;
          boardLayoutDispatch({
            type: "UPDATE_TAB_INDICATOR",
            payload: {
              groupId: currGroupId,
              tabIdx: Number(currTabIdx),
            },
          });
        } else {
          const currTabIdx = JSON.parse(currTabElement.getAttribute("data-tab-idx") as string) as number;

          let currTabNewIdx = Math.floor((currTabElement.offsetLeft + currTabElement.offsetWidth / 2) / currTabElement.offsetWidth);
          const currGroupTabCnts = boardDataContextRef.current.group[currGroupId].tabIds.length;
          if (currTabNewIdx >= currGroupTabCnts) currTabNewIdx = currGroupTabCnts - 1;
          if (currTabNewIdx <= 0) currTabNewIdx = 0;
          if (currTabNewIdx === currTabIdx) return;

          shiftSiblingTabs(currGroupElement, currTabElement, currTabIdx, currTabNewIdx);

          currTabElement.setAttribute("data-tab-idx", JSON.stringify(currTabNewIdx));
          boardLayoutDispatch({
            type: "UPDATE_TAB_INDICATOR",
            payload: {
              groupId: currGroupId,
              tabIdx: Number(currTabNewIdx),
            },
          });
        }
      }

      return;
    }

    // Move Group
    const groupHeaderElement = document.querySelector("[data-group-header-is-dragging=true]");
    const groupElement = groupHeaderElement?.closest<HTMLElement>("[data-group]");
    if (groupElement && groupHeaderElement) {
      groupElement.style.transition = "";

      const dataPos = groupElement.getAttribute("data-position");
      const dataMouseDownPos = groupHeaderElement.getAttribute("data-mouse-down-position");
      if (dataPos && dataMouseDownPos) {
        const pos = JSON.parse(dataPos) as IPosition;
        const mouseDownPos = JSON.parse(dataMouseDownPos) as IPosition;

        const dx = e.clientX - containerLeft - pos.x;
        const dy = e.clientY - containerTop - pos.y;

        let dTop = groupElement.offsetTop + dy;
        let dLeft = groupElement.offsetLeft + dx;

        const { minTop, maxTop, minLeft, maxLeft } = getGroupElementBoundaryPositions(containerRef as React.MutableRefObject<HTMLDivElement>, groupElement);
        if (dTop <= minTop) dTop = minTop;
        if (dTop >= maxTop) dTop = maxTop;
        if (dLeft <= minLeft) dLeft = minLeft;
        if (dLeft >= maxLeft) dLeft = maxLeft;

        groupElement.style.top = `${dTop}px`;
        groupElement.style.left = `${dLeft}px`;

        pos.x = dLeft + mouseDownPos.x;
        pos.y = dTop + mouseDownPos.y;
        groupElement.setAttribute("data-position", JSON.stringify(pos));

        // Group Indicate
        const edgeIndicator = getContainerEdgeIndicator(e, { top: containerTop, left: containerLeft, width: containerWidth, height: containerHeight }, minLeft);
        boardLayoutDispatch({ type: "UPDATE_GROUP_INDICATOR", payload: edgeIndicator });
      }
    }
  };

  const handleMouseUpContainer = (_e: MouseEvent) => {
    // Every interaction ends with a clean visual state. This runs before the
    // early-returning resize/tab/group branches so a preview can never leak into
    // the next tutorial step (or the next manual interaction).
    boardLayoutDispatch({ type: "RESET_INDICATORS" });

    // Resize
    const resizeHandlerElement = document.querySelector("[data-resize-handler-is-dragging=true]");
    if (resizeHandlerElement) {
      resizeHandlerElement.setAttribute("data-resize-handler-is-dragging", "false");

      const dataGroupId = resizeHandlerElement.getAttribute("data-group-id") as string;
      const groupElement = document.getElementById(dataGroupId);

      if (groupElement) {
        const { offsetTop, offsetLeft, offsetWidth, offsetHeight } = groupElement;
        boardDataDispatch({
          type: "UPDATE_GROUP_SIZE",
          payload: {
            groupId: dataGroupId,
            x: offsetLeft,
            y: offsetTop,
            width: offsetWidth,
            height: offsetHeight,
          },
        });
      }
      return;
    }

    // Move Tab
    const currTabElement = document.querySelector("[data-tab-is-dragging=true]");
    if (currTabElement instanceof HTMLElement) {
      const currGroupHeaderElement = currTabElement.parentElement as HTMLElement;
      const currGroupId = currGroupHeaderElement.id;

      currTabElement.setAttribute("data-tab-is-dragging", "false");

      const currGroupElement = document.getElementById(currGroupId) as HTMLElement;
      const groupPageId = currGroupElement.getAttribute("data-page-id") as string;

      const dataTabMoveStatus = currTabElement.getAttribute("data-tab-move-status") as string;
      if (dataTabMoveStatus === TAB_MOVE_STATUS.DEFAULT) {
        const groupTabsNewIdList = getGroupTabsNewIdList(currGroupHeaderElement, currTabElement);

        boardDataDispatch({
          type: "UPDATE_GROUP_TABS_ID_LIST",
          payload: {
            groupId: currGroupId,
            tabIds: groupTabsNewIdList,
          },
        });

        resetGroupTabsTranslate(currGroupHeaderElement, currTabElement);
      } else if (dataTabMoveStatus === TAB_MOVE_STATUS.COMBINE) {
        const combineGroupId = currTabElement.getAttribute("data-tab-combine-group-id") as string;
        let combineGroupHeaderElement: HTMLElement | null = null;
        document.querySelectorAll("[data-group-header]").forEach((groupHeaderElement) => {
          if (groupHeaderElement.id === combineGroupId) {
            combineGroupHeaderElement = groupHeaderElement as HTMLElement;
            return;
          }
        });

        if (combineGroupHeaderElement) {
          const groupTabsNewIdList = getGroupTabsNewIdList(combineGroupHeaderElement, currTabElement);
          boardDataDispatch({
            type: "COMBINE_GROUP",
            payload: {
              pageId: groupPageId,
              currGroupId,
              combGroupId: combineGroupId,
              currTabId: currTabElement.id,
              combTabIds: groupTabsNewIdList,
            },
          });

          resetGroupTabsTranslate(combineGroupHeaderElement, currTabElement);
          resetGroupTabsTranslate(currGroupHeaderElement, currTabElement);
        }

        currTabElement.setAttribute("data-tab-combine-group-id", "");
        currTabElement.setAttribute("data-tab-prev-combine-group-id", "");
      } else {
        if (groupIndicateRef.current) {
          resetGroupTabsTranslate(currGroupHeaderElement, currTabElement);

          const newGroupId = uuidv4();
          const targetIndicator = groupIndicateRef.current;
          const sourceBounds = {
            x: currGroupElement.offsetLeft,
            y: currGroupElement.offsetTop,
            width: currGroupElement.offsetWidth,
            height: currGroupElement.offsetHeight,
          };
          boardDataDispatch({
            type: "DIVIDE_GROUP",
            payload: {
              pageId: groupPageId,
              groupId: currGroupId,
              tabId: currTabElement.id,
              position: targetIndicator.position,
              size: targetIndicator.size,
              newGroupId,
            },
          });

          // The divided group is mounted at its final half-panel bounds. Rewind it
          // to the source bounds before the next paint, then animate the resize to
          // the edge indicator just like a group snap.
          requestAnimationFrame(() => {
            const newGroupElement = document.getElementById(newGroupId);
            if (!newGroupElement) return;

            setGroupElementForeground(newGroupId);
            newGroupElement.style.setProperty("transition", "none", "important");
            newGroupElement.style.left = `${sourceBounds.x}px`;
            newGroupElement.style.top = `${sourceBounds.y}px`;
            newGroupElement.style.width = `${sourceBounds.width}px`;
            newGroupElement.style.height = `${sourceBounds.height}px`;

            requestAnimationFrame(() => {
              const clearSnapTransition = (event?: TransitionEvent) => {
                if (event && event.target !== newGroupElement) return;
                newGroupElement.style.transition = "";
                newGroupElement.removeEventListener("transitionend", clearSnapTransition);
              };

              newGroupElement.addEventListener("transitionend", clearSnapTransition);
              newGroupElement.style.setProperty("transition", GROUP_RESIZE_SNAP_TRANSITION, "important");
              newGroupElement.style.left = `${targetIndicator.position.x}px`;
              newGroupElement.style.top = `${targetIndicator.position.y}px`;
              newGroupElement.style.width = `${targetIndicator.size.width}px`;
              newGroupElement.style.height = `${targetIndicator.size.height}px`;
              window.setTimeout(clearSnapTransition, GROUP_RESIZE_SNAP_DURATION_MS + 100);
            });
          });
        }

        boardLayoutDispatch({
          type: "UPDATE_GROUP_INDICATOR",
          payload: null,
        });
      }

      currTabElement.setAttribute("data-tab-move-status", TAB_MOVE_STATUS.DEFAULT);
      currTabElement.style.zIndex = CUSTOM_ZINDEX.DEFAULT;
      document.querySelector("[data-tab-drag-preview]")?.remove();
      return;
    }

    // Move Group
    const groupHeaderElement = document.querySelector("[data-group-header-is-dragging=true]");
    const groupElement = groupHeaderElement?.closest<HTMLElement>("[data-group]");
    const dataGroupId = groupHeaderElement?.getAttribute("data-group-id");
    if (groupElement && groupHeaderElement && dataGroupId) {
      groupHeaderElement.setAttribute("data-group-header-is-dragging", "false");

      if (groupIndicateRef.current) {
        const { position, size } = groupIndicateRef.current;

        const clearSnapTransition = (event: TransitionEvent) => {
          if (event.target !== groupElement) return;
          groupElement.style.transition = "";
          groupElement.removeEventListener("transitionend", clearSnapTransition);
        };
        groupElement.addEventListener("transitionend", clearSnapTransition);
        // tailwind.config.ts sets `important: true`, so Group's static `transition-group` utility
        // emits an `!important` transition-property rule that a plain inline assignment can't beat —
        // setProperty(..., "important") is required to actually override it here.
        groupElement.style.setProperty("transition", GROUP_RESIZE_SNAP_TRANSITION, "important");

        groupElement.style.left = `${position.x}px`;
        groupElement.style.top = `${position.y}px`;
        boardDataDispatch({
          type: "UPDATE_GROUP_SIZE",
          payload: {
            groupId: dataGroupId,
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
          },
        });
        boardLayoutDispatch({
          type: "UPDATE_GROUP_INDICATOR",
          payload: null,
        });
      } else {
        boardDataDispatch({
          type: "UPDATE_GROUP_POSITION",
          payload: {
            groupId: dataGroupId,
            x: groupElement.offsetLeft,
            y: groupElement.offsetTop,
          },
        });
      }
      return;
    }
  };

  useEffect(() => {
    let activeTouchPointerId: number | null = null;

    const dispatchTouchAsMouse = (type: "mousedown" | "mousemove" | "mouseup", event: PointerEvent, target: EventTarget = document) => {
      target.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: event.clientX,
          clientY: event.clientY,
          button: 0,
        })
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || !(event.target instanceof Element)) return;
      if (event.target.closest("button, a, input, select, textarea")) return;

      const interactionTarget = event.target.closest<HTMLElement>("[data-tab-id], [data-group-header], [data-resize-handler-is-dragging]");
      if (!interactionTarget) return;

      activeTouchPointerId = event.pointerId;
      event.preventDefault();
      dispatchTouchAsMouse("mousedown", event, event.target);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activeTouchPointerId) return;
      event.preventDefault();
      dispatchTouchAsMouse("mousemove", event);
    };

    const finishTouchPointer = (event: PointerEvent) => {
      if (event.pointerId !== activeTouchPointerId) return;
      event.preventDefault();
      dispatchTouchAsMouse("mouseup", event);
      activeTouchPointerId = null;
    };

    document.addEventListener("mousemove", handleMouseMoveContainer);
    document.addEventListener("mouseup", handleMouseUpContainer);
    document.addEventListener("pointerdown", handlePointerDown, { passive: false });
    document.addEventListener("pointermove", handlePointerMove, { passive: false });
    document.addEventListener("pointerup", finishTouchPointer, { passive: false });
    document.addEventListener("pointercancel", finishTouchPointer, { passive: false });

    return () => {
      document.removeEventListener("mousemove", handleMouseMoveContainer);
      document.removeEventListener("mouseup", handleMouseUpContainer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", finishTouchPointer);
      document.removeEventListener("pointercancel", finishTouchPointer);
    };
  }, []);

  return (
    <div id="container" ref={containerRef} className={cn("relative h-full min-h-0 w-full min-w-0", className)} data-container>
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Group Indicate
 * ----------------------------------------------------------------------------------------------- */

interface IGroupIndicateProps extends React.ComponentPropsWithoutRef<"div"> {}

const GroupIndicate = React.forwardRef<React.ElementRef<"div">, IGroupIndicateProps>(({ children, className, ...props }, forwardedRef) => {
  const { boardLayoutState } = useBoardLayoutContext();
  const groupIndicateStatus = boardLayoutState.groupIndicate;
  const { position, size } = groupIndicateStatus || {};
  const [indicatorZIndex, setIndicatorZIndex] = React.useState(Number(CUSTOM_ZINDEX.FOREGROUND) + 1);

  useLayoutEffect(() => {
    if (!groupIndicateStatus) return;

    const maxGroupZIndex = Array.from(document.querySelectorAll<HTMLElement>("[data-group]")).reduce((max, groupElement) => {
      const zIndex = Number.parseInt(groupElement.style.zIndex, 10);
      return Number.isFinite(zIndex) ? Math.max(max, zIndex) : max;
    }, Number(CUSTOM_ZINDEX.FOREGROUND));

    setIndicatorZIndex(maxGroupZIndex + 1);
  }, [groupIndicateStatus]);

  return (
    <div
      ref={forwardedRef}
      className={cn("pointer-events-none absolute", className, !groupIndicateStatus && "hidden")}
      style={{ top: position?.y, left: position?.x, width: size?.width, height: size?.height, zIndex: indicatorZIndex }}
      {...props}
    >
      {children}
    </div>
  );
});

GroupIndicate.displayName = "GroupIndicate";

/* -------------------------------------------------------------------------------------------------
 * Groups
 * ----------------------------------------------------------------------------------------------- */

interface IGroupsProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactElement;
}

const Groups = React.forwardRef<React.ElementRef<"div">, IGroupsProps>(({ children, className, ...props }, forwardedRef) => {
  const { boardDataState } = useBoardDataContext();
  const currentPageId = boardDataState.selectedPageId;
  const groupIds = boardDataState.page[currentPageId]?.groupIds || [];

  return (
    <div ref={forwardedRef} className={className} {...props}>
      {groupIds.map((groupId) => React.cloneElement(children, { key: groupId, groupData: boardDataState.group[groupId] }))}
    </div>
  );
});

Groups.displayName = "Groups";

/* -------------------------------------------------------------------------------------------------
 * Group
 * ----------------------------------------------------------------------------------------------- */

interface IGroupProps extends React.ComponentPropsWithoutRef<"div"> {
  groupData?: IGroup[keyof IGroup];
  mdxSources?: { [key: string]: MDXRemoteSerializeResult };
}

const Group = React.forwardRef<React.ElementRef<"div">, IGroupProps>(({ children, className, groupData, mdxSources, ...props }, forwardedRef) => {
  const { boardDataState } = useBoardDataContext();

  const handlePointerDownCapture = (e: React.PointerEvent) => {
    setGroupElementForeground(e.currentTarget.id);
  };

  if (!groupData) return null;

  return (
    <div
      ref={forwardedRef}
      className={cn("absolute", className)}
      style={{ width: groupData.size.width, height: groupData.size.height, left: groupData.position.x, top: groupData.position.y }}
      onPointerDownCapture={handlePointerDownCapture}
      id={groupData.id}
      data-group
      data-page-id={boardDataState.selectedPageId}
      data-position={JSON.stringify({ x: 0, y: 0 })}
      data-dragged={false}
      data-foreground={false}
      {...props}
    >
      {React.Children.map(children, (child) => (React.isValidElement(child) ? React.cloneElement(child as React.ReactElement, { groupData, mdxSources }) : child))}
      <ResizeHandlers groupId={groupData.id} />
    </div>
  );
});

Group.displayName = "Group";

/* -------------------------------------------------------------------------------------------------
 * GroupHeader
 * ----------------------------------------------------------------------------------------------- */

interface IGroupHeaderProps extends React.ComponentPropsWithoutRef<"div"> {
  groupData?: IGroup[keyof IGroup];
  mdxSources?: MDXRemoteSerializeResult;
}

const GroupHeader = React.forwardRef<React.ElementRef<"div">, IGroupHeaderProps>(({ children, className, groupData, mdxSources, ...props }, forwardedRef) => {
  const { boardDataDispatch } = useBoardDataContext();
  const { boardLayoutConstants } = useBoardLayoutContext();
  const { TAB_SIZES } = boardLayoutConstants;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const setHeaderRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );

  const updateScrollIndicators = React.useCallback(() => {
    const header = scrollRef.current;
    if (!header) return;

    const maxScrollLeft = Math.max(header.scrollWidth - header.clientWidth, 0);
    setCanScrollLeft(header.scrollLeft > 1);
    setCanScrollRight(header.scrollLeft < maxScrollLeft - 1);
  }, []);

  useLayoutEffect(() => {
    const header = scrollRef.current;
    if (!header || !("ResizeObserver" in window)) return;

    const animationFrame = requestAnimationFrame(updateScrollIndicators);
    const observer = new ResizeObserver(updateScrollIndicators);
    observer.observe(header);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [groupData?.tabIds.length, TAB_SIZES.WIDTH, updateScrollIndicators]);

  const scrollToEdge = (edge: "start" | "end") => {
    const header = scrollRef.current;
    if (!header) return;
    header.scrollTo({ left: edge === "start" ? 0 : header.scrollWidth, behavior: "smooth" });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const groupHeaderElement = e.currentTarget;
    groupHeaderElement.setAttribute("data-group-header-is-dragging", "true");

    const containerElement = document.getElementById("container") as HTMLDivElement;
    groupHeaderElement.closest<HTMLElement>("[data-group]")?.setAttribute(
      "data-position",
      JSON.stringify({ x: e.clientX - containerElement.getBoundingClientRect().x, y: e.clientY - containerElement.getBoundingClientRect().y })
    );

    groupHeaderElement.setAttribute(
      "data-mouse-down-position",
      JSON.stringify({ x: e.clientX - groupHeaderElement.getBoundingClientRect().x, y: e.clientY - groupHeaderElement.getBoundingClientRect().y })
    );
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!groupData) return;

    const groupHeaderElement = e.currentTarget;
    const groupElement = groupHeaderElement.closest<HTMLElement>("[data-group]");
    const containerElement = document.querySelector("[data-container]") as HTMLDivElement;

    if (containerElement && groupElement) {
      const isFullScreen = groupElement.offsetWidth === containerElement.offsetWidth && groupElement.offsetHeight === containerElement.offsetHeight;

      const clearFullScreenTransition = (event: TransitionEvent) => {
        if (event.target !== groupElement) return;
        groupElement.style.transition = "";
        groupElement.removeEventListener("transitionend", clearFullScreenTransition);
      };
      groupElement.addEventListener("transitionend", clearFullScreenTransition);
      // See the identical note in handleMouseUpContainer's Move Group snap: `important: true`
      // in tailwind.config.ts means Group's static transition-group utility must be beaten with
      // setProperty(..., "important"), not a plain assignment.
      groupElement.style.setProperty("transition", GROUP_RESIZE_SNAP_TRANSITION, "important");

      boardDataDispatch({
        type: "UPDATE_GROUP_FULL_SCREEN",
        payload: {
          groupId: groupData.id,
          x: 0,
          y: 0,
          width: containerElement.offsetWidth,
          height: containerElement.offsetHeight,
          isFullScreen,
        },
      });
    }
  };

  if (!groupData) return null;

  return (
    <div className={cn("relative min-w-0 w-full", className)} style={{ height: TAB_SIZES.HEIGHT }}>
      <div
        ref={setHeaderRef}
        className="relative h-full min-w-0 w-full touch-none overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onScroll={updateScrollIndicators}
        id={groupData.id}
        data-group-header
        data-group-id={groupData.id}
        data-group-header-is-dragging={false}
        data-mouse-down-position={JSON.stringify({ x: 0, y: 0 })}
        {...props}
      >
        <div aria-hidden className="pointer-events-none h-px" style={{ width: groupData.tabIds.length * TAB_SIZES.WIDTH }} />
        {groupData.tabIds.map((tabId, idx) =>
          React.Children.map(children, (child) =>
            React.isValidElement(child) ? React.cloneElement(child as React.ReactElement, { key: tabId, groupId: groupData.id, tabId, tabIdx: idx, mdxSources, groupData }) : child
          )
        )}
      </div>
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll to first tab"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => scrollToEdge("start")}
          className="absolute inset-y-0 left-0 z-30 flex w-9 items-center justify-start bg-gradient-to-r from-background via-background/95 to-transparent pl-1 text-foreground transition-opacity hover:opacity-80"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll to last tab"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => scrollToEdge("end")}
          className="absolute inset-y-0 right-0 z-30 flex w-9 items-center justify-end bg-gradient-to-l from-background via-background/95 to-transparent pr-1 text-foreground transition-opacity hover:opacity-80"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

GroupHeader.displayName = "GroupHeader";

/* -------------------------------------------------------------------------------------------------
 * TabContent
 * ----------------------------------------------------------------------------------------------- */

interface ITabContentProps extends React.ComponentPropsWithoutRef<"div"> {
  mdxSources?: { [key: string]: any };
  groupData?: IGroup[keyof IGroup];
}

const TabContent = React.forwardRef<React.ElementRef<"div">, ITabContentProps>(({ children, className, groupData, mdxSources }, forwardedRef) => {
  const { boardDataState } = useBoardDataContext();

  if (!groupData) return null;

  const { id, selectedTabId } = groupData;
  const contentFile = boardDataState.tab[selectedTabId].contentFile;
  const mdxContent = mdxSources ? mdxSources[contentFile] : null;

  return (
    <div
      ref={forwardedRef}
      className={cn("overflow-auto", className)}
      style={{ userSelect: "text", WebkitUserSelect: "text" }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {!mdxContent ? <div>{children}</div> : React.cloneElement(children as React.ReactElement, { groupId: id, tabId: selectedTabId, mdxContent, contentFile })}
    </div>
  );
});

TabContent.displayName = "TabContent";

/* -------------------------------------------------------------------------------------------------
 * Tab
 * ----------------------------------------------------------------------------------------------- */

interface ITabProps extends React.ComponentPropsWithoutRef<"div"> {
  groupId?: string;
  tabId?: string;
  tabIdx?: number;
}

const Tab = React.forwardRef<React.ElementRef<"div">, ITabProps>(({ className, groupId, tabId, tabIdx }, forwardedRef) => {
  const { boardDataState, boardDataDispatch } = useBoardDataContext();
  const { boardLayoutConstants } = useBoardLayoutContext();
  const t = useTranslations("Tabs");
  const { TAB_SIZES } = boardLayoutConstants;

  if (!groupId || !tabId || tabIdx === undefined) return null;

  const selectedTabId = boardDataState.group[groupId]?.selectedTabId;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    boardDataDispatch({
      type: "SELECT_TAB",
      payload: {
        groupId,
        tabId,
      },
    });

    const tabElement = e.currentTarget as HTMLElement;
    createTabDragPreview(tabElement);
    tabElement.style.zIndex = CUSTOM_ZINDEX.OVERLAY;
    setGroupElementForeground(groupId);

    tabElement.setAttribute("data-tab-is-dragging", "true");
    tabElement.setAttribute("data-position", JSON.stringify({ x: e.clientX, y: e.clientY }));
  };

  return (
    <div
      ref={forwardedRef}
      className={cn("absolute touch-none", className)}
      style={{ width: TAB_SIZES.WIDTH, height: TAB_SIZES.HEIGHT, left: tabIdx * TAB_SIZES.WIDTH, touchAction: "none" }}
      onMouseDown={handleMouseDown}
      id={tabId}
      data-group-id={groupId}
      data-tab-id={tabId}
      data-tab-idx={tabIdx}
      data-tab-is-dragging={false}
      data-tab-is-divided={false}
      data-tab-is-combine={false}
      data-tab-move-status={TAB_MOVE_STATUS.DEFAULT}
      data-tab-translate-status={TAB_TRANSLATE_STATUS.DEFAULT}
      data-tab-combine-group-id=""
      data-tab-prev-combine-group-id=""
      data-position={JSON.stringify({ x: 0, y: 0 })}
      data-selected={tabId === selectedTabId}
    >
      {t(
        tabMessageKeysById[tabId as keyof typeof tabMessageKeysById] ??
          tabMessageKeys[boardDataState.tab[tabId].contentFile as keyof typeof tabMessageKeys]
      )}
    </div>
  );
});

Tab.displayName = "Tab";

/* -------------------------------------------------------------------------------------------------
 * TabIndicate
 * ----------------------------------------------------------------------------------------------- */

interface ITabIndicateProps extends React.ComponentPropsWithoutRef<"div"> {
  groupData?: IGroup[keyof IGroup];
}

const TabIndicate = React.forwardRef<React.ElementRef<"div">, ITabIndicateProps>(({ className, groupData }, forwardedRef) => {
  const { boardLayoutState, boardLayoutConstants } = useBoardLayoutContext();
  const { TAB_SIZES } = boardLayoutConstants;

  if (!groupData || !boardLayoutState.tabIndicate) return null;

  return (
    <>
      {boardLayoutState.tabIndicate.groupId === groupData.id && (
        <div
          ref={forwardedRef}
          className={cn("absolute inset-y-px z-20", className)}
          style={{ left: boardLayoutState.tabIndicate.tabIdx * TAB_SIZES.WIDTH, width: TAB_SIZES.WIDTH }}
        />
      )}
    </>
  );
});

TabIndicate.displayName = "TabIndicate";

const resizeHandlerVariants = cva("absolute", {
  variants: {
    direction: {
      [RESIZE_DIRECTIONS.TOP]: "top-0 left-[10px] w-[calc(100%-20px)] h-[10px] cursor-ns-resize",
      [RESIZE_DIRECTIONS.BOTTOM]: "bottom-0 left-[10px] w-[calc(100%-20px)] h-[10px] cursor-ns-resize",
      [RESIZE_DIRECTIONS.LEFT]: "left-0 top-[10px] w-[10px] h-[calc(100%-20px)] cursor-ew-resize",
      [RESIZE_DIRECTIONS.RIGHT]: "right-0 top-[10px] w-[10px] h-[calc(100%-20px)] cursor-ew-resize",
      [RESIZE_DIRECTIONS.TOPLEFT]: "top-0 left-0 w-[10px] h-[10px] cursor-nwse-resize",
      [RESIZE_DIRECTIONS.TOPRIGHT]: "top-0 right-0 w-[10px] h-[10px] cursor-nesw-resize",
      [RESIZE_DIRECTIONS.BOTTOMLEFT]: "bottom-0 left-0 w-[10px] h-[10px] cursor-nesw-resize",
      [RESIZE_DIRECTIONS.BOTTOMRIGHT]: "bottom-0 right-0 w-[10px] h-[10px] cursor-nwse-resize",
    },
  },
});

const ResizeHandlers = ({ groupId }: { groupId: string }) => {
  const resizeHandlerElementPosition = useRef({ x: 0, y: 0 }).current;

  const handleMouseDown = (e: React.MouseEvent) => {
    const resizeHandlerElement = e.target as HTMLElement;
    resizeHandlerElement.setAttribute("data-resize-handler-is-dragging", "true");
    resizeHandlerElementPosition.x = e.clientX;
    resizeHandlerElementPosition.y = e.clientY;
    resizeHandlerElement.setAttribute("data-position", JSON.stringify(resizeHandlerElementPosition));
  };

  return (
    <React.Fragment>
      {Object.values(RESIZE_DIRECTIONS)
        .filter((value) => typeof value === "number")
        .map((direction) => (
          <div
            key={direction}
            className={cn("touch-none", resizeHandlerVariants({ direction }))}
            style={{ touchAction: "none" }}
            onMouseDown={handleMouseDown}
            data-group-id={groupId}
            data-direction={RESIZE_DIRECTIONS[direction]}
            data-resize-handler-is-dragging={false}
            data-position={JSON.stringify(resizeHandlerElementPosition)}
          />
        ))}
    </React.Fragment>
  );
};

export { Root, Panel, Nav, NavList, GroupIndicate, Groups, Group, GroupHeader, Tab, TabContent, TabIndicate };
