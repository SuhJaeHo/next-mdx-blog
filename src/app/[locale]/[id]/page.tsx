import React from "react";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import { promises as fs } from "fs";
import path from "path";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import data from "@app/data.json";
import { ToggleTheme } from "@components/toggle-theme";
import { LanguageSwitcher } from "@components/language-switcher";
import { routing, type Locale } from "@/i18n/routing";
import type { BoardDataState } from "@components/board/board-data-provider";
import GroupTabsLayout from "./group-tabs-layout";

interface IPageProps {
  params: { locale: string; id: string };
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => Object.keys(data.blog.page).map((id) => ({ locale, id })));
}

async function getMdxSources(locale: Locale) {
  const localizedDir = path.join(process.cwd(), "src", "markdown", locale);
  const fallbackDir = path.join(process.cwd(), "src", "markdown");
  const fallbackFiles = (await fs.readdir(fallbackDir)).filter((file) => file.endsWith(".mdx"));
  let localizedFiles: string[] = [];
  try {
    localizedFiles = (await fs.readdir(localizedDir)).filter((file) => file.endsWith(".mdx"));
  } catch {
    // A locale directory is optional; untranslated documents use the shared source.
  }

  const files = Array.from(new Set([...fallbackFiles, ...localizedFiles]));
  const entries = await Promise.all(
    files.map(async (fileName) => {
      const mdxDir = localizedFiles.includes(fileName) ? localizedDir : fallbackDir;
      const content = String(await fs.readFile(path.join(mdxDir, fileName)));
      const serialized = await serialize(content, {
        mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypePrism], format: "mdx" },
      });
      return [fileName, serialized] as const;
    })
  );

  return Object.fromEntries(entries) as Record<string, MDXRemoteSerializeResult>;
}

export default async function Page({ params }: IPageProps) {
  if (!hasLocale(routing.locales, params.locale) || !(params.id in data.blog.page)) notFound();

  setRequestLocale(params.locale);
  const localizedSources = await Promise.all(
    routing.locales.map(async (sourceLocale) => [sourceLocale, await getMdxSources(sourceLocale)] as const)
  );
  const mdxSourcesByLocale = Object.fromEntries(localizedSources) as Record<Locale, Record<string, MDXRemoteSerializeResult>>;
  const boardData: BoardDataState = {
    ...data.blog,
    selectedPageId: params.id,
  };

  return (
    <main className="size-full grid grid-rows-[auto_1fr_auto]">
      <header className="flex h-[36px] w-full items-center justify-between border-b px-2">
        <ToggleTheme />
        <LanguageSwitcher />
      </header>
      <div className="grid grid-cols-[auto_1fr_auto]">
        <GroupTabsLayout data={boardData} mdxSourcesByLocale={mdxSourcesByLocale} />
        <aside className="h-full w-[30px] border-l" />
      </div>
      <footer className="h-[30px] w-full border-t" />
    </main>
  );
}
