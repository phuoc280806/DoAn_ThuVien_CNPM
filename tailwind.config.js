/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A365D',
        primary: {
          DEFAULT: '#2B6CB0',
          soft: '#E8F2F8',
          light: '#7BA7C7',
        },
        sub: '#4A5568',
        success: '#276749',
        danger: '#C53030',
        warn: '#975A16',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
