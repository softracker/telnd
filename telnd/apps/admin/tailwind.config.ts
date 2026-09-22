import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#edf8f8',
          100: '#d3efee',
          200: '#a7dfde',
          300: '#6ec8c7',
          400: '#3aadaa',
          500: '#1f8e8c',
          600: '#1a7372',
          700: '#034548',
          800: '#033839',
          900: '#022d2e',
          950: '#011a1b',
        },
        secondary: {
          50: '#e8ecf3',
          100: '#c5cddf',
          200: '#9aabc5',
          300: '#6e89ab',
          400: '#4d6f97',
          500: '#2c5583',
          600: '#1e3f66',
          700: '#162f4d',
          800: '#0B1B2F',
          900: '#081524',
          950: '#040a12',
        },
        accent: {
          50: '#eefafa',
          100: '#d4f2f1',
          200: '#a8e5e3',
          300: '#70d3cf',
          400: '#3bc5c0',
          500: '#30A9A2',
          600: '#268a84',
          700: '#1f6e6a',
          800: '#185553',
          900: '#113d3c',
          950: '#092423',
        },
        orange: {
          50: '#fff4ed',
          100: '#ffe5d3',
          200: '#ffc7a6',
          300: '#ffa16e',
          400: '#FE793F',
          500: '#f5601a',
          600: '#d94a0e',
          700: '#b3380b',
          800: '#8d2d0c',
          900: '#6b220d',
          950: '#3a1005',
        },
        brand: {
          bg: '#F9F6F0',
          light: '#F1F5F9',
          dark: '#1F2937',
          gray: '#64748B',
          'gray-light': '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
