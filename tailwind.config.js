/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.tsx",
    "./resources/**/*.jsx",
    "./resources/**/*.js",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#080B15",
          800: "#0A0E1A",
          700: "#141C2B",
          600: "#1A2438",
          500: "#1E2A42",
        },
        emerald: {
          500: "#10B981",
          400: "#34D399",
          600: "#059669",
        },
        amber: {
          500: "#F59E0B",
          400: "#FBBF24",
          600: "#D97706",
        },
        gold: "#d4af37",
      },
    },
  },
  plugins: [],
};
