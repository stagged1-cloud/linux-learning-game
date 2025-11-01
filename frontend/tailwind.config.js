/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#1e1e1e',
          text: '#d4d4d4',
          green: '#4ec9b0',
          blue: '#569cd6',
          yellow: '#dcdcaa',
          red: '#f48771',
        }
      }
    },
  },
  plugins: [],
}
