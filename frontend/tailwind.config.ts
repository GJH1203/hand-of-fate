import type { Config } from "tailwindcss";

/*
 * The Arcane Noir palette, mirrored from the CSS variables in globals.css.
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
          0: "#0A0C16",
          1: "#111527",
          2: "#1A1F36",
          3: "#232946",
        },
        ink: {
          hi: "#EDEEF5",
          mid: "#A9AEC7",
          low: "#767C9E",
        },
        gold: {
          300: "#EBCB7E",
          400: "#D9AE4E",
          500: "#B98D2F",
        },
        arcane: {
          300: "#A08BF0",
          400: "#8468E4",
          500: "#6C4FD1",
        },
        success: "#3DD68C",
        danger: "#F0716F",
        warning: "#E7A13B",
        info: "#56C2E6",

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
        subtle: "rgba(255,255,255,0.08)",
        strong: "rgba(255,255,255,0.16)",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,0.45)",
        "glow-gold": "0 0 0 1px rgba(217,174,78,.4), 0 0 22px rgba(217,174,78,.16)",
        "glow-violet": "0 0 0 1px rgba(132,104,228,.45), 0 0 20px rgba(132,104,228,.20)",
      },
      transitionTimingFunction: {
        arcane: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
