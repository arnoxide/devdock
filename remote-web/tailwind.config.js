/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1117',
        surface: '#1a1d27',
        card: '#242836',
        border: '#2e3348',
        text: '#e4e6f0',
        muted: '#8b8fa3',
        accent: '#3b82f6',
        green: '#22c55e',
        red: '#ef4444',
        yellow: '#eab308',
      }
    }
  },
  plugins: []
}
