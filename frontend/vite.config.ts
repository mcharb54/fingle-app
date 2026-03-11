import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.fingle.club',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://api.fingle.club',
        ws: true,
        secure: false,
      },
    },
  },
})
