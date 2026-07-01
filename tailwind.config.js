/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        muted: "#8d8d8d",
        subtle: "#b6b6b6",
        line: "#e6e5e2",
        surface: "#f1f0ee",
        surface2: "#e3e2df",
        accent: {
          DEFAULT: "#b15f2c",
          bright: "#cf8047",
          dark: "#97501f",
        },
        hero: { from: "#ecebe9", to: "#c9c9c9" },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Display'",
          "'SF Pro Text'",
          "'Inter'",
          "'Helvetica Neue'",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "'SF Mono'",
          "'JetBrains Mono'",
          "Menlo",
          "monospace",
        ],
      },
      maxWidth: { shell: "88rem" },
      borderRadius: {
        card: "2rem",
        "card-sm": "1.25rem",
        control: "0.875rem",
      },
    },
  },
  plugins: [],
};
