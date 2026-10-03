/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060D1A',
          900: '#0A192F',
          800: '#0F233D',
          700: '#1A365D',
          600: '#2E5077',
          500: '#47698E',
          100: '#E2E8F0',
          50: '#F8FAFC'
        },
        privacy: {
          900: '#064E3B',
          800: '#065F46',
          700: '#047857',
          600: '#059669',
          500: '#10B981',
          400: '#34D399',
          300: '#6EE7B7',
          200: '#A7F3D0',
          100: '#D1FAE5',
          50: '#ECFDF5'
        },
        slate: {
          850: '#151F30'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Cascadia Code',
          'ui-monospace',
          'monospace'
        ]
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(10, 25, 47, 0.05), 0 1px 2px -1px rgba(10, 25, 47, 0.05)',
        'card': '0 4px 6px -1px rgba(10, 25, 47, 0.04), 0 2px 4px -2px rgba(10, 25, 47, 0.04)',
        'glow-privacy': '0 0 15px -3px rgba(16, 185, 129, 0.25)',
      }
    },
  },
  plugins: [],
}
