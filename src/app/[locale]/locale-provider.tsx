"use client";

import * as React from "react";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { timeZone } from "@/i18n/config";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

const messages = { ko, ja, en };

interface ILocaleContext {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = React.createContext<ILocaleContext | null>(null);

export function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [locale, setLocale] = React.useState(initialLocale);

  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.title = messages[locale].Metadata.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", messages[locale].Metadata.description);
  }, [locale]);

  const value = React.useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone={timeZone}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleController() {
  const context = React.useContext(LocaleContext);
  if (!context) throw new Error("useLocaleController must be used within LocaleProvider");
  return context;
}
