/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        lime: {
          DEFAULT: "#A8D84A",
          light: "#E5F0C8",
          dark: "#8FBF2E",
        },
        forest: "#1A2E1A",
        ink: "#0A0A0A",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};