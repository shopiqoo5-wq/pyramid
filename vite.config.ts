import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    basicSsl(),
    {
      name: 'dev-api-mock',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/api/')) {
            // Mock API Strategy: Simple 200 responses to keep ApiService alive
            res.setHeader('Content-Type', 'application/json');
            
            if (req.url.includes('/auth/login')) {
               return res.end(JSON.stringify({ token: 'mock-jwt', user: { name: 'Field User Sameer', role: 'employee' } }));
            }
            
            if (req.url.includes('/data/')) {
               return res.end(JSON.stringify([])); // Empty success for sync
            }

            res.statusCode = 200;
            return res.end(JSON.stringify({ status: 'ok', mock: true }));
          }
          next();
        });
      }
    }
  ],
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

