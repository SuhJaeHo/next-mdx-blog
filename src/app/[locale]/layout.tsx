import type { Metadata } from "next";
import { Andika, IBM_Plex_Sans_JP, IBM_Plex_Sans_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@app/provider/theme-provider";
import { routing, type Locale } from "@/i18n/routing";
import { LocaleProvider } from "./locale-provider";
import "../globals.css";

const ibmPlexSansKR = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-mdx-ko",
});

const ibmPlexSansJP = IBM_Plex_Sans_JP({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-mdx-ja",
});

const andika = Andika({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-mdx-latin",
});

interface ILocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<ILocaleLayoutProps, "params">): Promise<Metadata> {
  if (!hasLocale(routing.locales, params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: ILocaleLayoutProps) {
  if (!hasLocale(routing.locales, params.locale)) notFound();

  setRequestLocale(params.locale);
  return (
    <html lang={params.locale} suppressHydrationWarning>
      <body className={`${andika.variable} ${ibmPlexSansKR.variable} ${ibmPlexSansJP.variable}`}>
        <LocaleProvider initialLocale={params.locale as Locale}>
          <ThemeProvider attribute="class">
            {children}
            <Analytics />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
