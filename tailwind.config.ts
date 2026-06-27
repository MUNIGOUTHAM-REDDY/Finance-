import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f17",
        surface: "#151b27",
        "surface-2": "#1d2535",
        border: "#27314a",
        muted: "#8b97b0",
        text: "#e7ecf5",
        accent: "#5b8cff",
        "accent-soft": "#1e2c52",
        positive: "#34d399",
        negative: "#f87171",
        warn: "#fbbf24",
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
