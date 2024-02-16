/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        text_color: '#E7E7F3',
        background: '#080811',
        secondary: '#111124',
        accent: '#3E3EA8',
        outline: '#2A2A47',
        btn_primary: '#A1A1F7',
        btn_secondary: '#1A1A3E',
        btn_pressed: '#232340',
        btn_unclickable: '#13132A',
        red: '#CF3A4B',
        green: '#56E08D'
      },
    },
  },
  plugins: [],
}

