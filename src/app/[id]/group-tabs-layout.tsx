"use client";

import Board from "group-tabs-layout";
import { BoardDataState } from "group-tabs-layout/dist/types/Board/BoardDataProvider";
import CustomMDX from "@components/mdx/custom-mdx";
import { MDXRemoteSerializeResult } from "next-mdx-remote";

interface IGrooupTabsLayoutProps {
  data: BoardDataState;
  mdxSources: { [key: string]: MDXRemoteSerializeResult };
}

export default function GroupTabsLayout({ data, mdxSources }: IGrooupTabsLayoutProps) {
  return (
    <Board.Root boardData={data} customConstants={{ TAB_SIZES: { WIDTH: 100, HEIGHT: 50 }, GROUP_MINIMUM_SIZE: { WIDTH: 400, HEIGHT: 300 } }}>
      <Board.Nav className="p-3 flex flex-col gap-[10px] h-full w-[200px] bg-background border-r-2">
        <Board.NavList className="mb-2 text-foreground hover:bg-secondary data-[selected=true]:bg-secondary cursor-pointer text-sm p-1" />
      </Board.Nav>
      <Board.Panel className="bg-background">
        <Board.GroupIndicate className="bg-indicator/30 border-[1px] border-indicator" />
        <Board.Groups>
          <Board.Group mdxSources={mdxSources} className="bg-background border border-border shadow-xl grid grid-rows-[auto_1fr]">
            <Board.GroupHeader className="cursor-pointer border-b border-border">
              <Board.Tab className="flex justify-center items-center cursor-pointer data-[selected=true]:bg-secondary hover:bg-secondary transition-transform duration-300 text-sm" />
              <Board.TabIndicate className="bg-indicator/30 border-[1px] border-indicator" />
            </Board.GroupHeader>
            <Board.TabContent className="bg-background text-foreground">
              <CustomMDX />
            </Board.TabContent>
          </Board.Group>
        </Board.Groups>
      </Board.Panel>
    </Board.Root>
  );
}
