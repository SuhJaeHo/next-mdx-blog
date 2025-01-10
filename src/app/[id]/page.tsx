import React from "react";

import { promises as fs } from "fs";
import path from "path";

import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";

import data from "../data.json";
import { ToggleTheme } from "@components/toggle-theme";

import GroupTabsLayout from "./group-tabs-layout";
import { MDXRemoteSerializeResult } from "next-mdx-remote";

export async function generateStaticParams() {
  const posts = Object.keys(data.blog.page).map((key) => ({
    id: key,
  }));

  return posts;
}

async function getMdxSources() {
  const mdxDir = path.join(process.cwd(), "src", "markdown");

  const files = await fs.readdir(mdxDir);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

  const mdxContentsArr = await Promise.all(
    mdxFiles.map(async (fileName) => {
      const filePath = path.join(mdxDir, fileName);
      const fileContent = String(await fs.readFile(filePath));

      const serializedContent = await serialize(fileContent, {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypePrism],
          format: "mdx",
        },
      });

      return {
        fileName,
        content: serializedContent,
      };
    })
  );

  const mdxContentsHm: { [key: string]: MDXRemoteSerializeResult } = {};
  mdxContentsArr.forEach(({ fileName, content }) => {
    mdxContentsHm[fileName] = content;
  });

  return mdxContentsHm;
}

export default async function Home({ params }: { params: { id: string } }) {
  const mdxSources = await getMdxSources();

  return (
    <main className="size-full grid grid-rows-[auto_1fr_auto]">
      <header className="flex px-2 h-[30px] w-full border-b-2">
        <ToggleTheme />
      </header>
      <div className="grid grid-cols-[auto_1fr_auto]">
        <GroupTabsLayout data={data.blog} mdxSources={mdxSources} />
        <aside className="h-full w-[30px] border-l-2" />
      </div>
      <footer className="h-[30px] w-full border-t-2" />
    </main>
  );
}
