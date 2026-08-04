# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start the dev server (Next.js 14, App Router)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — `next lint` (config: `next/core-web-vitals`)
- `npx playwright test` — run the e2e suite (`tests/*.spec.ts`); assumes the dev server is already running at `http://127.0.0.1:3000` (no `webServer` block configured in `playwright.config.ts`)
- `npx playwright test tests/resize.spec.ts` — run a single spec
- Package manager is **pnpm** (`pnpm-lock.yaml` is committed; don't add a competing lockfile)

## Architecture

This is a personal blog built on Next.js App Router + MDX, with one distinctive feature: blog posts are laid out in a **draggable/resizable tiling-window board** (think tmux panes or a tiling window manager) instead of a normal scrolling page.

### Board editor: this repo owns the implementation

The drag/resize/tab UI lives in **this repo**, at `src/components/board/*` (`board.tsx`, `board-data-provider.tsx`, `board-layout-provider.tsx`, `utils.ts`, `constants.ts`, `types.ts`). `src/app/[id]/group-tabs-layout.tsx` imports it as `Board` from `@components/board` (re-exported via `src/components/board/index.ts`). **Editing files under `src/components/board/` directly changes app behavior.**

This used to be a thin wrapper around a published npm package, `group-tabs-layout`, whose source lived in a separate sibling repo (`../next-group-tabs-layout`). That dependency has since been removed from `package.json` — the local copy here is now the only implementation in play. If a sibling `next-group-tabs-layout` repo still exists on disk, treat it as historical/unrelated; it is no longer wired into this app.

### Board data flow

- `Board.Root` takes `boardData` (see `src/app/data.json` for shape: `page` → `group` → `tab`, each group has `size`/`position`/`prevSize`/`prevPosition`) and `customConstants` (`GROUP_MINIMUM_SIZE`, `TAB_SIZES`).
- Two separate React contexts/reducers drive it: a **data** reducer (group/tab positions, sizes, membership — actions like `UPDATE_GROUP_SIZE`, `DIVIDE_GROUP`, `COMBINE_GROUP`) and a **layout** reducer (transient drag UI state — `groupIndicate`/`tabIndicate`, the drop-preview highlight shown while dragging).
- Drag/resize interactions mutate `element.style` directly during `mousemove` for performance, then commit the final value to the data reducer on `mouseup`. Keep this in mind if debugging "why doesn't state match the DOM mid-drag" — it's intentional.
- Dragging a group to a container edge shows a half-size drop indicator (`groupIndicate`); dragging a tab out of its group entirely creates a new group (`DIVIDE_GROUP`).

### MDX content pipeline

- `src/app/[id]/page.tsx` reads `src/app/data.json` for the board structure, and separately reads every `.mdx` file in `src/markdown/` at build/request time, serializing each with `next-mdx-remote/serialize` (`remark-gfm` + `rehype-prism-plus`). Every group's tab renders the *same* serialized MDX map — the tab-to-file relationship is resolved client-side inside `src/components/board/*` (`TabContent`, keyed by each tab's `contentFile`), not in `page.tsx`.
- `src/components/mdx/custom-mdx.tsx` is the MDX renderer used inside each tab's content pane; it overrides `pre` with `src/components/mdx/code-block.tsx` for syntax highlighting (Prism, via `@app/prism-custom.css` and `rehype-prism-plus`).
- Locale index routes open `/[locale]/introduce`; the portfolio build log is available at `/[locale]/making`.

### Path aliases (`tsconfig.json`)

`@app/*`, `@components/*`, `@lib/*` all resolve under `src/`.
