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
  const durationMs = steps * Math.max(stepDelayMs, 28);

  dispatchMouse(target, "mousedown", from.x, from.y);
  await sleep(48, signal);

  await new Promise<void>((resolve, reject) => {
    let animationFrame = 0;
    let startTime: number | null = null;

    const cleanup = () => {
      cancelAnimationFrame(animationFrame);
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;

      dispatchMouse(document, "mousemove", x, y);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        cleanup();
        resolve();
      }
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
    animationFrame = requestAnimationFrame(animate);
  });

  dispatchMouse(document, "mouseup", to.x, to.y);
  // Let React commit the board's mouseup reducer update before the tutorial enables
  // navigation to the next step.
  await sleep(140, signal);
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
