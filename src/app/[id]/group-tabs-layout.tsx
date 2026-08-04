"use client";

import { useState } from "react";
import Board from "@components/board";
import { BoardDataState } from "@components/board/board-data-provider";
import CustomMDX from "@components/mdx/custom-mdx";
import Tutorial from "@components/tutorial/tutorial";
import { MDXRemoteSerializeResult } from "next-mdx-remote";

interface IGrooupTabsLayoutProps {
  data: BoardDataState;
  mdxSources: { [key: string]: MDXRemoteSerializeResult };
}

export default function GroupTabsLayout({ data, mdxSources }: IGrooupTabsLayoutProps) {
  // Bumping this remounts Board.Root, discarding any state the tutorial's real demo
  // interactions mutated and reinitializing fresh from the `data` prop (i.e. data.json).
  const [resetKey, setResetKey] = useState(0);

  return (
    <>
      <Board.Root key={resetKey} boardData={data} customConstants={{ TAB_SIZES: { WIDTH: 100, HEIGHT: 50 }, GROUP_MINIMUM_SIZE: { WIDTH: 400, HEIGHT: 300 } }}>
        <Board.Nav className="p-3 flex flex-col gap-[10px] h-full w-[200px] bg-background border-r-2">
          <Board.NavList className="mb-2 text-foreground hover:bg-secondary data-[selected=true]:bg-secondary cursor-pointer text-sm p-1" />
        </Board.Nav>
        <Board.Panel className="bg-background">
          <Board.GroupIndicate className="bg-indicator/30 border-[1px] border-indicator" />
          <Board.Groups>
            <Board.Group
              mdxSources={mdxSources}
              className="bg-background border border-border/40 shadow-sm transition-group duration-200 grid grid-rows-[auto_1fr] data-[foreground=true]:border-border/70 data-[foreground=true]:shadow-2xl dark:data-[foreground=true]:ring-1 dark:data-[foreground=true]:ring-foreground/20 dark:data-[foreground=true]:shadow-[0_20px_45px_-15px_rgba(255,255,255,0.12)]"
            >
              <Board.GroupHeader className="cursor-pointer border-b border-border/60">
                <Board.Tab className="flex justify-center items-center cursor-pointer text-sm text-muted-foreground border-r border-border/50 last:border-r-0 transition-tab duration-300 hover:bg-secondary/50 hover:text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-foreground data-[selected=true]:font-medium" />
                <Board.TabIndicate className="bg-indicator/30 border-[1px] border-indicator" />
              </Board.GroupHeader>
              <Board.TabContent className="bg-background text-foreground">
                <CustomMDX />
              </Board.TabContent>
            </Board.Group>
          </Board.Groups>
        </Board.Panel>
      </Board.Root>
      <Tutorial onFinish={() => setResetKey((k) => k + 1)} />
    </>
  );
}
