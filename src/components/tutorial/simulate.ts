// Drives the board's real drag/resize/combine logic by dispatching genuine MouseEvents,
// the same way board.tsx's mousedown handlers (on Tab/GroupHeader/resize handles) and the
// document-level mousemove/mouseup listeners in Panel expect. This is not a fake/cosmetic
// animation — it performs the actual interaction, which is why the tutorial resets the board
// afterward (see group-tabs-layout.tsx's resetKey).

export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

const dispatchMouse = (target: EventTarget, type: string, x: number, y: number) => {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 }));
};

export interface IPoint {
  x: number;
  y: number;
}

export const centerOf = (el: Element): IPoint => {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

/**
 * Simulates a real mousedown → mousemove(...) → mouseup drag gesture.
 * mousedown fires on `target` (matching how React's onMouseDown handlers are attached);
 * mousemove/mouseup fire on `document`, matching board.tsx's global listeners.
 */
export async function simulateDrag(target: Element, from: IPoint, to: IPoint, opts: { steps?: number; stepDelayMs?: number; signal?: AbortSignal } = {}) {
  const { steps = 36, stepDelayMs = 16, signal } = opts;

  dispatchMouse(target, "mousedown", from.x, from.y);
  await sleep(stepDelayMs, signal);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // ease-in-out for a more natural feel than a linear sweep
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = from.x + (to.x - from.x) * eased;
    const y = from.y + (to.y - from.y) * eased;
    dispatchMouse(document, "mousemove", x, y);
    await sleep(stepDelayMs, signal);
  }

  dispatchMouse(document, "mouseup", to.x, to.y);
  // Let React commit the board's mouseup reducer update before the tutorial enables
  // navigation to the next step.
  await sleep(80, signal);
}

export async function simulateDoubleClick(target: Element, at: IPoint) {
  dispatchMouse(target, "dblclick", at.x, at.y);
}

/**
 * Defensive cleanup: if a step's play() sequence is aborted mid-drag (mousedown already
 * fired but mouseup never did), board.tsx's own handleMouseUpContainer will correctly
 * finalize whatever is mid-drag based on its data-*-is-dragging attributes. No-ops safely
 * if nothing is currently mid-drag.
 */
export function forceMouseUp() {
  dispatchMouse(document, "mouseup", 0, 0);
}
