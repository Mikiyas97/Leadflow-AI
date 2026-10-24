/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#f95721',
          'orange-hover': '#ea4710',
          'orange-subtle': '#2a130c',
          dark: '#09090b',
          'card': '#141416',
          'card-hover': '#1a1a1d',
          'border': '#27272a',
          'border-subtle': '#1e1e21',
          muted: '#71717a',
          secondary: '#a1a1aa'
        },
      },
    },
  },
  plugins: [],
}
