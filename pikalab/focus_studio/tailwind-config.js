tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: { sans: ['"M PLUS Rounded 1c"', 'sans-serif'] },
                    colors: {
                        kawaii: {
                            bg: '#fff0f5', primary: '#ff9eb5', primaryDark: '#ff7b9c',
                            secondary: '#ffd1d1', accent: '#cdf0ea', text: '#5e4b52', dark: '#4a3b40',
                        }
                    },
                    animation: {
                        'float': 'float 6s ease-in-out infinite',
                        'bounce-slight': 'bounceSlight 2s infinite',
                    },
                    keyframes: {
                        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
                        bounceSlight: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } }
                    }
                }
            }
        }
