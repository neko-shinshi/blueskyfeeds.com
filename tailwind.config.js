module.exports = {
  content: ['./features/**/*.{js,ts,jsx,tsx}', './pages/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        '2xs': '0.6rem',
      },
      blur: {
        xs: '1px',
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms")
  ]
}