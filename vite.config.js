import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        // 127.0.0.1 evita ambiguidade com ::1/IPv6 no Windows, que às vezes dá ECONNRESET
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})