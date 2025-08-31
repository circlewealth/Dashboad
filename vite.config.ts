import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['path', 'fs', 'stream', 'crypto']
    })
  ],
  optimizeDeps: {
    include: ['sqlite3', 'sqlite', 'better-sqlite3'],
  },
  server: {
    fs: {
      allow: ['.', '/Users/aryankumar/Desktop/project 5']
    },
    allowedHosts: [
      'primarily-asin-strategy-oops.trycloudflare.com'
    ]
  }
});
