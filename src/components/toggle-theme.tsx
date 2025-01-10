"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export const ToggleTheme = () => {
  const { setTheme, theme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme" className="relative flex items-center justify-center rounded-md p-2 hover:bg-secondary">
      <>
        <Sun className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </>
    </button>
  );
};
