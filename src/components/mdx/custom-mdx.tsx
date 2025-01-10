"use client";

import * as React from "react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import "github-markdown-css";
import "@app/prism-custom.css";
import style from "./custom-mdx.module.scss";
import CodeBlock from "./code-block";
import { cn } from "@lib/utils";

interface ICustomMDXProps extends React.ComponentPropsWithoutRef<"div"> {
  mdxContent?: MDXRemoteSerializeResult;
  groupId?: string;
}

const components = {
  pre: (props: any) => <CodeBlock {...props} />,
};

export default function CustomMDX({ className, mdxContent, groupId }: ICustomMDXProps) {
  return (
    <div id={`markdown-body-${groupId}`} className={cn(`markdown-body text-inherit bg-inherit min-w-max px-2 pt-6 ${className} !important ${style.custom}`)}>
      <MDXRemote {...(mdxContent as MDXRemoteSerializeResult)} components={components} />
    </div>
  );
}
