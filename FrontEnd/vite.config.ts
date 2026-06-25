import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'https://localhost:7035/api'
  const apiOrigin = apiUrl.replace(/\/api\/?$/, '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      proxy: {
        '/sitemap.xml': {
          target: apiOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
