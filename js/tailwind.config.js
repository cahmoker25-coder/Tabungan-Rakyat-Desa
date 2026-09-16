tailwind.config = {
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#0a0a0a',
                    800: '#111827',
                    700: '#1f2937',
                    600: '#374151',
                },
                brand: {
                    gold: '#FFD700',
                    cyan: '#06b6d4',
                    purple: '#8b5cf6',
                    green: '#10b981',
                    red: '#ef4444',
                }
            },
            fontFamily: {
                display: ['Orbitron', 'sans-serif'],
                body: ['Rajdhani', 'sans-serif'],
            },
            animation: {
                'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'marquee': 'marquee 25s linear infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(-100%)' },
                }
            }
        }
    }
}
