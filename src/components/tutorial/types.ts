export interface ITutorialStep {
  title: string;
  description: string;
  placement: "top" | "bottom" | "left" | "right";
  /** Selector for the element to spotlight/track before the action starts. */
  selector: string;
  /** Performs the real interaction on the live DOM. Returns the element to keep spotlighting afterward (or null to keep the original). */
  play: (signal: AbortSignal) => Promise<Element | null>;
}
