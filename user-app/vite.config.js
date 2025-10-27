import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // 确保 React/ReactDOM 在页面中只有一份，避免 Invalid hook call
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, '/api')
      },
      // Proxy admin plans to avoid CORS in dev
      '/admin-plans': {
        target: 'http://localhost:5177',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/admin-plans/, '/api/admin/plans')
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd-mobile'],
          router: ['react-router-dom'],
          i18n: ['react-i18next', 'i18next']
        }
      }
    }
  }
})
