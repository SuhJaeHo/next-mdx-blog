"use client";

import * as React from "react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import "github-markdown-css";
import "@app/prism-custom.css";
import style from "./custom-mdx.module.scss";
import CodeBlock from "./code-block";
import CaseCodeDetails from "./case-code-details";
import PortfolioVideo from "./portfolio-video";
import { cn } from "@lib/utils";
import { useLocale, useTranslations } from "next-intl";

interface ICustomMDXProps extends React.ComponentPropsWithoutRef<"div"> {
  mdxContent?: MDXRemoteSerializeResult;
  groupId?: string;
  tabId?: string;
  contentFile?: string;
}

const components = {
  pre: (props: any) => <CodeBlock {...props} />,
  CaseCodeDetails,
  PortfolioVideo,
  a: ({ href, rel, target, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = typeof href === "string" && /^https?:\/\//.test(href);
    return <a href={href} target={isExternal ? "_blank" : target} rel={isExternal ? "noreferrer noopener" : rel} {...props} />;
  },
};

export default function CustomMDX({ className, mdxContent, groupId, tabId, contentFile }: ICustomMDXProps) {
  const t = useTranslations("CareerPortfolio");
  const locale = useLocale();
  const isProfile = contentFile === "introduce.mdx" || contentFile === "career.mdx" || contentFile === "portfolio-overview.mdx";
  const isTechnicalArticle = contentFile === "npm-publish.mdx" || contentFile === "mdx.mdx" || contentFile === "npm-readme.mdx";
  const isCareerPortfolio = tabId === "introduce-portfolio-tab";
  const showPortfolioPrintToolbar = false;

  const handlePrint = async () => {
    const source = document.querySelector<HTMLElement>(
      '[data-document-variant="technical-portfolio"] .technical-portfolio-section'
    );
    if (!source) return;

    const previousTitle = document.title;
    const printRoot = document.createElement("div");
    printRoot.className = cn(
      "markdown-body",
      style.custom,
      style.portfolioPrintRoot,
      style.profile,
      style.career,
      style.technicalPortfolio
    );
    printRoot.setAttribute("data-portfolio-print-root", "");
    printRoot.setAttribute("data-content-locale", locale);
    printRoot.appendChild(source.cloneNode(true));
    printRoot.querySelectorAll(".case-code").forEach((details) => {
      details.remove();
    });

    printRoot.querySelectorAll<HTMLElement>("[data-portfolio-video]").forEach((video) => {
      const src = video.dataset.videoSrc;
      const poster = video.dataset.videoPoster;
      if (!src || !poster) return;

      const link = document.createElement("a");
      link.className = "case-video-print";
      link.href = new URL(src, window.location.origin).href;
      link.target = "_blank";
      link.rel = "noreferrer";

      const image = document.createElement("img");
      image.src = new URL(poster, window.location.origin).href;
      image.alt = `${video.dataset.videoLabel ?? "포트폴리오"} 영상 썸네일`;

      const play = document.createElement("span");
      play.className = "case-video-print-play";
      play.setAttribute("aria-hidden", "true");
      play.textContent = "▶";

      const label = document.createElement("span");
      label.className = "case-video-print-label";
      label.textContent = "클릭하여 영상 재생";

      link.append(image, play, label);
      video.replaceWith(link);
    });
    document.body.prepend(printRoot);

    await Promise.all(
      Array.from(printRoot.querySelectorAll("img")).map((image) =>
        image.complete ? Promise.resolve() : image.decode().catch(() => undefined)
      )
    );

    let restored = false;
    const cleanupPrint = () => {
      if (restored) return;
      restored = true;
      document.title = previousTitle;
      printRoot.remove();
    };

    document.title = t("pdfTitle");
    window.addEventListener("afterprint", cleanupPrint, { once: true });
    window.print();
    window.setTimeout(cleanupPrint, 60_000);
  };

  return (
    <div
      id={`markdown-body-${groupId}`}
      data-document={contentFile?.replace(".mdx", "")}
      data-content-locale={locale}
      data-document-variant={isCareerPortfolio ? "technical-portfolio" : undefined}
      className={cn(
        "markdown-body text-inherit bg-inherit",
        isProfile || isTechnicalArticle ? "min-w-0" : "min-w-max px-2 pt-6",
        className,
        style.custom,
        isProfile && style.profile,
        isTechnicalArticle && style.article,
        contentFile === "introduce.mdx" && style.introduce,
        contentFile === "career.mdx" && style.career,
        isCareerPortfolio && style.technicalPortfolio,
        contentFile === "portfolio-overview.mdx" && style.showcase
      )}
    >
      {isCareerPortfolio && showPortfolioPrintToolbar && (
        <div className={style.portfolioPrintToolbar} data-print-hidden>
          <button type="button" onClick={handlePrint}>
            <span aria-hidden>↓</span>
            {t("downloadPdf")}
          </button>
        </div>
      )}
      <MDXRemote {...(mdxContent as MDXRemoteSerializeResult)} components={components} />
    </div>
  );
}
