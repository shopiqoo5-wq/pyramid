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
               // Basic role switching for tests
               const role = req.url.includes('master') || (req.method === 'POST') ? 'admin' : 'employee';
               // Actually we need to read the body for POST, but vite-plugin-mock-dev-server or similar might be needed for that.
               // Since it's a simple middleware, we can check the URL or just default to admin for now if we want to test admin.
               return res.end(JSON.stringify({ 
                 token: 'mock-jwt', 
                 user: { 
                   name: 'Master Admin', 
                   role: role,
                   email: 'master@pyramidfms.com'
                 } 
               }));
            }
            
            if (req.url.includes('/data/')) {
               // Provide minimal mock data so pages aren't empty
               const sampleData = [
                 { id: '1', name: 'Sample Item 1', status: 'active', createdAt: new Date().toISOString() },
                 { id: '2', name: 'Sample Item 2', status: 'pending', createdAt: new Date().toISOString() }
               ];
               return res.end(JSON.stringify(sampleData));
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
            if (id.includes('zustand')) return 'vendor-core';
            return 'vendor-others';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1500
  }
})

