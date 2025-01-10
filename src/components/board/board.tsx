"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { getGroupElementBoundaryPositions, getGroupTabsNewIdList, getTabMoveStatus, handleTabJoinGroup, handleTabLeaveGroup, resetGroupTabsTranslate, setGroupElementForeground } from "./utils";
import { CUSTOM_ZINDEX, RESIZE_DIRECTIONS, TAB_MOVE_STATUS, TAB_TRANSLATE_STATUS } from "./constants";
import { IGroup, IPosition, IGroupIndicate } from "./types";
import { cn } from "@lib/utils";
import { cva } from "class-variance-authority";
import { usePathname } from "next/navigation";
import { BoardLayoutProvider, BoardLayoutConstants, useBoardLayoutContext } from "./board-layout-provider";
import { BoardDataProvider, BoardDataState, useBoardDataContext } from "./board-data-provider";
import { MDXRemoteSerializeResult } from "next-mdx-remote";

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
  const currentPageId = pathname.replace("/", "");

  const { boradDataState, boardDataDispatch } = useBoardDataContext();

  useEffect(() => {
    boardDataDispatch({ type: "SELECT_PAGE", payload: { pageId: currentPageId } });
  }, [boardDataDispatch, currentPageId]);

  const handleClickNavItem = (pageId: string) => {
    boardDataDispatch({ type: "SELECT_PAGE", payload: { pageId } });
    history.pushState({}, "", `/${boradDataState.page[pageId].id}`);
  };

  return (
    <div>
      {Object.keys(boradDataState.page).map((pageId) => (
        <div className={cn(className)} key={pageId} data-selected={pageId === currentPageId} onClick={() => handleClickNavItem(pageId)}>
          {boradDataState.page[pageId].name}
        </div>
      ))}
    </div>
  );
});

NavList.displayName = "NavList";

interface IPanelProps extends React.HTMLAttributes<"div"> {}

const Panel: React.FC<React.PropsWithChildren<IPanelProps>> = ({ className, children }) => {
  const { boradDataState, boardDataDispatch } = useBoardDataContext();
  const { boardLayoutState, boardLayoutConstants, boardLayoutDispatch } = useBoardLayoutContext();
  const { GROUP_MINIMUM_SIZE } = boardLayoutConstants;

  const groupIndicateStatus = boardLayoutState.groupIndicate;

  const boardDataContextRef = useRef(boradDataState);
  const groupIndicateRef = useRef<null | IGroupIndicate>(null);
  const containerRef = useRef<React.ElementRef<"div"> | null>(null);

  useEffect(() => {
    groupIndicateRef.current = groupIndicateStatus;
  }, [groupIndicateStatus]);

  useEffect(() => {
    boardDataContextRef.current = boradDataState;
  }, [boradDataState]);

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
          const dx = e.clientX - pos.x;
          const dy = e.clientY - pos.y;

          const { offsetTop: groupTop, offsetLeft: groupLeft, offsetHeight: groupHeight, offsetWidth: groupWidth } = groupElement;
          const { minTop, minLeft, maxLeft } = getGroupElementBoundaryPositions(containerRef as React.MutableRefObject<HTMLDivElement>, groupElement);

          const handleResizeTopDirection = () => {
            if (groupHeight - dy < GROUP_MINIMUM_SIZE.HEIGHT) {
              groupElement.style.top = `${groupTop + (groupHeight - GROUP_MINIMUM_SIZE.HEIGHT)}px`;
              groupElement.style.height = `${GROUP_MINIMUM_SIZE.HEIGHT}px`;
              pos.y = containerTop + groupTop + groupHeight - GROUP_MINIMUM_SIZE.HEIGHT;
            } else if (groupTop + dy <= minTop) {
              groupElement.style.top = `${minTop}px`;
              groupElement.style.height = `${groupHeight + groupTop}px`;
              pos.y = containerTop;
            } else {
              groupElement.style.top = `${groupTop + dy}px`;
              groupElement.style.height = `${groupHeight - dy}px`;
              pos.y = e.clientY;
            }
          };

          const handleResizeBottomDirection = () => {
            if (groupHeight + dy < GROUP_MINIMUM_SIZE.HEIGHT) {
              groupElement.style.height = `${GROUP_MINIMUM_SIZE.HEIGHT}px`;
              pos.y = containerTop + groupTop + GROUP_MINIMUM_SIZE.HEIGHT;
            } else if (groupHeight + dy >= containerHeight - groupTop) {
              groupElement.style.height = `${containerHeight - groupTop}px`;
              pos.y = containerTop + containerHeight;
            } else {
              groupElement.style.height = `${groupHeight + dy}px`;
              pos.y = e.clientY;
            }
          };

          const handleResizeLeftDirection = () => {
            if (groupWidth - dx < GROUP_MINIMUM_SIZE.WIDTH) {
              groupElement.style.left = `${groupLeft + (groupWidth - GROUP_MINIMUM_SIZE.WIDTH)}px`;
              groupElement.style.width = `${GROUP_MINIMUM_SIZE.WIDTH}px`;
              pos.x = containerLeft + groupLeft + groupWidth - GROUP_MINIMUM_SIZE.WIDTH;
            } else if (groupLeft + dx <= minLeft) {
              groupElement.style.left = `${minLeft}px`;
              groupElement.style.width = `${groupLeft + groupWidth}px`;
              pos.x = containerLeft;
            } else {
              groupElement.style.left = `${groupLeft + dx}px`;
              groupElement.style.width = `${groupWidth - dx}px`;
              pos.x = e.clientX;
            }
          };

          const handleResizeRightDirection = () => {
            if (groupWidth + dx < GROUP_MINIMUM_SIZE.WIDTH) {
              groupElement.style.width = `${GROUP_MINIMUM_SIZE.WIDTH}px`;
              pos.x = containerLeft + groupLeft + GROUP_MINIMUM_SIZE.WIDTH;
            } else if (groupLeft + dx >= maxLeft) {
              groupElement.style.width = `${containerWidth - groupLeft}px`;
              pos.x = containerLeft + containerWidth;
            } else {
              groupElement.style.width = `${groupWidth + dx}px`;
              pos.x = e.clientX;
            }
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

        if (e.clientY <= containerTop) {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: minLeft,
                y: 0,
              },
              size: { width: containerWidth, height: containerHeight / 2 },
            },
          });
        } else if (e.clientY >= containerTop + containerHeight) {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: minLeft,
                y: containerHeight / 2,
              },
              size: { width: containerWidth, height: containerHeight / 2 },
            },
          });
        } else if (e.clientX <= containerLeft) {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: minLeft,
                y: 0,
              },
              size: { width: containerWidth / 2, height: containerHeight },
            },
          });
        } else if (e.clientX >= containerLeft + containerWidth) {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: containerWidth / 2,
                y: 0,
              },
              size: { width: containerWidth / 2, height: containerHeight },
            },
          });
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
          setGroupElementForeground(combineGroupId);

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

          if (currTabIdx > currTabNewIdx) {
            // move left way
            for (let i = currTabIdx - 1; i >= currTabNewIdx; i--) {
              const tabElement = combineGroupElement.querySelector(`[data-tab-idx="${i}"]`);
              if (tabElement instanceof HTMLElement) {
                tabElement.setAttribute("data-tab-idx", JSON.stringify(i + 1));
                const dataTabTranslateStatus = tabElement.getAttribute("data-tab-translate-status") as string;
                if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.DEFAULT) {
                  tabElement.style.transform = `translate(${currTabElement.offsetWidth}px, 0px)`;
                  tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.RIGHT);
                } else if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.LEFT) {
                  tabElement.style.transform = "translate(0px, 0px)";
                  tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.DEFAULT);
                }
              }
            }
          } else {
            // move right way
            for (let i = currTabIdx + 1; i <= currTabNewIdx; i++) {
              const tabElement = combineGroupElement.querySelector(`[data-tab-idx="${i}"]`);
              if (tabElement instanceof HTMLElement) {
                tabElement.setAttribute("data-tab-idx", JSON.stringify(i - 1));
                const dataTabTranslateStatus = tabElement.getAttribute("data-tab-translate-status") as string;
                if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.DEFAULT) {
                  tabElement.style.transform = `translate(${-currTabElement.offsetWidth}px, 0px)`;
                  tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.LEFT);
                } else if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.LEFT) {
                } else {
                  tabElement.style.transform = "translate(0px, 0px)";
                  tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.DEFAULT);
                }
              }
            }
          }

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

          if (currTabIdx > currTabNewIdx) {
            // move left way
            for (let i = currTabIdx - 1; i >= currTabNewIdx; i--) {
              const tabElement = currGroupElement.querySelector(`[data-tab-idx="${i}"]`);
              if (tabElement instanceof HTMLElement) {
                tabElement.setAttribute("data-tab-idx", JSON.stringify(i + 1));
                const dataTabTranslateStatus = tabElement.getAttribute("data-tab-translate-status") as string;
                if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.DEFAULT) {
                  tabElement.style.transform = `translate(${currTabElement.offsetWidth}px, 0px)`;
                  tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.RIGHT);
                } else if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.LEFT) {
                  tabElement.style.transform = "translate(0px, 0px)";
                  tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.DEFAULT);
                }
              }
            }
          } else {
            // move right way
            for (let i = currTabIdx + 1; i <= currTabNewIdx; i++) {
              const tabElement = currGroupElement.querySelector(`[data-tab-idx="${i}"]`);
              if (tabElement instanceof HTMLElement) {
                tabElement.setAttribute("data-tab-idx", JSON.stringify(i - 1));
                const dataTabTranslateStatus = tabElement.getAttribute("data-tab-translate-status") as string;
                if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.DEFAULT) {
                  tabElement.style.transform = `translate(${-currTabElement.offsetWidth}px, 0px)`;
                  tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.LEFT);
                } else if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.LEFT) {
                } else {
                  tabElement.style.transform = "translate(0px, 0px)";
                  tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.DEFAULT);
                }
              }
            }
          }

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
    const groupElement = groupHeaderElement?.parentElement;
    if (groupElement) {
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
        if (e.clientY <= containerTop) {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: minLeft,
                y: 0,
              },
              size: { width: containerWidth, height: containerHeight / 2 },
            },
          });
        } else if (e.clientY >= containerTop + containerHeight) {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: minLeft,
                y: containerHeight / 2,
              },
              size: { width: containerWidth, height: containerHeight / 2 },
            },
          });
        } else if (e.clientX <= containerLeft) {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: minLeft,
                y: 0,
              },
              size: { width: containerWidth / 2, height: containerHeight },
            },
          });
        } else if (e.clientX >= containerLeft + containerWidth) {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: {
              position: {
                x: containerWidth / 2,
                y: 0,
              },
              size: { width: containerWidth / 2, height: containerHeight },
            },
          });
        } else {
          boardLayoutDispatch({
            type: "UPDATE_GROUP_INDICATOR",
            payload: null,
          });
        }
      }
    }
  };

  const handleMouseUpContainer = (e: MouseEvent) => {
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
    if (boardLayoutDispatch) {
      boardLayoutDispatch({
        type: "UPDATE_TAB_INDICATOR",
        payload: {
          groupId: "",
          tabIdx: 0,
        },
      });
    }

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

          boardDataDispatch({
            type: "DIVIDE_GROUP",
            payload: {
              pageId: groupPageId,
              groupId: currGroupId,
              tabId: currTabElement.id,
              position: groupIndicateRef.current.position,
              size: groupIndicateRef.current.size,
            },
          });
        }

        boardLayoutDispatch({
          type: "UPDATE_GROUP_INDICATOR",
          payload: null,
        });

        const groupElements = document.querySelectorAll("[data-group]");
        groupElements.forEach((groupElement) => {
          (groupElement as HTMLElement).style.zIndex = CUSTOM_ZINDEX.DEFAULT;
        });
      }

      currTabElement.setAttribute("data-tab-move-status", TAB_MOVE_STATUS.DEFAULT);
      currTabElement.style.zIndex = CUSTOM_ZINDEX.DEFAULT;
      return;
    }

    // Move Group
    const groupHeaderElement = document.querySelector("[data-group-header-is-dragging=true]");
    const groupElement = groupHeaderElement?.parentElement;
    const dataGroupId = groupHeaderElement?.getAttribute("data-group-id");
    if (groupElement && dataGroupId) {
      groupHeaderElement.setAttribute("data-group-header-is-dragging", "false");

      if (groupIndicateRef.current) {
        const { position, size } = groupIndicateRef.current;
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
    document.addEventListener("mousemove", handleMouseMoveContainer);
    document.addEventListener("mouseup", handleMouseUpContainer);

    return () => {
      document.removeEventListener("mousedown", handleMouseMoveContainer);
      document.removeEventListener("mouseup", handleMouseUpContainer);
    };
  }, []);

  return (
    <div id="container" ref={containerRef} className={cn("w-[inherit] h-[inherit] relative", className)} data-container>
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

  return (
    <div
      ref={forwardedRef}
      className={cn("absolute z-20", className, !groupIndicateStatus && "hidden")}
      style={{ top: position?.y, left: position?.x, width: size?.width, height: size?.height }}
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
  const pathname = usePathname();
  const currentPageId = pathname.replace("/", "");

  const { boradDataState } = useBoardDataContext();
  const groupIds = boradDataState.page[currentPageId]?.groupIds || [];

  return (
    <div ref={forwardedRef} className={className} {...props}>
      {groupIds.map((groupId) => React.cloneElement(children, { key: groupId, groupData: boradDataState.group[groupId] }))}
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
  const { boradDataState } = useBoardDataContext();

  const handleMouseDown = (e: React.MouseEvent) => {
    setGroupElementForeground(e.currentTarget.id);
  };

  if (!groupData) return null;

  return (
    <div
      ref={forwardedRef}
      className={cn("absolute", className)}
      style={{ width: groupData.size.width, height: groupData.size.height, left: groupData.position.x, top: groupData.position.y }}
      onMouseDown={handleMouseDown}
      id={groupData.id}
      data-group
      data-page-id={boradDataState.selectedPageId}
      data-position={JSON.stringify({ x: 0, y: 0 })}
      data-dragged={false}
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

  const handleMouseDown = (e: React.MouseEvent) => {
    const groupHeaderElement = e.currentTarget;
    groupHeaderElement.setAttribute("data-group-header-is-dragging", "true");

    const containerElement = document.getElementById("container") as HTMLDivElement;
    groupHeaderElement.parentElement?.setAttribute(
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
    const groupElement = groupHeaderElement.parentElement;
    const containerElement = document.querySelector("[data-container]") as HTMLDivElement;

    if (containerElement && groupElement) {
      const isFullScreen = groupElement.offsetWidth === containerElement.offsetWidth && groupElement.offsetHeight === containerElement.offsetHeight;
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
    <div
      ref={forwardedRef}
      className={cn("relative", className)}
      style={{ height: TAB_SIZES.HEIGHT }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      id={groupData.id}
      data-group-header
      data-group-id={groupData.id}
      data-group-header-is-dragging={false}
      data-mouse-down-position={JSON.stringify({ x: 0, y: 0 })}
      {...props}
    >
      {groupData.tabIds.map((tabId, idx) =>
        React.Children.map(children, (child) =>
          React.isValidElement(child) ? React.cloneElement(child as React.ReactElement, { key: tabId, groupId: groupData.id, tabId, tabIdx: idx, mdxSources, groupData }) : child
        )
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
  const { boradDataState } = useBoardDataContext();

  if (!groupData) return null;

  const { id, selectedTabId } = groupData;
  const mdxContent = mdxSources ? mdxSources[boradDataState.tab[selectedTabId].contentFile] : null;

  return (
    <div ref={forwardedRef} className={cn("overflow-auto", className)}>
      {!mdxContent ? <div>{children}</div> : React.cloneElement(children as React.ReactElement, { groupId: id, mdxContent: mdxContent })}
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
  const { boradDataState, boardDataDispatch } = useBoardDataContext();
  const { boardLayoutConstants } = useBoardLayoutContext();
  const { TAB_SIZES } = boardLayoutConstants;

  if (!groupId || !tabId || tabIdx === undefined) return null;

  const selectedTabId = boradDataState.group[groupId]?.selectedTabId;

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
    tabElement.style.zIndex = CUSTOM_ZINDEX.OVERLAY;
    setGroupElementForeground(groupId);

    tabElement.setAttribute("data-tab-is-dragging", "true");
    tabElement.setAttribute("data-position", JSON.stringify({ x: e.clientX, y: e.clientY }));
  };

  return (
    <div
      ref={forwardedRef}
      className={cn("absolute", className)}
      style={{ width: TAB_SIZES.WIDTH, height: TAB_SIZES.HEIGHT, left: tabIdx * TAB_SIZES.WIDTH }}
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
      {boradDataState.tab[tabId].name}
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
        <div ref={forwardedRef} className={cn("absolute z-20 h-[100%]", className)} style={{ left: boardLayoutState.tabIndicate.tabIdx * TAB_SIZES.WIDTH, width: TAB_SIZES.WIDTH }} />
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
  const resizeHandlerElementPosition = useMemo(() => ({ x: 0, y: 0 }), []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const resizeHandlerElement = e.target as HTMLElement;
    console.log("resizeHandlerElement", resizeHandlerElement);
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
            className={cn(resizeHandlerVariants({ direction }))}
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
