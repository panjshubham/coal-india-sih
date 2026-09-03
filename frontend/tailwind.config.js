/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#152e5a',
          900: '#0f2b5c',
          950: '#0a1d3f',
        },
        cil: {
          amber: '#d97706',
          amberDark: '#b45309',
          emerald: '#059669',
          ruby: '#dc2626',
          blue: '#1e3a8a',
          subtle: '#f8fafc',
          panel: '#ffffff'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace']
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -1px rgba(15, 23, 42, 0.06)',
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
        'elevated': '0 20px 30px -10px rgba(15, 23, 42, 0.12)',
        'glow-amber': '0 0 25px -4px rgba(245, 158, 11, 0.45)',
        'glow-emerald': '0 0 20px -4px rgba(16, 185, 129, 0.35)'
      }
    }
  },
  plugins: [],
}
