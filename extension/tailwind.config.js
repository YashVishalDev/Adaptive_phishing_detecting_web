/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./src/ui/**/*.{html,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0a0e17",
        darkSurface: "#111827",
        darkCard: "#131c2e",
        darkBorder: "#1e293b",
        lightBg: "#f8fafc",
        lightSurface: "#ffffff",
        lightCard: "#ffffff",
        lightBorder: "#e2e8f0",
        accentSafe: "#10b981",
        accentCaution: "#f59e0b",
        accentSuspicious: "#f97316",
        accentDanger: "#ef4444",
        brandCyan: "#06b6d4",
        brandBlue: "#2563eb"
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"]
      }
    },
  },
  plugins: [],
}
