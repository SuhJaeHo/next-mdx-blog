import { ITutorialStep } from "./types";
import { centerOf, simulateDrag, simulateDoubleClick, sleep } from "./simulate";

export const TUTORIAL_STEPS: ITutorialStep[] = [
  {
    selector: "[data-tab-id]",
    title: "Reorder tabs",
    description: "Drag a tab left or right to reorder it within its panel. Watch:",
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
    title: "Split into a new panel",
    description: "Drag a tab all the way to the edge of the screen and it splits off into its own panel. Watch:",
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
    title: "Combine panels",
    description: "Drop a tab onto another panel's header to merge them back together. Watch:",
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
    title: "Resize panels",
    description: "Drag any edge or corner of a panel to resize it. Watch:",
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
    title: "Snap to half size",
    description: "Drag a panel's header to the edge of the screen and it resizes to fill that half. Watch:",
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
    title: "Full screen",
    description: "Double-click a panel's header to expand it full screen, and again to restore it. Watch:",
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
