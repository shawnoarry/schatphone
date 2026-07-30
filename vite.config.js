import { realpathSync } from 'node:fs'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const MAPLIBRE_RUNTIME_PACKAGES = [
  '@maplibre',
  'earcut',
  'geojson-vt',
  'gl-matrix',
  'grid-index',
  'kdbush',
  'murmurhash-js',
  'pbf',
  'potpack',
  'quickselect',
  'supercluster',
  'tinyqueue',
  'vt-pbf',
]

const belongsToPackage = (id, packageName) =>
  id.includes(`/node_modules/${packageName}/`)

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue(), tailwindcss()],
  base: '/schatphone/',
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), realpathSync('node_modules')],
    },
  },
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
          const normalizedId = id.replaceAll('\\', '/')
          if (!normalizedId.includes('/node_modules/')) return null
          if (
            belongsToPackage(normalizedId, 'maplibre-gl') ||
            MAPLIBRE_RUNTIME_PACKAGES.some((packageName) =>
              belongsToPackage(normalizedId, packageName),
            )
          ) {
            return 'maplibre'
          }
          if (belongsToPackage(normalizedId, 'leaflet')) return 'leaflet'
          if (normalizedId.includes('@fortawesome')) return 'icons'
          if (normalizedId.includes('marked')) return 'markdown'
          if (
            normalizedId.includes('vue-router') ||
            normalizedId.includes('pinia') ||
            normalizedId.includes('/vue/')
          ) {
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
