"use client";

import { useEffect, useRef, useState } from "react";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import Board from "@components/board";
import { type BoardDataState, useBoardDataContext } from "@components/board/board-data-provider";
import CustomMDX from "@components/mdx/custom-mdx";
import Tutorial, { TUTORIAL_STORAGE_KEY } from "@components/tutorial/tutorial";
import { centerOf, forceMouseUp, simulateDrag, sleep } from "@components/tutorial/simulate";
import { useLocaleController } from "@app/[locale]/locale-provider";
import type { Locale } from "@/i18n/routing";

interface IGroupTabsLayoutProps {
  data: BoardDataState;
  mdxSourcesByLocale: Record<Locale, Record<string, MDXRemoteSerializeResult>>;
}

const INTRO_GROUP_ID = "introduce-profile-group";
const INTRO_TAB_ID = "introduce-cover-letter-tab";
const CAREER_TAB_ID = "introduce-career-tab";

function IntroSplitEntrance() {
  const { boardDataState } = useBoardDataContext();
  const initialPageIdRef = useRef(boardDataState.selectedPageId);
  const startedRef = useRef(false);
  const playedRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (initialPageIdRef.current !== "introduce" || boardDataState.selectedPageId !== "introduce" || startedRef.current || playedRef.current) return;

    const controller = new AbortController();
    startedRef.current = true;
    setIsAnimating(true);

    const run = async () => {
      await sleep(450, controller.signal);
      playedRef.current = true;

      const container = document.querySelector<HTMLElement>("[data-container]");
      const careerTab = document.getElementById(CAREER_TAB_ID);
      const sourceGroup = document.getElementById(INTRO_GROUP_ID);
      if (!container || !careerTab || !sourceGroup) return;

      const containerRect = container.getBoundingClientRect();
      const isCompact = containerRect.width < 920 || containerRect.height < 520;
      if (isCompact) return;

      const careerFrom = centerOf(careerTab);
      await simulateDrag(careerTab, careerFrom, { x: containerRect.right + careerTab.offsetWidth, y: careerFrom.y }, { signal: controller.signal, steps: 38, stepDelayMs: 26 });
      await sleep(360, controller.signal);

      const introTab = document.getElementById(INTRO_TAB_ID);
      if (!introTab) return;

      const introFrom = centerOf(introTab);
      await simulateDrag(introTab, introFrom, { x: containerRect.left - introTab.offsetWidth, y: introFrom.y }, { signal: controller.signal, steps: 38, stepDelayMs: 26 });
    };

    run()
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsAnimating(false);
      });

    return () => {
      controller.abort();
      forceMouseUp();
      startedRef.current = false;
    };
  }, [boardDataState.selectedPageId]);

  if (!isAnimating) return null;
  return <div className="fixed inset-0 z-[70] cursor-wait touch-none" data-intro-split-active aria-hidden />;
}

function TutorialController({ onFinish }: { onFinish: (selectedPageId: string) => void }) {
  const { boardDataState } = useBoardDataContext();

  return <Tutorial onFinish={() => onFinish(boardDataState.selectedPageId)} />;
}

export default function GroupTabsLayout({ data, mdxSourcesByLocale }: IGroupTabsLayoutProps) {
  const [resetKey, setResetKey] = useState(0);
  const [resetPageId, setResetPageId] = useState(data.selectedPageId);
  const [isTutorialSeen, setIsTutorialSeen] = useState(false);
  const { locale } = useLocaleController();
  const mdxSources = mdxSourcesByLocale[locale];

  useEffect(() => {
    setIsTutorialSeen(localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true");
  }, []);

  const handleTutorialFinish = (selectedPageId: string) => {
    setIsTutorialSeen(true);
    setResetPageId(selectedPageId);
    setResetKey((key) => key + 1);
  };

  return (
    <>
      <Board.Root
        key={resetKey}
        boardData={{ ...data, selectedPageId: resetPageId }}
        customConstants={{ TAB_SIZES: { WIDTH: 100, HEIGHT: 50 }, GROUP_MINIMUM_SIZE: { WIDTH: 400, HEIGHT: 300 } }}
      >
        <IntroSplitEntrance />
        <TutorialController onFinish={handleTutorialFinish} />
        <Board.Nav className="flex h-full w-[210px] flex-col border-r border-border/60 bg-background/80 p-3.5 shadow-[4px_0_18px_-18px_rgba(0,0,0,0.55)] max-md:h-auto max-md:w-full max-md:flex-row max-md:border-b max-md:border-r-0 max-md:p-2 max-md:shadow-none max-md:[&>div]:flex max-md:[&>div]:w-full max-md:[&>div]:gap-1 max-md:[&>div]:overflow-x-auto">
          <Board.NavList className="relative mb-1.5 cursor-pointer rounded-lg px-3 py-2.5 text-[13px] text-muted-foreground transition-colors before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-foreground before:opacity-0 hover:bg-secondary/55 hover:text-foreground data-[selected=true]:bg-secondary/80 data-[selected=true]:text-foreground data-[selected=true]:before:opacity-100 max-md:mb-0 max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 max-md:before:hidden" />
        </Board.Nav>
        <Board.Panel autoFitIntroduce={isTutorialSeen} className="bg-[radial-gradient(circle_at_50%_0%,hsl(var(--secondary)/0.45),transparent_52%)] dark:bg-[radial-gradient(circle_at_50%_0%,hsl(var(--secondary)/0.18),transparent_48%)]">
          <Board.GroupIndicate className="border border-indicator bg-indicator/20 shadow-[0_0_0_3px_hsl(var(--indicator)/0.08)]" />
          <Board.Groups>
            <Board.Group
              mdxSources={mdxSources}
              className="grid grid-rows-[auto_1fr] border border-border/60 bg-background shadow-[0_8px_28px_-20px_rgba(0,0,0,0.34)] ring-1 ring-foreground/[0.025] transition-group duration-200 data-[foreground=true]:border-border/90 data-[foreground=true]:shadow-[0_22px_48px_-24px_rgba(0,0,0,0.46)] dark:border-foreground/15 dark:shadow-[0_10px_34px_-24px_rgba(0,0,0,0.9)] dark:data-[foreground=true]:border-foreground/30 dark:data-[foreground=true]:ring-foreground/[0.07] dark:data-[foreground=true]:shadow-[0_24px_52px_-26px_rgba(0,0,0,0.95)]"
            >
              <Board.GroupHeader className="cursor-pointer border-b border-border/55 bg-secondary/45 shadow-[inset_0_-1px_0_hsl(var(--border)/0.35)] dark:border-foreground/15 dark:bg-secondary/20">
                <Board.Tab className="flex cursor-pointer items-center justify-center whitespace-normal bg-secondary/25 px-3 text-center text-sm text-muted-foreground transition-tab duration-300 hover:bg-secondary/60 hover:text-foreground data-[selected=true]:z-10 data-[selected=true]:bg-background data-[selected=true]:text-foreground data-[selected=true]:shadow-[0_8px_20px_-13px_hsl(var(--foreground)/0.5)] dark:bg-secondary/10 dark:hover:bg-secondary/30 dark:data-[selected=true]:bg-background dark:data-[selected=true]:shadow-[0_10px_24px_-14px_hsl(var(--foreground)/0.38)]" />
                <Board.TabIndicate className="border border-indicator bg-indicator/20" />
              </Board.GroupHeader>
              <Board.TabContent className="bg-background text-foreground">
                <CustomMDX />
              </Board.TabContent>
            </Board.Group>
          </Board.Groups>
        </Board.Panel>
      </Board.Root>
    </>
  );
}
