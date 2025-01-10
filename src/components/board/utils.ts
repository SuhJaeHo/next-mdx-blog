import { TAB_MOVE_STATUS, TAB_TRANSLATE_STATUS, CUSTOM_ZINDEX } from "./constants";

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

  const dist = 0;

  // default
  if (
    ((currGroupHeaderLeft >= tabLeft && currGroupHeaderLeft - (tabLeft + tabWidth) <= dist) || (currGroupHeaderLeft <= tabLeft && tabLeft - (currGroupHeaderLeft + currGroupHeaderWidth) <= dist)) &&
    ((currGroupHeaderTop >= tabTop && currGroupHeaderTop - (tabTop + tabHeight) <= dist) || (currGroupHeaderTop <= tabTop && tabTop - (currGroupHeaderTop + currGroupHeaderHeight) <= dist))
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
        ((groupHeaderLeft >= tabLeft && groupHeaderLeft - (tabLeft + tabWidth) <= dist) || (groupHeaderLeft <= tabLeft && tabLeft - (groupHeaderLeft + groupHeaderWidth) <= dist)) &&
        ((groupHeaderTop >= tabTop && groupHeaderTop - (tabTop + tabHeight) <= dist) || (groupHeaderTop <= tabTop && tabTop - (groupHeaderTop + groupHeaderHeight) <= dist))
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

    currTabElement.setAttribute("data-tab-idx", JSON.stringify(currTabNewIdx));
  });
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
  const groupElements = document.querySelectorAll("[data-group]");
  groupElements.forEach((groupElement) => {
    if (groupElement.id === currGroupId) {
      (groupElement as HTMLElement).style.zIndex = CUSTOM_ZINDEX.FOREGROUND;
    } else {
      (groupElement as HTMLElement).style.zIndex = CUSTOM_ZINDEX.DEFAULT;
    }
  });
};

export { getGroupElementBoundaryPositions, getTabMoveStatus, getGroupTabsNewIdList, handleTabLeaveGroup, handleTabJoinGroup, resetGroupTabsTranslate, setGroupElementForeground };
