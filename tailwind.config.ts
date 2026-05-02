import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9f8',
          100: '#d8f0ec',
          500: '#1f8f85',
          600: '#18766d',
        },
      },
    },
  },
  plugins: [],
}

export default config
