import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.BACKEND_URL || 'http://localhost:5000'
  return {
    plugins: [react()],
    server: {
      host: true, // écoute sur 0.0.0.0 (accessible en local et réseau)
      port: 3000,
      // same paths as the nginx reverse proxy in production
      proxy: {
        '/api': { target: backend },
        '/ws': { target: backend, ws: true },
      },
    },
  }
})
