"use client";

import { useEffect, useState } from "react";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import Board from "@components/board";
import type { BoardDataState } from "@components/board/board-data-provider";
import CustomMDX from "@components/mdx/custom-mdx";
import Tutorial, { TUTORIAL_STORAGE_KEY } from "@components/tutorial/tutorial";
import { useLocaleController } from "@app/[locale]/locale-provider";
import type { Locale } from "@/i18n/routing";

interface IGroupTabsLayoutProps {
  data: BoardDataState;
  mdxSourcesByLocale: Record<Locale, Record<string, MDXRemoteSerializeResult>>;
}

export default function GroupTabsLayout({ data, mdxSourcesByLocale }: IGroupTabsLayoutProps) {
  const [resetKey, setResetKey] = useState(0);
  const [isTutorialSeen, setIsTutorialSeen] = useState(false);
  const { locale } = useLocaleController();
  const mdxSources = mdxSourcesByLocale[locale];

  useEffect(() => {
    setIsTutorialSeen(localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true");
  }, []);

  const handleTutorialFinish = () => {
    setIsTutorialSeen(true);
    setResetKey((key) => key + 1);
  };

  return (
    <>
      <Board.Root key={resetKey} boardData={data} customConstants={{ TAB_SIZES: { WIDTH: 100, HEIGHT: 50 }, GROUP_MINIMUM_SIZE: { WIDTH: 400, HEIGHT: 300 } }}>
        <Board.Nav className="p-3 flex flex-col gap-[10px] h-full w-[200px] bg-background border-r">
          <Board.NavList className="mb-2 text-foreground hover:bg-secondary data-[selected=true]:bg-secondary cursor-pointer text-sm p-1" />
        </Board.Nav>
        <Board.Panel autoFitIntroduce={isTutorialSeen} className="bg-background">
          <Board.GroupIndicate className="bg-indicator/30 border-[1px] border-indicator" />
          <Board.Groups>
            <Board.Group
              mdxSources={mdxSources}
              className="bg-background border border-border/55 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.16)] transition-group duration-200 grid grid-rows-[auto_1fr] data-[foreground=true]:border-border/80 data-[foreground=true]:shadow-[0_16px_38px_-18px_rgba(0,0,0,0.34)] dark:border-foreground/15 dark:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.65)] dark:data-[foreground=true]:border-foreground/30 dark:data-[foreground=true]:ring-1 dark:data-[foreground=true]:ring-foreground/[0.06] dark:data-[foreground=true]:shadow-[0_18px_42px_-20px_rgba(0,0,0,0.8)]"
            >
              <Board.GroupHeader className="cursor-pointer border-b border-border/30 dark:border-foreground/10">
                <Board.Tab className="flex justify-center items-center px-3 text-center whitespace-normal cursor-pointer text-sm text-muted-foreground border-r border-border/25 last:border-r-0 transition-tab duration-300 hover:bg-secondary/40 hover:text-foreground data-[selected=true]:bg-secondary/70 data-[selected=true]:text-foreground dark:border-foreground/10" />
                <Board.TabIndicate className="bg-indicator/30 border-[1px] border-indicator" />
              </Board.GroupHeader>
              <Board.TabContent className="bg-background text-foreground">
                <CustomMDX />
              </Board.TabContent>
            </Board.Group>
          </Board.Groups>
        </Board.Panel>
      </Board.Root>
      <Tutorial onFinish={handleTutorialFinish} />
    </>
  );
}
