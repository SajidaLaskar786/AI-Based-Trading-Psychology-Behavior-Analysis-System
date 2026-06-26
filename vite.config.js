import { defineConfig } from 'vite';

export default defineConfig({
  // Optimize deps
  optimizeDeps: {
    include: ['chart.js', 'xlsx'],
    entries: ['index.html', 'src/main.js'],
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    },
    watch: {
      ignored: [
        '**/.venv/**',
        '**/__pycache__/**',
        '**/data/**',
        '**/models/**',
        '**/routers/**',
        '**/routes/**',
        '**/services/**',
        '**/sample_data/**',
        '**/temp/**',
        '**/tests/**',
        '**/*.py',
        '**/*.pyc',
        '**/*.pkl',
        '**/*.xlsx',
        '**/*.xls',
        '**/*.csv',
        // Ignore python directories inside src
        '**/src/analysis/**',
        '**/src/clustering/**',
        '**/src/explainability/**',
        '**/src/feature_engineering/**',
        '**/src/inference/**',
        '**/src/models/**',
        '**/src/recommendations/**',
        '**/src/reporting/**',
        '**/src/services/**',
        '**/src/temp/**',
        '**/src/tests/**',
        '**/src/utils/**'
      ]
    }
  }
});
