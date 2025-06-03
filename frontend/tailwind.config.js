/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
    theme: {
        extend: {
            colors: {
                blue: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                },
            },
            animation: {
                fadeIn: 'fadeIn 0.5s ease-in-out',
                slideUp: 'slideUp 0.5s ease-in-out',
                slideInRight: 'slideInRight 0.5s ease-in-out',
                slideInLeft: 'slideInLeft 0.5s ease-in-out',
                'pulse-slow': 'pulse 3s infinite',
                'bounce-slow': 'bounce 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(20px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideInLeft: {
                    '0%': { transform: 'translateX(-20px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
            },
            transitionProperty: {
                height: 'height',
                spacing: 'margin, padding',
            },
        },
    },
    plugins: [],
    safelist: ['animate-fadeIn', 'animate-slideUp', 'animate-slideInRight', 'animate-slideInLeft'],
};
