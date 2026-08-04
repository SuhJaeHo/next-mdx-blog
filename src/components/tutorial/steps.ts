import { ITutorialStep } from "./types";
import { centerOf, simulateDrag, simulateDoubleClick, sleep } from "./simulate";

type TutorialStepKey = "reorder" | "split" | "combine" | "resize" | "snap" | "fullscreen";
type TranslateStep = (key: `${TutorialStepKey}.${"title" | "description"}`) => string;

export const createTutorialSteps = (t: TranslateStep): ITutorialStep[] => [
  {
    selector: "[data-tab-id]",
    title: t("reorder.title"),
    description: t("reorder.description"),
    placement: "bottom",
    play: async (signal) => {
      const header = document.querySelector("[data-group-header]");
      if (!header) return null;
      const tabs = Array.from(header.querySelectorAll("[data-tab-id]"));
      if (tabs.length < 2) return tabs[0] ?? null;

      const tab = tabs[0];
      const from = centerOf(tab);
      const to = centerOf(tabs[1]);
      await simulateDrag(tab, from, { x: to.x + 20, y: from.y }, { signal });
      return document.querySelector("[data-tab-id]");
    },
  },
  {
    selector: "[data-tab-id]",
    title: t("split.title"),
    description: t("split.description"),
    // The new panel spans the container's full height, so top/bottom placement has nowhere
    // to fit — anchor beside it instead.
    placement: "left",
    play: async (signal) => {
      const header = document.querySelector("[data-group-header]");
      const container = document.querySelector("[data-container]");
      if (!header || !container) return null;
      const tab = header.querySelector("[data-tab-id]");
      if (!tab) return null;

      const from = centerOf(tab);
      const containerRect = container.getBoundingClientRect();
      const to = { x: containerRect.right + 40, y: from.y };
      await simulateDrag(tab, from, to, { signal, steps: 30 });
      return document.querySelectorAll("[data-group]")[1] ?? null;
    },
  },
  {
    selector: "[data-group-header]",
    title: t("combine.title"),
    description: t("combine.description"),
    placement: "bottom",
    play: async (signal) => {
      const headers = Array.from(document.querySelectorAll("[data-group-header]"));
      if (headers.length < 2) return headers[0] ?? null;

      const [firstHeader, secondHeader] = headers;
      const tab = secondHeader.querySelector("[data-tab-id]");
      if (!tab) return firstHeader;

      const from = centerOf(tab);
      const to = centerOf(firstHeader);
      await simulateDrag(tab, from, to, { signal, steps: 30 });
      return document.querySelector("[data-group-header]");
    },
  },
  {
    selector: '[data-direction="RIGHT"]',
    title: t("resize.title"),
    description: t("resize.description"),
    placement: "left",
    play: async (signal) => {
      const handle = document.querySelector('[data-direction="RIGHT"]');
      if (!handle) return null;

      const from = centerOf(handle);
      await simulateDrag(handle, from, { x: from.x + 100, y: from.y }, { signal, steps: 20 });
      await sleep(500, signal);

      const handle2 = document.querySelector('[data-direction="RIGHT"]');
      if (!handle2) return handle;
      const from2 = centerOf(handle2);
      await simulateDrag(handle2, from2, { x: from2.x - 100, y: from2.y }, { signal, steps: 20 });
      return document.querySelector('[data-direction="RIGHT"]');
    },
  },
  {
    selector: "[data-group-header]",
    title: t("snap.title"),
    description: t("snap.description"),
    placement: "bottom",
    play: async (signal) => {
      const header = document.querySelector("[data-group-header]");
      const container = document.querySelector("[data-container]");
      if (!header || !container) return null;

      const headerRect = header.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const from = { x: headerRect.right - 15, y: headerRect.top + headerRect.height / 2 };
      const to = { x: containerRect.left + containerRect.width / 2, y: containerRect.top - 50 };
      await simulateDrag(header, from, to, { signal, steps: 30 });
      return document.querySelector("[data-group]");
    },
  },
  {
    selector: "[data-group-header]",
    title: t("fullscreen.title"),
    description: t("fullscreen.description"),
    placement: "bottom",
    play: async (signal) => {
      const header = document.querySelector("[data-group-header]");
      if (!header) return null;
      await simulateDoubleClick(header, centerOf(header));
      await sleep(1200, signal);

      const header2 = document.querySelector("[data-group-header]");
      if (!header2) return header;
      await simulateDoubleClick(header2, centerOf(header2));
      return document.querySelector("[data-group-header]");
    },
  },
];
