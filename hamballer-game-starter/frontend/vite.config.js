import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      external: ['@safe-globalThis/safe-apps-provider', '@safe-globalThis/safe-apps-sdk']
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
  }
})
