"use client";

import * as React from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { useLocaleController } from "@app/[locale]/locale-provider";

const languageNames: Record<Locale, string> = {
  ko: "한국어",
  ja: "日本語",
  en: "English",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleController();
  const t = useTranslations("Header");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const changeLocale = (nextLocale: Locale) => {
    const segments = window.location.pathname.split("/");
    segments[1] = nextLocale;
    window.history.replaceState({}, "", `${segments.join("/")}${window.location.search}${window.location.hash}`);
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    setLocale(nextLocale);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative text-xs">
      <button
        type="button"
        aria-label={t("language")}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="group flex h-7 min-w-[92px] items-center gap-1.5 rounded-full border border-border/70 bg-background pl-2.5 pr-2 text-muted-foreground shadow-sm transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10"
      >
        <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="flex-1 text-left font-medium text-foreground">{languageNames[locale]}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t("language")}
          className="absolute right-0 top-[calc(100%+6px)] z-[60] w-36 overflow-hidden rounded-xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-xl ring-1 ring-foreground/5"
        >
          {Object.entries(languageNames).map(([value, label]) => {
            const optionLocale = value as Locale;
            const isSelected = optionLocale === locale;

            return (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => changeLocale(optionLocale)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none data-[selected=true]:bg-secondary/70"
                data-selected={isSelected}
              >
                <span className="flex-1">{label}</span>
                <Check className={`h-3.5 w-3.5 text-foreground ${isSelected ? "opacity-100" : "opacity-0"}`} aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
