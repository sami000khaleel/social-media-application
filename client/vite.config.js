import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Every request to /api, and the Socket.IO connection, is passed on to the Express server,
// so the browser talks to one address only and the app can use relative URLs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.API_TARGET || 'http://localhost:1000', changeOrigin: true },
      '/socket.io': { target: process.env.API_TARGET || 'http://localhost:1000', changeOrigin: true, ws: true },
    },
  },
})
