import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

let commitHash = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  : 'dev'

try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // git not available (e.g. Vercel build), use env var above
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_HASH__: JSON.stringify(commitHash),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
})
