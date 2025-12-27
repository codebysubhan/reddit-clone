/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: '#FF4500',
          orangeLight: '#FF5722',
          blue: '#0079D3',
          dark: '#1A1A1B',
          darkLight: '#272729',
          border: '#343536',
          text: '#D7DADC',
          textSecondary: '#818384',
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

