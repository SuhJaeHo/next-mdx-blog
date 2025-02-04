"use client";

import { useState, useRef } from "react";

interface ICodeBlockProps extends React.HTMLAttributes<"div"> {}

const CodeBlock: React.FC<ICodeBlockProps> = ({ className, ...props }) => {
  const preRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    if (preRef.current) {
      setCopied(true);
      navigator.clipboard.writeText(preRef.current.textContent);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <div className="relative rounded-lg">
      <button
        aria-label="Copy code"
        className={`absolute right-2 top-2 h-8 w-8 rounded p-1 ${copied ? "border-green-400 focus:border-green-400 focus:outline-none" : "border-gray-600"}`}
        onClick={onCopy}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none" className={copied ? "text-green-400" : "text-gray-300"}>
          {copied ? (
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </>
          ) : (
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </>
          )}
        </svg>
      </button>
      <pre className={className} ref={preRef}>
        {props.children}
      </pre>
    </div>
  );
};

export default CodeBlock;
