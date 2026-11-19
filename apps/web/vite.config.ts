import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '')

  return {
    envDir: '../../',
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  }
})
