import type { Config } from "tailwindcss";

/*
 * The Ember & Ash palette, mirrored from the CSS variables in globals.css.
 *
 * The literals are duplicated rather than pointed at var(--…) on purpose: Tailwind's
 * opacity modifiers (`bg-surface-2/60`) only work on colours it can read the channels
 * of. Hand-written CSS uses the variables; classes use these.
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
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          0: "#0C0B0A",
          1: "#141210",
          2: "#1C1A17",
          3: "#2A2621",
        },
        ink: {
          hi: "#F2EEE7",
          mid: "#A8A29A",
          low: "#7A746C",
        },
        /* The accent, and the colour of your own cards. */
        ember: {
          300: "#F0B268",
          400: "#D98E43",
          500: "#A9662A",
        },
        /* The opponent, and anything purely informational. */
        steel: {
          300: "#8FBBD9",
          400: "#5C93BA",
          500: "#3E6B8C",
        },
        success: "#5FBF8F",
        danger: "#E0645C",
        warning: "#D98E43",
        info: "#5C93BA",

        // shadcn's names, kept so the components that read them still work
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderColor: {
        subtle: "rgba(242,238,231,0.09)",
        strong: "rgba(242,238,231,0.18)",
      },
      borderRadius: {
        xs: "4px",
        sm: "7px",
        md: "11px",
        lg: "16px",
      },
      boxShadow: {
        sm: "0 2px 6px -2px rgba(8,6,4,0.6)",
        card: "0 18px 44px -14px rgba(8,6,4,0.85), 0 2px 8px -3px rgba(8,6,4,0.5)",
        lift: "0 26px 60px -18px rgba(8,6,4,0.9), 0 3px 10px -4px rgba(8,6,4,0.55)",
        "glow-ember": "0 0 0 1px rgba(217,142,67,.45), 0 0 26px -4px rgba(217,142,67,.38)",
        "glow-steel": "0 0 0 1px rgba(92,147,186,.45), 0 0 24px -4px rgba(92,147,186,.32)",
      },
      transitionTimingFunction: {
        /* Decelerating — everything that moves, moves on this. */
        arcane: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        /* Overshoots slightly, for anything that should feel physical. */
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      zIndex: {
        raised: "10",
        sticky: "30",
        overlay: "50",
        toast: "60",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
