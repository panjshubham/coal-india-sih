/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    // Restricting spacing to exactly the requested scale
    spacing: {
      '0': '0px',
      '1': '4px',
      '2': '8px',
      '3': '12px',
      '4': '16px',
      '5': '24px', // Alias to force rhythm
      '6': '24px',
      '7': '32px', // Alias to force rhythm
      '8': '32px',
      '9': '48px', // Alias to force rhythm
      '10': '48px', // Alias to force rhythm
      '11': '48px', // Alias to force rhythm
      '12': '48px',
      '14': '48px', // Alias to force rhythm
      '16': '48px', // Alias to force rhythm
      '20': '48px', // Alias to force rhythm
      px: '1px',
    },
    extend: {
      colors: {
        navy: {
          800: '#152e5a',
          900: '#0B1120', 
          950: '#131B2E', 
        },
        cil: {
          amber: '#F59E0B',
          amberDark: '#b45309',
          emerald: '#4ADE80', 
          warning: '#FBBF24', 
          ruby: '#F87171',    
          blue: '#1e3a8a',
          subtle: '#94A3B8',  
          panel: '#F1F5F9'    
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Fraunces', 'Merriweather', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace']
      },
      borderRadius: {
        DEFAULT: '10px',
        'btn': '8px',
        'pill': '9999px'
      },
      boxShadow: {
        // Replacing all drop shadows with 1px hairline borders (via inset shadows)
        'card': 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'card-hover': 'inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
        'subtle': 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'elevated': 'inset 0 0 0 1px rgba(255, 255, 255, 0.10)',
        'glow-amber': '0 0 15px -4px rgba(245, 158, 11, 0.2)', 
        'glow-emerald': '0 0 15px -4px rgba(74, 222, 128, 0.2)' 
      },
      transitionDuration: {
        DEFAULT: '250ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease',
      }
    }
  },
  plugins: [],
}
