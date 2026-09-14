import type { Config } from "tailwindcss";

/*
 * "The Table" — mirrored from the CSS custom properties in globals.css.
 *
 * The literals are duplicated rather than pointed at var(--…) on purpose:
 * Tailwind's opacity modifiers (`bg-paper-sunk/60`) only work on colours it can
 * read the channels of. Hand-written CSS uses the variables; classes use these.
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
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        /* The furniture. Three values, because it must never compete with the sheet. */
        table: { DEFAULT: "#2A1A10", deep: "#140C07", edge: "#0B0603" },
        /* The stock, at four depths. */
        paper: { raised: "#F2EBDC", DEFAULT: "#EDE4D2", sunk: "#E8E0CF", deep: "#DCD2BC" },
        /* The key plate, one lampblack at four densities. */
        ink: { DEFAULT: "#1A1614", 2: "#48423C", 3: "#645D55", 4: "#7D766B" },
        /* Plate one — you. */
        verm: { DEFAULT: "#C4351F", text: "#B1301C", deep: "#7E2214" },
        /* Plate two — them. One value; a press has one can of each ink. */
        prus: "#2A4A7A",
        /* Attention. Fill and rule only, never text. */
        ochre: "#9A6E23",
        /* The two legal lighter edges. */
        rule: { ghost: "#B5AC9C", min: "#8C8271" },

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
       * Every stock radius name maps to 0, so an unthinking `rounded-md` habit
       * produces a square corner rather than silently reintroducing 11px. The
       * single exception is the die-cut card edge.
       */
      borderRadius: {
        none: "0",
        DEFAULT: "0",
        xs: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        full: "0",
        card: "2px",
      },
      borderWidth: {
        hair: "0.75px",
        rule: "1.5px",
        heavy: "3px",
      },
      /*
       * Deleted entirely. The one shadow in this design is the sheet's cast on
       * the table, written by hand in `.sheet`. There is no shadow scale
       * because there is no second shadow.
       */
      boxShadow: {},
      transitionTimingFunction: {
        settle: "cubic-bezier(0.2, 0.9, 0.25, 1)",
      },
      transitionDuration: {
        ink: "90ms",
        move: "260ms",
      },
      zIndex: { raised: "10", sticky: "30", overlay: "50", toast: "60" },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
