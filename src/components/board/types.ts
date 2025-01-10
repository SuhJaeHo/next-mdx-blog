export interface IPosition {
  x: number;
  y: number;
}

export interface ISize {
  width: number;
  height: number;
}

export interface IGroupIndicate {
  position: IPosition;
  size: ISize;
}

export interface ITabIndicate {
  groupId: string;
  tabIdx: number;
}

export interface IPage {
  [key: string]: {
    id: string;
    groupIds: string[];
    name: string;
  };
}

export interface IGroup {
  [key: string]: {
    id: string;
    tabIds: string[];
    selectedTabId: string;
    position: IPosition;
    prevPosition: IPosition;
    size: ISize;
    prevSize: ISize;
  };
}

export interface ITab {
  [key: string]: {
    id: string;
    groupId: string;
    name: string;
    contentFile: string;
  };
}
