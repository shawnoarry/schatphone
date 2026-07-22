import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue(), tailwindcss()],
  base: '/schatphone/',
  define:
    mode === 'test'
      ? {
          'import.meta.env.VITE_API_URL': JSON.stringify(
            'https://generativelanguage.googleapis.com/v1beta/models',
          ),
          'import.meta.env.VITE_API_KEY': JSON.stringify('env-key-123'),
          'import.meta.env.VITE_API_MODEL': JSON.stringify('gemini-2.5-flash'),
        }
      : {},
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return null
          if (id.includes('@fortawesome')) return 'icons'
          if (id.includes('marked')) return 'markdown'
          if (id.includes('vue-router') || id.includes('pinia') || id.includes('/vue/')) {
            return 'framework'
          }
          return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      'e2e/**',
    ],
  },
}))
