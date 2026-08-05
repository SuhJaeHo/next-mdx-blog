import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  important: true,
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
        },
        indicator: "hsl(var(--indicator), <alpha-value>)",
      },
      transitionProperty: {
        size: "width, height",
        // Covers the reorder-slide animation (transform) plus hover/selected color changes,
        // deliberately excluding left/top/width/height since those are mutated imperatively
        // on every drag mousemove frame and must not be CSS-animated.
        tab: "transform, background-color, color, border-color",
        // Covers the foreground/background elevation swap (shadow in light mode; background +
        // ring, which is itself box-shadow-based, in dark mode). Same left/top/width/height
        // exclusion as above, since Group's position/size are also mutated imperatively.
        group: "box-shadow, background-color, border-color",
      },
    },
  },
  plugins: [],
};
export default config;
