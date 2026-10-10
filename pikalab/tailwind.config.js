module.exports = {
    darkMode: 'class',
    content: [
        './**/*.html',
        './**/*.js',
        './**/*.ts',
        './js/app-data.json',
        '!./node_modules/**/*',
        '!./dist/**/*'
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Hiragino Kaku Gothic ProN"', '"Yu Gothic UI"', 'Meiryo', 'sans-serif'],
                pop: ['"M PLUS Rounded 1c"', 'sans-serif'],
                serif: ['"Shippori Mincho"', 'serif']
            },
            colors: {
                reader: {
                    bg: '#f0fdfa',
                    primary: '#0d9488'
                },
                science: {
                    50: '#F1F8E9', 100: '#DCEDC8', 200: '#C5E1A5', 300: '#AED581', 
                    400: '#9CCC65', 500: '#8BC34A', 600: '#7CB342', 700: '#689F38', 
                    800: '#558B2F', 900: '#33691E'
                },
                lab: {
                    blue: '#42A5F5', yellow: '#FFEE58', red: '#EF5350', purple: '#AB47BC'
                },
                ocean: {
                    surf: '#4FC3F7',
                    twilight: '#0288D1',
                    midnight: '#01579B',
                    abyss: '#002137',
                    hadal: '#000510'
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'bounce-slow': 'bounce 3s infinite',
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 3s infinite',
                'pulse-slow': 'pulse 3s infinite',
                'pop': 'pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                'shine': 'shine 3s infinite',
                'jelly': 'jelly 0.5s'
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' }
                },
                pop: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' }
                },
                shine: {
                    '0%': { left: '-100%' },
                    '100%': { left: '100%' }
                },
                jelly: {
                    '0%, 100%': { transform: 'scale(1, 1)' },
                    '30%': { transform: 'scale(1.25, 0.75)' },
                    '40%': { transform: 'scale(0.75, 1.25)' },
                    '50%': { transform: 'scale(1.15, 0.85)' },
                    '65%': { transform: 'scale(0.95, 1.05)' },
                    '75%': { transform: 'scale(1.05, 0.95)' }
                }
            },
            boxShadow: {
                soft: '0 10px 25px rgba(13, 148, 136, 0.18)',
                'inner-soft': 'inset 0 2px 6px rgba(15, 23, 42, 0.08)'
            }
        }
    }
};
