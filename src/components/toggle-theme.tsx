"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useTranslations } from "next-intl";

export const ToggleTheme = () => {
  const { setTheme, theme } = useTheme();
  const t = useTranslations("Header");

  const handleToggleTheme = () => {
    const root = document.documentElement;
    root.classList.add("theme-changing");
    setTheme(theme === "dark" ? "light" : "dark");

    // Keep the transition scope alive until the color interpolation has completed.
    // Board position, size and transform properties are intentionally excluded.
    window.setTimeout(() => root.classList.remove("theme-changing"), 180);
  };

  return (
    <button
      onClick={handleToggleTheme}
      aria-label={t("theme")}
      className="relative flex size-7 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm transition-all hover:border-foreground/25 hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10"
    >
      <>
        <Sun className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </>
    </button>
  );
};
