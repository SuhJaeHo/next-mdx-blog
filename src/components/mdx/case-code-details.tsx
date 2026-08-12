"use client";

import * as React from "react";

const TRANSITION_MS = 220;

interface ICaseCodeDetailsProps extends React.DetailsHTMLAttributes<HTMLDetailsElement> {}

const CaseCodeDetails: React.FC<ICaseCodeDetailsProps> = ({ children, ...props }) => {
  const detailsRef = React.useRef<HTMLDetailsElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const isAnimating = React.useRef(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const childArray = React.Children.toArray(children);
  const summary = childArray.find(
    (child) => React.isValidElement(child) && child.type === "summary"
  );
  const rest = childArray.filter((child) => child !== summary);

  const openPanel = () => {
    const details = detailsRef.current;
    const panel = panelRef.current;
    if (!details || !panel) return;

    isAnimating.current = true;
    details.open = true;
    setIsOpen(true);

    panel.style.height = "0px";
    panel.style.opacity = "0";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!panelRef.current) return;
        panelRef.current.style.transition = `height ${TRANSITION_MS}ms ease, opacity ${TRANSITION_MS}ms ease`;
        panelRef.current.style.height = `${panelRef.current.scrollHeight}px`;
        panelRef.current.style.opacity = "1";
      });
    });
  };

  const closePanel = () => {
    const panel = panelRef.current;
    if (!panel) return;

    isAnimating.current = true;
    panel.style.height = `${panel.scrollHeight}px`;
    panel.style.opacity = "1";

    requestAnimationFrame(() => {
      if (!panelRef.current) return;
      panelRef.current.style.transition = `height ${TRANSITION_MS}ms ease, opacity ${TRANSITION_MS}ms ease`;
      panelRef.current.style.height = "0px";
      panelRef.current.style.opacity = "0";
    });

    setIsOpen(false);
  };

  const onSummaryClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (isAnimating.current) return;
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  };

  const onPanelTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.target !== panelRef.current || event.propertyName !== "height") return;
    isAnimating.current = false;

    if (isOpen) {
      panelRef.current!.style.height = "auto";
    } else if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  return (
    <details ref={detailsRef} {...props} className="case-code">
      {summary &&
        React.isValidElement<React.HTMLAttributes<HTMLElement>>(summary) &&
        React.cloneElement(summary, { onClick: onSummaryClick })}
      <div
        ref={panelRef}
        style={{ height: 0, opacity: 0, overflow: "hidden" }}
        onTransitionEnd={onPanelTransitionEnd}
      >
        {rest}
      </div>
    </details>
  );
};

export default CaseCodeDetails;
