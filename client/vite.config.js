import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const buildId = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
})
