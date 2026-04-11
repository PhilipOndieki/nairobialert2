/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#0a7e6e',
          dark:    '#075c50',
          light:   '#e6f5f3',
          mid:     '#b2ddd8',
        },
        red: {
          DEFAULT: '#c0392b',
          light:   '#fdecea',
        },
        amber: {
          DEFAULT: '#d4780a',
          light:   '#fef3e2',
        },
        green: {
          DEFAULT: '#1a7a4a',
          light:   '#e8f5ee',
        },
        bg:     '#f7f5f2',
        border: {
          DEFAULT: '#e4e0da',
          dark:    '#c8c3bb',
        },
        text: {
          DEFAULT: '#1c1a17',
          mid:     '#5a5650',
          dim:     '#9a9590',
        },
      },
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 3px 0 rgba(28,26,23,0.08), 0 1px 2px -1px rgba(28,26,23,0.06)',
        md: '0 4px 6px -1px rgba(28,26,23,0.08), 0 2px 4px -2px rgba(28,26,23,0.06)',
        lg: '0 10px 15px -3px rgba(28,26,23,0.08), 0 4px 6px -4px rgba(28,26,23,0.06)',
      },
      borderRadius: {
        radius:    '10px',
        'radius-lg': '16px',
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'display-md': ['1.75rem', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
};
