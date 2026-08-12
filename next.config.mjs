import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const createNextConfig = (phase) => ({
  reactStrictMode: true,
  // Keep development chunks isolated from production builds. Running a build
  // while `next dev` is active must not invalidate the files used on refresh.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  async redirects() {
    return [
      {
        source: "/:locale(ko|en|ja)/start-blog",
        destination: "/:locale/making",
        permanent: true,
      },
      {
        source: "/:locale(ko|en|ja)/resume",
        destination: "/:locale/introduce",
        permanent: true,
      },
    ];
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  transpilePackages: ["next-mdx-remote"],
  sassOptions: {
    includePaths: ["styles"],
  },
});

const withMDX = createMDX({});
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default (phase) => withNextIntl(withMDX(createNextConfig(phase)));
