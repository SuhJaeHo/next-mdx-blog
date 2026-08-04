import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["ko", "ja", "en"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

// Locale-aware Link/useRouter/usePathname — these perform client-side transitions when
// switching locale. Using plain next/navigation instead causes a full page reload here,
// since it doesn't know how to swap only the locale segment client-side.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
