import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      manifest: {
        name: 'HamBaller.xyz - DODGE & HODL',
        short_name: 'HamBaller',
        description: 'Web3 DODGE & HODL game on Abstract - Earn DBP tokens by dodging and HODLing!',
        theme_color: '#00ff88',
        background_color: '#1a1a2e',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '32x32',
            type: 'image/x-icon'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      external: ['@safe-globalThis/safe-apps-provider', '@safe-globalThis/safe-apps-sdk'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          web3: ['ethers', 'wagmi', '@rainbow-me/rainbowkit'],
          charts: ['recharts'],
          framer: ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['recharts', 'framer-motion'],
  },
})
