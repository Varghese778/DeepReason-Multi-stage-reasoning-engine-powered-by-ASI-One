/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1F4E79',
        'mid-blue': '#2E75B6',
        'light-blue': '#EBF3FA',
        'conf-green': '#375623',
        'conf-amber': '#7F6000',
        'conf-red': '#833C00',
      },
    },
  },
  plugins: [],
}
