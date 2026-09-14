import type { Config } from "tailwindcss";

/*
 * "The Firmament" — mirrored from the CSS custom properties in globals.css.
 *
 * The literals are duplicated rather than pointed at var(--…) on purpose:
 * Tailwind's opacity modifiers (`bg-night-2/60`) only work on colours it can read
 * the channels of. Hand-written CSS uses the variables; classes use these.
 */
export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        /* Marcellus — Roman inscriptional capitals. One weight, because carved
           letters have one weight. Titles, labels, controls. */
        display: ["var(--font-display)", "Georgia", "serif"],
        /* Spectral — a serif cut for screens, and the only thing that sets a
           number. Body, prose, every tally and every power value. */
        text: ["var(--font-text)", "Georgia", "serif"],
      },
      colors: {
        night: { 0: "#080B16", DEFAULT: "#0E1326", 1: "#0E1326", 2: "#161C33", 3: "#212943" },
        /* SOL — the light, and you. */
        gold: { lit: "#F5E3AE", DEFAULT: "#D4AF57", ground: "#C9A63E", deep: "#8F6E28" },
        /* LUNA — them. */
        luna: { lit: "#E8EEF9", DEFAULT: "#B9C7DF", deep: "#6C7D9B" },
        lapis: "#3554B8",
        /* Rubrication only. An index, never an emotion. */
        cinnabar: "#D4574A",
        parchment: { DEFAULT: "#EFE8D6", 2: "#BDB8A8", 3: "#8C8878", 4: "#63604F" },
        /* The only colour permitted on the gilded ground. */
        "ink-gold": "#1A1408",

        // shadcn's names, kept so the components that read them still work
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      /*
       * There are no corner radii in this design, there are ARCHES. Every stock
       * radius name maps to 0 so an unthinking `rounded-md` produces a square
       * corner rather than silently reintroducing a 6px bubble; `rounded-arch`
       * is the semicircular head everything that frames something takes.
       */
      borderRadius: {
        none: "0",
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        full: "0",
        arch: "50% 50% 0 0 / 22% 22% 0 0",
        "arch-deep": "50% 50% 0 0 / 40% 40% 0 0",
      },
      borderWidth: {
        hair: "1px",
        rule: "2px",
        heavy: "4px",
      },
      /*
       * Deleted. Depth here is a gilt frame and an aureole of drawn rings, never
       * a blurred drop shadow — an icon's halo is a circle of gold, not a light
       * source, and that is the whole difference between this and a neon UI.
       */
      boxShadow: {},
      transitionTimingFunction: { rise: "cubic-bezier(0.16, 0.84, 0.28, 1)" },
      transitionDuration: { lume: "140ms", move: "420ms" },
      zIndex: { raised: "10", sticky: "30", overlay: "50", toast: "60" },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
