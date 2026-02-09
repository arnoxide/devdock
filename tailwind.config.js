/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        dock: {
          bg: 'var(--dock-bg)',
          surface: 'var(--dock-surface)',
          card: 'var(--dock-card)',
          border: 'var(--dock-border)',
          text: 'var(--dock-text)',
          muted: 'var(--dock-muted)',
          accent: 'var(--dock-accent)',
          green: 'var(--dock-green)',
          yellow: 'var(--dock-yellow)',
          red: 'var(--dock-red)',
          purple: 'var(--dock-purple)',
          orange: 'var(--dock-orange)',
          cyan: 'var(--dock-cyan)'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
