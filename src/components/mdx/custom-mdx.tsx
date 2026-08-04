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
  contentFile?: string;
}

const components = {
  pre: (props: any) => <CodeBlock {...props} />,
};

export default function CustomMDX({ className, mdxContent, groupId, contentFile }: ICustomMDXProps) {
  const isProfile = contentFile === "introduce.mdx" || contentFile === "career.mdx" || contentFile === "portfolio-overview.mdx";
  const isTechnicalArticle = contentFile === "npm-publish.mdx" || contentFile === "mdx.mdx" || contentFile === "npm-readme.mdx";

  return (
    <div
      id={`markdown-body-${groupId}`}
      data-document={contentFile?.replace(".mdx", "")}
      className={cn(
        "markdown-body text-inherit bg-inherit",
        isProfile || isTechnicalArticle ? "min-w-0" : "min-w-max px-2 pt-6",
        className,
        style.custom,
        isProfile && style.profile,
        isTechnicalArticle && style.article,
        contentFile === "introduce.mdx" && style.introduce,
        contentFile === "career.mdx" && style.career,
        contentFile === "portfolio-overview.mdx" && style.showcase
      )}
    >
      <MDXRemote {...(mdxContent as MDXRemoteSerializeResult)} components={components} />
    </div>
  );
}
