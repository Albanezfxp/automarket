import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React/React Router raramente mudam entre deploys — separá-los do
        // código do app evita que o navegador rebaixe esse chunk toda vez
        // que só uma página/feature muda.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router-dom)\//.test(id)) {
            return 'vendor';
          }
        },
      },
    },
  },
})
