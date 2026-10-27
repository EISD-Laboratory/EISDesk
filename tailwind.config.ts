import type { Config } from 'tailwindcss'

// Token disamakan dengan WEB-EISD/tailwind.config.ts
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#494CA0',
          dark: '#3A3D80',
          light: '#6366B8',
        },
        accent: {
          pink: '#FDE2E4',
          green: '#00D97A',
        },
        plum: '#1C1629',
      },
      boxShadow: {
        soft: '0 2px 15px rgba(0, 0, 0, 0.05)',
        card: '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
      keyframes: {
        'bounce-soft': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
      },
      animation: {
        'bounce-soft': 'bounce-soft 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
