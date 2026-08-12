import { TAB_MOVE_STATUS, TAB_TRANSLATE_STATUS, CUSTOM_ZINDEX } from "./constants";
import { IGroupIndicate } from "./types";

// Shared by "Move Group" and "Move Tab" (DIVIDED) drag handling: when the dragged
// element is pushed past a container edge, returns the half-size drop-indicator
// payload for that edge, or null if the pointer is still within the container's interior.
const getContainerEdgeIndicator = (
  e: MouseEvent,
  containerBounds: { top: number; left: number; width: number; height: number },
  minLeft: number
): IGroupIndicate | null => {
  const { top: containerTop, left: containerLeft, width: containerWidth, height: containerHeight } = containerBounds;

  if (e.clientY <= containerTop) {
    return { position: { x: minLeft, y: 0 }, size: { width: containerWidth, height: containerHeight / 2 } };
  }
  if (e.clientY >= containerTop + containerHeight) {
    return { position: { x: minLeft, y: containerHeight / 2 }, size: { width: containerWidth, height: containerHeight / 2 } };
  }
  if (e.clientX <= containerLeft) {
    return { position: { x: minLeft, y: 0 }, size: { width: containerWidth / 2, height: containerHeight } };
  }
  if (e.clientX >= containerLeft + containerWidth) {
    return { position: { x: containerWidth / 2, y: 0 }, size: { width: containerWidth / 2, height: containerHeight } };
  }
  return null;
};

const getGroupElementBoundaryPositions = (containerRef: React.MutableRefObject<HTMLDivElement>, groupElement: HTMLElement) => {
  const minTop = 0;
  const maxTop = containerRef.current.offsetHeight - groupElement.offsetHeight;

  const minLeft = 0;
  const maxLeft = containerRef.current.offsetWidth - groupElement.offsetWidth;
  return { minTop, maxTop, minLeft, maxLeft };
};

const getTabMoveStatus = (currTabElement: HTMLElement) => {
  const groupHeaderElement = currTabElement.parentElement as HTMLElement;
  const dataCurrGroupId = currTabElement.getAttribute("data-group-id") as string;

  const { top: tabTop, left: tabLeft, width: tabWidth, height: tabHeight } = currTabElement.getBoundingClientRect();
  const { top: currGroupHeaderTop, left: currGroupHeaderLeft, width: currGroupHeaderWidth, height: currGroupHeaderHeight } = groupHeaderElement.getBoundingClientRect();

  const TAB_OVERLAP_TOLERANCE_PX = 0;

  // default
  if (
    ((currGroupHeaderLeft >= tabLeft && currGroupHeaderLeft - (tabLeft + tabWidth) <= TAB_OVERLAP_TOLERANCE_PX) ||
      (currGroupHeaderLeft <= tabLeft && tabLeft - (currGroupHeaderLeft + currGroupHeaderWidth) <= TAB_OVERLAP_TOLERANCE_PX)) &&
    ((currGroupHeaderTop >= tabTop && currGroupHeaderTop - (tabTop + tabHeight) <= TAB_OVERLAP_TOLERANCE_PX) ||
      (currGroupHeaderTop <= tabTop && tabTop - (currGroupHeaderTop + currGroupHeaderHeight) <= TAB_OVERLAP_TOLERANCE_PX))
  ) {
    return TAB_MOVE_STATUS.DEFAULT;
  }

  // combine
  let combineGroupId = "";

  const groupHeaderElements = document.querySelectorAll("[data-group-header]");
  groupHeaderElements.forEach((groupHeaderElement) => {
    const dataGroupId = groupHeaderElement.getAttribute("data-group-id") as string;
    if (dataCurrGroupId !== dataGroupId) {
      const { top: groupHeaderTop, left: groupHeaderLeft, width: groupHeaderWidth, height: groupHeaderHeight } = groupHeaderElement.getBoundingClientRect();

      if (
        ((groupHeaderLeft >= tabLeft && groupHeaderLeft - (tabLeft + tabWidth) <= TAB_OVERLAP_TOLERANCE_PX) ||
          (groupHeaderLeft <= tabLeft && tabLeft - (groupHeaderLeft + groupHeaderWidth) <= TAB_OVERLAP_TOLERANCE_PX)) &&
        ((groupHeaderTop >= tabTop && groupHeaderTop - (tabTop + tabHeight) <= TAB_OVERLAP_TOLERANCE_PX) ||
          (groupHeaderTop <= tabTop && tabTop - (groupHeaderTop + groupHeaderHeight) <= TAB_OVERLAP_TOLERANCE_PX))
      ) {
        combineGroupId = dataGroupId;
        return;
      }
    }
  });

  if (combineGroupId !== "") {
    currTabElement.setAttribute("data-tab-combine-group-id", combineGroupId);
    return TAB_MOVE_STATUS.COMBINE;
  }

  return TAB_MOVE_STATUS.DIVIDED;
};

const handleTabLeaveGroup = (groupElement: HTMLElement, currTabElement: HTMLElement) => {
  const dataCurrTabIdx = currTabElement.getAttribute("data-tab-idx") as string;

  const tabElements = groupElement.querySelectorAll("[data-tab-id]");
  tabElements.forEach((tabElement) => {
    const dataTabIdx = tabElement.getAttribute("data-tab-idx") as string;
    const dataTabTranslateStatus = tabElement.getAttribute("data-tab-translate-status") as string;

    if (Number(dataTabIdx) > Number(dataCurrTabIdx)) {
      if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.DEFAULT) {
        (tabElement as HTMLElement).style.transform = `translate(${-currTabElement.offsetWidth}px, 0px)`;
        tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.LEFT);
        tabElement.setAttribute("data-tab-idx", JSON.stringify(Number(dataTabIdx) - 1));
      } else if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.RIGHT) {
        (tabElement as HTMLElement).style.transform = "translate(0px, 0px)";
        tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.DEFAULT);
        tabElement.setAttribute("data-tab-idx", JSON.stringify(Number(dataTabIdx) - 1));
      } else {
        //
      }
    }
  });
};

const handleTabJoinGroup = (groupElement: HTMLElement, currTabElement: HTMLElement) => {
  const currTabLeft = currTabElement.getBoundingClientRect().left + currTabElement.getBoundingClientRect().width;

  let currTabNewIdx = 0;
  const groupTabElements = groupElement.querySelectorAll("[data-tab-id]");
  groupTabElements.forEach((tabElement) => {
    if (tabElement.id === currTabElement.id) {
      return;
    }

    const dataTabIdx = tabElement.getAttribute("data-tab-idx") as string;
    const dataTabTranslateStatus = tabElement.getAttribute("data-tab-translate-status") as string;

    const tabLeft = tabElement.getBoundingClientRect().left + tabElement.getBoundingClientRect().width;
    if (tabLeft > currTabLeft) {
      if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.DEFAULT) {
        (tabElement as HTMLElement).style.transform = `translate(${currTabElement.offsetWidth}px, 0px)`;
        tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.RIGHT);
        tabElement.setAttribute("data-tab-idx", JSON.stringify(Number(dataTabIdx) + 1));
      } else if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.RIGHT) {
        //
      } else {
        (tabElement as HTMLElement).style.transform = "translate(0px, 0px)";
        tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.DEFAULT);
        tabElement.setAttribute("data-tab-idx", JSON.stringify(Number(dataTabIdx) + 1));
      }
    } else {
      currTabNewIdx = Number(dataTabIdx) + 1;
    }
  });

  currTabElement.setAttribute("data-tab-idx", JSON.stringify(currTabNewIdx));
};

// Shared by the COMBINE-branch reorder and the same-group reorder branch: shifts the
// sibling tabs between `fromIdx` and `toIdx` out of the way of `currTabElement` as it
// moves from one tab slot to another within `groupElement`.
const shiftSiblingTabs = (groupElement: HTMLElement, currTabElement: HTMLElement, fromIdx: number, toIdx: number) => {
  if (fromIdx > toIdx) {
    // move left way
    for (let i = fromIdx - 1; i >= toIdx; i--) {
      const tabElement = groupElement.querySelector(`[data-tab-idx="${i}"]`);
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
    for (let i = fromIdx + 1; i <= toIdx; i++) {
      const tabElement = groupElement.querySelector(`[data-tab-idx="${i}"]`);
      if (tabElement instanceof HTMLElement) {
        tabElement.setAttribute("data-tab-idx", JSON.stringify(i - 1));
        const dataTabTranslateStatus = tabElement.getAttribute("data-tab-translate-status") as string;
        if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.DEFAULT) {
          tabElement.style.transform = `translate(${-currTabElement.offsetWidth}px, 0px)`;
          tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.LEFT);
        } else if (dataTabTranslateStatus === TAB_TRANSLATE_STATUS.LEFT) {
          //
        } else {
          tabElement.style.transform = "translate(0px, 0px)";
          tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.DEFAULT);
        }
      }
    }
  }
};

const getGroupTabsNewIdList = (groupHeaderElement: HTMLElement, currTabElement: HTMLElement) => {
  const groupTabsNewIdList: string[] = [];

  groupHeaderElement.querySelectorAll("[data-tab-id]").forEach((tabElement) => {
    const tabId = tabElement.id;
    const tabIdx = JSON.parse(tabElement.getAttribute("data-tab-idx") as string) as number;
    groupTabsNewIdList[tabIdx] = tabId;
  });

  const currTabId = currTabElement.id;
  const currTabIdx = JSON.parse(currTabElement.getAttribute("data-tab-idx") as string) as number;
  groupTabsNewIdList[currTabIdx] = currTabId;

  return groupTabsNewIdList;
};

const resetGroupTabsTranslate = (groupHeaderElement: HTMLElement, currTabElement: HTMLElement) => {
  groupHeaderElement.querySelectorAll("[data-tab-id]").forEach((tabElement) => {
    if (tabElement instanceof HTMLElement) {
      const tabIdx = JSON.parse(tabElement.getAttribute("data-tab-idx") as string) as number;
      tabElement.style.left = `${tabIdx * tabElement.offsetWidth}px`;
      tabElement.style.transform = "translate(0px, 0px)";
    }
  });

  const currTabIdx = JSON.parse(currTabElement.getAttribute("data-tab-idx") as string) as number;
  currTabElement.style.top = "0px";
  currTabElement.style.left = `${currTabIdx * currTabElement.offsetWidth}px`;
  currTabElement.style.transform = "translate(0px, 0px)";
  currTabElement.setAttribute("data-position", JSON.stringify({ x: 0, y: 0 }));

  groupHeaderElement.querySelectorAll("[data-tab-id]").forEach((tabElement) => {
    tabElement.setAttribute("data-tab-translate-status", TAB_TRANSLATE_STATUS.DEFAULT);
  });
};

const setGroupElementForeground = (currGroupId: string) => {
  const groupElements = Array.from(document.querySelectorAll<HTMLElement>("[data-group]"));
  const currentGroupElement = groupElements.find((groupElement) => groupElement.id === currGroupId);
  if (!currentGroupElement) return;

  const maxZIndex = groupElements.reduce((max, groupElement) => {
    const zIndex = Number.parseInt(groupElement.style.zIndex, 10);
    return Number.isFinite(zIndex) ? Math.max(max, zIndex) : max;
  }, Number(CUSTOM_ZINDEX.FOREGROUND) - 1);

  const currentZIndex = Number.parseInt(currentGroupElement.style.zIndex, 10);
  const isActuallyForeground =
    currentGroupElement.getAttribute("data-foreground") === "true" &&
    Number.isFinite(currentZIndex) &&
    currentZIndex === maxZIndex;

  if (isActuallyForeground) return;

  groupElements.forEach((groupElement) => {
    const isForeground = groupElement.id === currGroupId;
    if (isForeground) groupElement.style.zIndex = String(maxZIndex + 1);
    // Drives the subtle foreground styling (border/shadow) in group-tabs-layout.tsx via a data-attribute selector,
    // since zIndex itself is only ever set imperatively and isn't otherwise observable from CSS.
    groupElement.setAttribute("data-foreground", String(isForeground));
  });
};

export {
  getGroupElementBoundaryPositions,
  getContainerEdgeIndicator,
  getTabMoveStatus,
  getGroupTabsNewIdList,
  handleTabLeaveGroup,
  handleTabJoinGroup,
  resetGroupTabsTranslate,
  setGroupElementForeground,
  shiftSiblingTabs,
};
