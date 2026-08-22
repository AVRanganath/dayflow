import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#714B67',
          hover: '#5B3C53',
          tint: '#F4EEF3',
          'tint-border': '#D6C4D1',
        },
        sidebar: {
          DEFAULT: '#2F1F2B',
        },
        secondary: {
          DEFAULT: '#017E84',
          tint: '#E0F0F1',
          'on-dark': '#8FC9CC',
        },
        accent: {
          DEFAULT: '#F0B93F',
        },
        success: {
          DEFAULT: '#10B981',
          dark: '#065F46',
          tint: '#D1FAE5',
          hover: '#0DA271',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#B45309',
          tint: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#EF4444',
          dark: '#B91C1C',
          tint: '#FEE2E2',
          soft: '#FEF2F2',
          border: '#FECACA',
        },
        background: '#F5F6F7',
        card: '#FFFFFF',
        zebra: '#FAFAFB',
        border: '#DEE2E6',
        hairline: '#EDEFF1',
        text: {
          primary: '#383E45',
          secondary: '#6C757D',
          muted: '#98A0A8',
          disabled: '#CED4DA',
        },
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        card: '4px',
        btn: '4px',
        container: '6px',
        pill: '99px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
        hero: '0 4px 16px rgba(47,31,43,0.25)',
        auth: '0 10px 40px rgba(47,31,43,0.12)',
        modal: '0 20px 60px rgba(0,0,0,0.25)',
        'card-hover': '0 4px 12px rgba(47,31,43,0.1)',
      },
      fontFamily: {
        sans: ['var(--font-roboto)', 'sans-serif'],
        display: ['var(--font-montserrat)', 'sans-serif'],
        marker: ['var(--font-caveat-brush)', 'cursive'],
      },
    },
  },
  plugins: [],
};

export default config;
