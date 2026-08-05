"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@lib/utils";
import { createTutorialSteps } from "./steps";
import { ITutorialStep } from "./types";
import { forceMouseUp, sleep } from "./simulate";

export const TUTORIAL_STORAGE_KEY = "tutorial-seen";
const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 320;
const VIEWPORT_MARGIN = 16;

interface IRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function rectOf(el: Element): IRect {
  const domRect = el.getBoundingClientRect();
  return { top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height };
}

interface ITutorialProps {
  /** Called once the tour ends (completed or skipped), so the caller can reset any real board state it mutated. */
  onFinish: () => void;
}

export default function Tutorial({ onFinish }: ITutorialProps) {
  const t = useTranslations("Tutorial");
  const pathname = usePathname();
  const currentPageId = pathname.split("/").filter(Boolean).at(-1);
  const tutorialSteps = React.useMemo(
    () => createTutorialSteps((key) => t(`steps.${key}`)),
    [t]
  );
  const [mounted, setMounted] = React.useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = React.useState<boolean | null>(null);
  const [isActive, setIsActive] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [rect, setRect] = React.useState<IRect | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const abortRef = React.useRef<AbortController | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const targetElRef = React.useRef<Element | null>(null);
  const lastRectRef = React.useRef<IRect | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setHasSeenTutorial(localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true");
  }, []);

  React.useEffect(() => {
    if (!mounted || hasSeenTutorial !== false || currentPageId === "introduce" || isActive) return;

    const timer = window.setTimeout(() => setIsActive(true), 500);
    return () => window.clearTimeout(timer);
  }, [currentPageId, hasSeenTutorial, isActive, mounted]);

  const stopTracking = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startTracking = React.useCallback(() => {
    stopTracking();
    const loop = () => {
      const el = targetElRef.current;
      if (el && el.isConnected) {
        const nextRect = rectOf(el);
        const previousRect = lastRectRef.current;
        const hasMoved =
          !previousRect ||
          Math.abs(nextRect.top - previousRect.top) > 0.25 ||
          Math.abs(nextRect.left - previousRect.left) > 0.25 ||
          Math.abs(nextRect.width - previousRect.width) > 0.25 ||
          Math.abs(nextRect.height - previousRect.height) > 0.25;

        if (hasMoved) {
          lastRectRef.current = nextRect;
          setRect(nextRect);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [stopTracking]);

  const abortCurrentStep = React.useCallback(() => {
    abortRef.current?.abort();
    // Whatever real drag was mid-flight when we aborted gets finalized by board.tsx itself.
    forceMouseUp();
  }, []);

  const playStep = React.useCallback(
    (index: number) => {
      abortCurrentStep();
      const controller = new AbortController();
      abortRef.current = controller;

      const step = tutorialSteps[index];
      const initialEl = document.querySelector(step.selector);
      targetElRef.current = initialEl;
      const initialRect = initialEl ? rectOf(initialEl) : null;
      lastRectRef.current = initialRect;
      setRect(initialRect);

      startTracking();
      setIsPlaying(true);

      sleep(280, controller.signal)
        .then(() => step.play(controller.signal))
        .then((finalEl) => {
          if (controller.signal.aborted) return;
          if (finalEl) targetElRef.current = finalEl;
        })
        .catch((err) => {
          if (!(err instanceof DOMException && err.name === "AbortError")) console.error(err);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsPlaying(false);
        });
    },
    [abortCurrentStep, startTracking, tutorialSteps]
  );

  React.useEffect(() => {
    if (!isActive) return;
    playStep(stepIndex);
    return () => {
      abortCurrentStep();
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stepIndex]);

  React.useEffect(() => {
    if (!isActive) return;

    const blockUserInput = (event: Event) => {
      // Tutorial simulations dispatch untrusted MouseEvents directly to document and must
      // continue to reach the Board. Only real user input is blocked while a step is active.
      if (!event.isTrusted) return;

      const target = event.target;
      const tutorialButton = target instanceof Element ? target.closest<HTMLElement>("[data-tutorial-controls] button") : null;
      if (tutorialButton && !tutorialButton.hasAttribute("disabled")) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const eventTypes = ["pointerdown", "pointermove", "pointerup", "mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"] as const;
    eventTypes.forEach((eventType) => document.addEventListener(eventType, blockUserInput, { capture: true, passive: false }));

    return () => {
      eventTypes.forEach((eventType) => document.removeEventListener(eventType, blockUserInput, { capture: true }));
    };
  }, [isActive]);

  const finish = React.useCallback(() => {
    abortCurrentStep();
    stopTracking();
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    setHasSeenTutorial(true);
    setIsActive(false);
    setStepIndex(0);
    setIsPlaying(false);
    onFinish();
  }, [abortCurrentStep, onFinish, stopTracking]);

  const handleNext = () => {
    if (isPlaying) return;
    if (stepIndex >= tutorialSteps.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleReplay = () => {
    setStepIndex(0);
    setIsActive(true);
  };

  if (!mounted) return null;

  const step = tutorialSteps[stepIndex];

  return createPortal(
    <>
      {!isActive && hasSeenTutorial === true && (
        <button
          type="button"
          onClick={handleReplay}
          aria-label={t("replay")}
          className="fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors hover:bg-secondary"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}
      {isActive && rect && (
        <TutorialOverlay
          step={step}
          stepIndex={stepIndex}
          total={tutorialSteps.length}
          rect={rect}
          tooltipAnchorRect={rect}
          isPlaying={isPlaying}
          onNext={handleNext}
          onSkip={finish}
          labels={{ next: t("next"), done: t("done"), skip: t("skip") }}
        />
      )}
    </>,
    document.body
  );
}

interface ITutorialOverlayProps {
  step: ITutorialStep;
  stepIndex: number;
  total: number;
  rect: IRect;
  tooltipAnchorRect: IRect;
  isPlaying: boolean;
  onNext: () => void;
  onSkip: () => void;
  labels: { next: string; done: string; skip: string };
}

function TutorialOverlay({ step, stepIndex, total, rect, tooltipAnchorRect, isPlaying, onNext, onSkip, labels }: ITutorialOverlayProps) {
  const holeTop = rect.top - SPOTLIGHT_PADDING;
  const holeLeft = rect.left - SPOTLIGHT_PADDING;
  const holeWidth = rect.width + SPOTLIGHT_PADDING * 2;
  const holeHeight = rect.height + SPOTLIGHT_PADDING * 2;
  const anchorTop = tooltipAnchorRect.top - SPOTLIGHT_PADDING;
  const anchorLeft = tooltipAnchorRect.left - SPOTLIGHT_PADDING;
  const anchorWidth = tooltipAnchorRect.width + SPOTLIGHT_PADDING * 2;
  const anchorHeight = tooltipAnchorRect.height + SPOTLIGHT_PADDING * 2;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let placement = step.placement;
  if (placement === "bottom" && anchorTop + anchorHeight + TOOLTIP_GAP + 160 > viewportHeight) placement = "top";
  if (placement === "top" && anchorTop - TOOLTIP_GAP - 160 < 0) placement = "bottom";

  const clampedLeft = Math.min(Math.max(anchorLeft, VIEWPORT_MARGIN), viewportWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN);
  const clampedSideTop = Math.min(Math.max(anchorTop, VIEWPORT_MARGIN), viewportHeight - 200);

  let rawLeft: number;
  let rawTop: number;
  let transform: string | undefined;
  let arrowClassName: string;

  if (placement === "top") {
    rawLeft = clampedLeft;
    rawTop = anchorTop - TOOLTIP_GAP;
    transform = "translateY(-100%)";
    arrowClassName = "absolute -bottom-[7px] left-6 h-3 w-3 rotate-45 border-b border-r border-border bg-background";
  } else if (placement === "left") {
    rawLeft = anchorLeft - TOOLTIP_GAP - TOOLTIP_WIDTH;
    rawTop = clampedSideTop;
    arrowClassName = "absolute top-6 -right-[7px] h-3 w-3 rotate-45 border-r border-t border-border bg-background";
  } else if (placement === "right") {
    rawLeft = anchorLeft + anchorWidth + TOOLTIP_GAP;
    rawTop = clampedSideTop;
    arrowClassName = "absolute top-6 -left-[7px] h-3 w-3 rotate-45 border-l border-b border-border bg-background";
  } else {
    rawLeft = clampedLeft;
    rawTop = anchorTop + anchorHeight + TOOLTIP_GAP;
    arrowClassName = "absolute -top-[7px] left-6 h-3 w-3 rotate-45 border-l border-t border-border bg-background";
  }

  // Final safety net: whatever placement math produced above, never let the card render
  // off-screen (e.g. a very tall or edge-hugging target throwing off the branch-specific math).
  const safeLeft = Math.min(Math.max(rawLeft, VIEWPORT_MARGIN), viewportWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN);
  const safeTop = transform ? Math.max(rawTop, 160) : Math.min(Math.max(rawTop, VIEWPORT_MARGIN), viewportHeight - 160);
  const tooltipStyle: React.CSSProperties = { left: safeLeft, top: safeTop, transform };

  return (
    <>
      {/* Blocks interaction with the board while the tutorial is active. */}
      <div className="fixed inset-0 z-40 touch-none" data-tutorial-active />
      {/* Dark backdrop with a cutout over the highlighted (and possibly moving) element. */}
      <div
        className="fixed z-40 rounded-lg transition-[top,left,width,height] duration-75 ease-linear"
        style={{ top: holeTop, left: holeLeft, width: holeWidth, height: holeHeight, boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)", willChange: "top, left, width, height" }}
      />
      <div
        data-tutorial-controls
        className="fixed z-[80] rounded-lg border border-border bg-background p-4 text-foreground shadow-2xl transition-[top,left] duration-300 ease-out"
        style={{ width: TOOLTIP_WIDTH, willChange: "top, left", ...tooltipStyle }}
      >
        <div className={arrowClassName} />
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {step.title}
            {isPlaying && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />}
          </h3>
          <button type="button" onClick={onSkip} aria-label={labels.skip} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i === stepIndex ? "bg-primary" : "bg-border")} />
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="mr-1 text-muted-foreground">
              {stepIndex + 1} / {total}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={isPlaying}
              className="flex min-w-[58px] items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-45"
            >
              {stepIndex === total - 1 ? labels.done : labels.next}
              {stepIndex < total - 1 && <ArrowRight className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
