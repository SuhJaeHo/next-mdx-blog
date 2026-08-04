import * as React from "react";
import { IGroupIndicate, ITabIndicate, IPosition, ISize } from "./types";

type BoardLayoutStateAction =
  | {
      type: "RESET_INDICATORS";
    }
  | {
      type: "UPDATE_GROUP_INDICATOR";
      payload: {
        position: IPosition;
        size: ISize;
      } | null;
    }
  | {
      type: "UPDATE_TAB_INDICATOR";
      payload: {
        groupId: string;
        tabIdx: number;
      };
    };

type BoardLayoutState = {
  groupIndicate: IGroupIndicate | null;
  tabIndicate: ITabIndicate | null;
};

type BoardLayoutContextType = {
  boardLayoutState: BoardLayoutState;
  boardLayoutConstants: BoardLayoutConstants;
  boardLayoutDispatch: React.Dispatch<BoardLayoutStateAction>;
};

export type BoardLayoutConstants = {
  GROUP_MINIMUM_SIZE: {
    WIDTH: number;
    HEIGHT: number;
  };
  TAB_SIZES: {
    WIDTH: number;
    HEIGHT: number;
  };
};

const initialBoardLayoutState: BoardLayoutState = {
  groupIndicate: null,
  tabIndicate: null,
};

const initialBoardLayoutContext: BoardLayoutContextType = {
  boardLayoutState: initialBoardLayoutState,
  boardLayoutConstants: {
    GROUP_MINIMUM_SIZE: {
      WIDTH: 300,
      HEIGHT: 300,
    },
    TAB_SIZES: {
      WIDTH: 80,
      HEIGHT: 30,
    },
  },
  boardLayoutDispatch: () => {},
};

const BoardLayoutContext = React.createContext<BoardLayoutContextType>(initialBoardLayoutContext);

const boardLayoutStateReducer = (state: BoardLayoutState, action: BoardLayoutStateAction) => {
  switch (action.type) {
    case "UPDATE_GROUP_INDICATOR": {
      if (action.payload) {
        const { position, size } = action.payload;
        // A group drop preview and a tab insertion preview describe mutually
        // exclusive operations, so never allow both to survive the same update.
        return { ...state, groupIndicate: { position, size }, tabIndicate: null };
      }
      return { ...state, groupIndicate: null };
    }
    case "UPDATE_TAB_INDICATOR": {
      const { groupId, tabIdx } = action.payload;
      if (!groupId) return { ...state, tabIndicate: null };
      return { ...state, groupIndicate: null, tabIndicate: { groupId, tabIdx } };
    }
    case "RESET_INDICATORS": {
      return initialBoardLayoutState;
    }
    default:
      return state;
  }
};

interface IBoardLayoutProviderProps {
  customConstants?: BoardLayoutConstants;
}

export const BoardLayoutProvider: React.FC<React.PropsWithChildren<IBoardLayoutProviderProps>> = ({ children, customConstants }) => {
  const [state, dispatch] = React.useReducer(boardLayoutStateReducer, initialBoardLayoutState);

  const boardLayoutConstants = React.useMemo(() => {
    return { ...initialBoardLayoutContext.boardLayoutConstants, ...customConstants };
  }, [customConstants]);

  return <BoardLayoutContext.Provider value={{ boardLayoutState: state, boardLayoutConstants, boardLayoutDispatch: dispatch }}>{children}</BoardLayoutContext.Provider>;
};

export const useBoardLayoutContext = () => {
  return React.useContext(BoardLayoutContext);
};
