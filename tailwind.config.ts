import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // Neutral black base — no blue tint.
        bg: "#000000",
        surface: "#121214",
        "surface-2": "#1c1c20",
        border: "#2a2a30",
        muted: "#8c8c94",
        text: "#f4f4f6",
        // Blue is a secondary accent, used sparingly for primary actions.
        accent: "#3b82f6",
        "accent-soft": "#16233d",
        // Semantic accents.
        positive: "#22c55e", // green
        negative: "#ef4444", // red
        warn: "#f59e0b", // orange
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
