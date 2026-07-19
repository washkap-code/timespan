import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Primitive → semantic tokens (dark-first)
        background: "#0B0B14",
        surface: "#12121E",
        "surface-2": "#1A1A2B",
        border: "#26263A",
        foreground: "#F2F2F8",
        muted: "#9B9BB4",
        primary: { DEFAULT: "#7C3AED", light: "#A78BFA", dark: "#6D28D9" },
        accent: { DEFAULT: "#22D3EE", dark: "#0891B2" },
        destructive: "#EF4444",
        success: "#34D399",
        warning: "#FBBF24",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(124,58,237,0.35)",
        "glow-cyan": "0 0 30px rgba(34,211,238,0.25)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
