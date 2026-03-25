import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('router')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('lucide') || id.includes('react-icons')) return 'vendor-icons';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('html2canvas')) return 'vendor-pdf-engine';
            if (id.includes('html5-qrcode') || id.includes('qrcode.react')) return 'vendor-scanner';
            if (id.includes('supabase') || id.includes('zustand')) return 'vendor-core';
            return 'vendor-others';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1500
  }
})

