"use client";

import { useState } from "react";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import Board from "@components/board";
import type { BoardDataState } from "@components/board/board-data-provider";
import CustomMDX from "@components/mdx/custom-mdx";
import Tutorial from "@components/tutorial/tutorial";

interface IGroupTabsLayoutProps {
  data: BoardDataState;
  mdxSources: Record<string, MDXRemoteSerializeResult>;
}

export default function GroupTabsLayout({ data, mdxSources }: IGroupTabsLayoutProps) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <>
      <Board.Root key={resetKey} boardData={data} customConstants={{ TAB_SIZES: { WIDTH: 100, HEIGHT: 50 }, GROUP_MINIMUM_SIZE: { WIDTH: 400, HEIGHT: 300 } }}>
        <Board.Nav className="p-3 flex flex-col gap-[10px] h-full w-[200px] bg-background border-r">
          <Board.NavList className="mb-2 text-foreground hover:bg-secondary data-[selected=true]:bg-secondary cursor-pointer text-sm p-1" />
        </Board.Nav>
        <Board.Panel className="bg-background">
          <Board.GroupIndicate className="bg-indicator/30 border-[1px] border-indicator" />
          <Board.Groups>
            <Board.Group
              mdxSources={mdxSources}
              className="bg-background border border-border/20 shadow-[0_1px_3px_rgba(0,0,0,0.035)] transition-group duration-200 grid grid-rows-[auto_1fr] data-[foreground=true]:border-border/30 data-[foreground=true]:shadow-[0_14px_35px_-18px_rgba(0,0,0,0.24)] dark:border-foreground/[0.07] dark:data-[foreground=true]:border-foreground/15 dark:data-[foreground=true]:ring-0 dark:data-[foreground=true]:shadow-[0_18px_40px_-20px_rgba(255,255,255,0.06)]"
            >
              <Board.GroupHeader className="cursor-pointer border-b border-border/30 dark:border-foreground/10">
                <Board.Tab className="flex justify-center items-center cursor-pointer text-sm text-muted-foreground border-r border-border/25 last:border-r-0 transition-tab duration-300 hover:bg-secondary/40 hover:text-foreground data-[selected=true]:bg-secondary/70 data-[selected=true]:text-foreground data-[selected=true]:font-medium dark:border-foreground/10" />
                <Board.TabIndicate className="bg-indicator/30 border-[1px] border-indicator" />
              </Board.GroupHeader>
              <Board.TabContent className="bg-background text-foreground">
                <CustomMDX />
              </Board.TabContent>
            </Board.Group>
          </Board.Groups>
        </Board.Panel>
      </Board.Root>
      <Tutorial onFinish={() => setResetKey((key) => key + 1)} />
    </>
  );
}
