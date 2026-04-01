import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
const pine = '#004631'
const sage = '#bdd0a0'
const parchment = '#f2ede4'
const sand = '#dce7c9'
const accent = '#d9714d'

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Jost', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: pine,
          soft: sage,
        },
        canvas: {
          DEFAULT: sage,
          soft: sand,
        },
        panel: {
          DEFAULT: parchment,
        },
        accent: {
          DEFAULT: accent,
        },
        line: {
          DEFAULT: pine,
          soft: 'rgb(0 70 49 / 0.18)',
        },
        primary: {
          DEFAULT: pine,
        },
        secondary: {
          DEFAULT: sage,
        },
        text: {
          DEFAULT: pine,
          primary: pine,
          secondary: sage,
        },
        background: {
          DEFAULT: sage,
          soft: sand,
        },
        surface: parchment,
        border: {
          DEFAULT: pine,
          soft: 'rgb(0 70 49 / 0.18)',
        },
      },
      boxShadow: {
        subtle: '0 18px 45px rgb(0 70 49 / 0.12)',
      },
    },
  },
  plugins: [typography],
}
