import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separar lo que casi nunca cambia: asi el navegador lo reutiliza de cache
        // entre despliegues, en vez de volver a bajar todo el bundle en cada push.
        manualChunks: {
          react: ['react', 'react-dom'],
          iconos: ['lucide-react'],
        },
      },
    },
  },
})
