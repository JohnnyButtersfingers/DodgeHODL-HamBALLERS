/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HamBallers.xyz Design System Colors
        'retro-red': '#FF4B4B',
        'arcade-blue': '#3B82F6', 
        'neon-yellow': '#FFD700',
        'purple-80s': '#A855F7',
        'fresh-green': '#22C55E',
        'cheese-orange': '#FB923C',
        'cloud-white': '#FFFFFF',
        'retro-black': '#18181B',
        'soft-grey': '#E4E4E7',
        
        // Legacy colors for backward compatibility
        'game-primary': '#22C55E', // Fresh Green
        'game-secondary': '#FB923C', // Cheese Orange
        'game-accent': '#3B82F6', // Arcade Blue
        'game-dark': '#18181B', // Retro Black
        'game-darker': '#16213e',
      },
      fontFamily: {
        'game': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // HamBallers Typography System
        'logo': ['20px', { lineHeight: '24px', fontWeight: '700' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'label': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      spacing: {
        // 8px Grid System
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      animation: {
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-in',
        'bounce-gentle': 'bounce 1s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-yellow': '0 0 20px rgba(255, 215, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
