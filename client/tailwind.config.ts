import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
        },
        accent: {
          500: "#3b82f6",
          600: "#2563eb",
          400: "#60a5fa",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
