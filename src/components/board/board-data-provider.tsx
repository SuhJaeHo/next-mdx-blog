import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { IPage, IGroup, ITab, IPosition, ISize } from "./types";

const updateGroup = (state: BoardDataState, groupId: string, changes: Partial<IGroup[string]>): BoardDataState => {
  if (!state.group[groupId]) return state;

  return {
    ...state,
    group: {
      ...state.group,
      [groupId]: { ...state.group[groupId], ...changes },
    },
  };
};

// Removes a tab from its source group (deleting the group if it was the last tab,
// otherwise filtering it out and reselecting the first remaining tab), mutating the
// already-copied `newGroup`/`newPage` maps in place.
const removeTabFromGroup = (newGroup: IGroup, newPage: IPage, pageId: string, groupId: string, tabId: string) => {
  if (newGroup[groupId].tabIds.length === 1) {
    delete newGroup[groupId];

    newPage[pageId] = {
      ...newPage[pageId],
      groupIds: newPage[pageId].groupIds.filter((id) => id !== groupId),
    };
  } else {
    const tabIds = newGroup[groupId].tabIds.filter((id) => id !== tabId);
    newGroup[groupId] = {
      ...newGroup[groupId],
      tabIds,
      selectedTabId: tabIds[0],
    };
  }
};

type BoardDataStateActionType =
  | {
      type: "SELECT_PAGE";
      payload: {
        pageId: string;
      };
    }
  | {
      type: "UPDATE_GROUP_SIZE";
      payload: {
        groupId: string;
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }
  | {
      type: "UPDATE_GROUP_POSITION";
      payload: {
        groupId: string;
        x: number;
        y: number;
      };
    }
  | {
      type: "UPDATE_GROUP_FULL_SCREEN";
      payload: {
        groupId: string;
        x: number;
        y: number;
        width: number;
        height: number;
        isFullScreen: boolean;
      };
    }
  | {
      type: "UPDATE_GROUP_TABS_ID_LIST";
      payload: {
        groupId: string;
        tabIds: string[];
      };
    }
  | {
      type: "DIVIDE_GROUP";
      payload: {
        pageId: string;
        groupId: string;
        tabId: string;
        position: IPosition;
        size: ISize;
        newGroupId?: string;
      };
    }
  | {
      type: "COMBINE_GROUP";
      payload: {
        pageId: string;
        currGroupId: string;
        combGroupId: string;
        currTabId: string;
        combTabIds: string[];
      };
    }
  | {
      type: "SELECT_TAB";
      payload: {
        groupId: string;
        tabId: string;
      };
    };

export type BoardDataState = {
  selectedPageId: string;
  page: IPage;
  group: IGroup;
  tab: ITab;
};

type BoardDataContextType = {
  boardDataState: BoardDataState;
  boardDataDispatch: React.Dispatch<BoardDataStateActionType>;
};

const BoardDataContext = React.createContext<BoardDataContextType>({
  boardDataState: {
    selectedPageId: "",
    page: {},
    group: {},
    tab: {},
  },
  boardDataDispatch: () => {},
});

const boardDataReducer = (state: BoardDataState, action: BoardDataStateActionType) => {
  switch (action.type) {
    case "SELECT_PAGE": {
      return {
        ...state,
        selectedPageId: action.payload.pageId,
      };
    }
    case "UPDATE_GROUP_POSITION": {
      const { groupId, x, y } = action.payload;
      return updateGroup(state, groupId, { position: { x, y } });
    }
    case "UPDATE_GROUP_SIZE": {
      const { groupId, x, y, width, height } = action.payload;
      return updateGroup(state, groupId, { position: { x, y }, size: { width, height } });
    }
    case "UPDATE_GROUP_FULL_SCREEN": {
      const { groupId, x, y, width, height, isFullScreen } = action.payload;

      const currentGroup = state.group[groupId];
      let updatedGroup;

      if (isFullScreen) {
        updatedGroup = {
          ...currentGroup,
          size: currentGroup.prevSize,
          position: currentGroup.prevPosition,
        };
      } else {
        updatedGroup = {
          ...currentGroup,
          prevSize: currentGroup.size,
          size: { width, height },
          prevPosition: currentGroup.position,
          position: { x, y },
        };
      }

      return {
        ...state,
        group: {
          ...state.group,
          [groupId]: updatedGroup,
        },
      };
    }
    case "UPDATE_GROUP_TABS_ID_LIST": {
      const { groupId, tabIds } = action.payload;
      return updateGroup(state, groupId, { tabIds });
    }
    case "DIVIDE_GROUP": {
      const { pageId, groupId, tabId, position, size, newGroupId: providedNewGroupId } = action.payload;
      if (!state.group[groupId]) return state;

      const newGroup = { ...state.group };
      const newPage = { ...state.page };

      removeTabFromGroup(newGroup, newPage, pageId, groupId, tabId);

      const newGroupId = providedNewGroupId ?? uuidv4();
      newGroup[newGroupId] = {
        id: newGroupId,
        tabIds: [tabId],
        selectedTabId: tabId,
        position,
        prevPosition: position,
        size,
        prevSize: size,
      };

      newPage[pageId] = {
        ...newPage[pageId],
        groupIds: [...newPage[pageId].groupIds, newGroupId],
      };

      return {
        ...state,
        group: newGroup,
        page: newPage,
      };
    }
    case "COMBINE_GROUP": {
      const { pageId, currGroupId, combGroupId, currTabId, combTabIds } = action.payload;
      if (!state.group[currGroupId]) return state;

      const newGroup = { ...state.group };
      const newPage = { ...state.page };

      removeTabFromGroup(newGroup, newPage, pageId, currGroupId, currTabId);

      newGroup[combGroupId] = {
        ...newGroup[combGroupId],
        tabIds: combTabIds,
        selectedTabId: currTabId,
      };

      return {
        ...state,
        group: newGroup,
        page: newPage,
      };
    }
    case "SELECT_TAB": {
      const { groupId, tabId } = action.payload;
      return updateGroup(state, groupId, { selectedTabId: tabId });
    }
    default:
      return state;
  }
};

interface IBoardDataProviderProps {
  boardData: BoardDataState;
}

export const BoardDataProvider: React.FC<React.PropsWithChildren<IBoardDataProviderProps>> = ({ children, boardData }) => {
  const [state, dispatch] = React.useReducer(boardDataReducer, boardData);

  return <BoardDataContext.Provider value={{ boardDataState: state, boardDataDispatch: dispatch }}>{children}</BoardDataContext.Provider>;
};

export const useBoardDataContext = () => {
  return React.useContext(BoardDataContext);
};
