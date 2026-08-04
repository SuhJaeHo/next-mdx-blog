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

    // Keep board color transitions disabled until next-themes has applied the new
    // class and the browser has painted it. Interaction transitions work normally
    // again immediately afterward.
    window.setTimeout(() => root.classList.remove("theme-changing"), 100);
  };

  return (
    <button onClick={handleToggleTheme} aria-label={t("theme")} className="relative flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground">
      <>
        <Sun className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </>
    </button>
  );
};
