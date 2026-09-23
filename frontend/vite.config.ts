import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Defaults to the local backend. Set VITE_PROXY_TARGET=https://api.fingle.club to
  // point the dev UI at production instead (reads and writes real data).
  const target = loadEnv(mode, process.cwd(), '').VITE_PROXY_TARGET ?? 'http://localhost:3001'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true, secure: false },
      },
    },
  }
})
