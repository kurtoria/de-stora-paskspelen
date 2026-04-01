import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Jost', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#004631',
        },
        secondary: {
          DEFAULT: '#bdd0a0',
        },
        text: {
          DEFAULT: '#004631', 
          primary: '#004631',
          secondary: '#bdd0a0',
        },
        background: {
          DEFAULT: '#bdd0a0',
        },
        border: {
          DEFAULT: '#004631',
        },
      },
    },
  },
  plugins: [typography],
}
