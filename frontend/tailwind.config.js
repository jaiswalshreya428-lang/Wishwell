/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#F8F4EE',
          200: '#EFE8DD',
          300: '#E2D7C7',
        },
        terracotta: {
          50: '#FDF7F5',
          100: '#FAEFEA',
          200: '#F4D8CD',
          500: '#D96547',
          600: '#BF5033',
          700: '#9E3E26',
          800: '#7E3321',
        },
        sage: {
          50: '#F3F6F4',
          100: '#E5ECE7',
          200: '#CDDCCF',
          500: '#4B7A5C',
          600: '#3C634A',
          700: '#2E4E3A',
        },
        ink: {
          900: '#1A1816',
          800: '#2C2825',
          700: '#47423D',
          600: '#68615A',
          500: '#8C847C',
          400: '#B6ACA2',
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgba(28, 25, 23, 0.04)',
        'soft': '0 4px 16px -2px rgba(28, 25, 23, 0.06), 0 2px 6px -1px rgba(28, 25, 23, 0.04)',
        'soft-lg': '0 10px 30px -4px rgba(28, 25, 23, 0.08), 0 4px 10px -2px rgba(28, 25, 23, 0.04)',
      }
    },
  },
  plugins: [],
}
