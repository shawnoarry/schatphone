import { copyFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

const DEPLOYMENT_BRANDS = new Set(['github', 'vercel', 'cloudflare'])
const DEPLOYMENT_BRAND_FILES = [
  'favicon-32.png',
  'apple-touch-icon.png',
  'pwa-icon-192.png',
  'pwa-icon-512.png',
  'pwa-maskable-512.png',
]

const belongsToPackage = (id, packageName) =>
  id.includes(`/node_modules/${packageName}/`)

const maplibreWorkerRuntimeAssets = {
  name: 'maplibre-worker-runtime-assets',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'assets/maplibre-gl-shared.mjs',
      source: readFileSync(
        realpathSync('node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs'),
      ),
    })
  },
}

const resolveDeploymentBrand = (mode) => {
  const configured = process.env.SCHATPHONE_DEPLOYMENT_BRAND?.trim().toLowerCase()
  if (DEPLOYMENT_BRANDS.has(configured)) return configured
  if (DEPLOYMENT_BRANDS.has(mode)) return mode
  return 'github'
}

const deploymentBrandAssets = (brand) => {
  let resolvedConfig
  return {
    name: 'deployment-brand-assets',
    apply: 'build',
    configResolved(config) {
      resolvedConfig = config
    },
    closeBundle() {
      const sourceDir = resolve(resolvedConfig.publicDir, 'icons', 'brands', brand)
      const targetDir = resolve(
        resolvedConfig.root,
        resolvedConfig.build.outDir,
        'icons',
      )
      mkdirSync(targetDir, { recursive: true })
      for (const filename of DEPLOYMENT_BRAND_FILES) {
        copyFileSync(resolve(sourceDir, filename), resolve(targetDir, filename))
      }
    },
  }
}

const hostedReleaseProof = {
  name: 'hosted-release-proof',
  apply: 'build',
  generateBundle() {
    const commit = process.env.SCHATPHONE_RELEASE_COMMIT?.trim() || 'local'
    this.emitFile({
      type: 'asset',
      fileName: 'release.json',
      source: `${JSON.stringify({ schemaVersion: 1, commit }, null, 2)}\n`,
    })
  },
}

// Stamps the built service worker with the release commit so every deploy
// rotates the cache prefix and forces already-installed PWAs to refresh.
const serviceWorkerVersionStamp = () => {
  let resolvedConfig
  return {
    name: 'service-worker-version-stamp',
    apply: 'build',
    configResolved(config) {
      resolvedConfig = config
    },
    closeBundle() {
      const commit = (
        process.env.SCHATPHONE_RELEASE_COMMIT ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.CF_PAGES_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        ''
      ).trim()
      if (!commit || commit === 'local') return
      const workerPath = resolve(
        resolvedConfig.root,
        resolvedConfig.build.outDir,
        'service-worker.js',
      )
      const source = readFileSync(workerPath, 'utf8')
      const stamped = source.replace(
        /const SERVICE_WORKER_VERSION = '[^']+'/,
        `const SERVICE_WORKER_VERSION = 'schatphone-pwa-${commit}'`,
      )
      if (stamped === source) {
        throw new Error('service-worker.js is missing the SERVICE_WORKER_VERSION constant')
      }
      writeFileSync(workerPath, stamped)
    },
  }
}

const resolveAppBase = () => {
  const configured = process.env.SCHATPHONE_BASE_PATH?.trim()
  if (configured) {
    return `/${configured.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/')
  }
  return process.env.VERCEL ? '/' : '/schatphone/'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    tailwindcss(),
    maplibreWorkerRuntimeAssets,
    deploymentBrandAssets(resolveDeploymentBrand(mode)),
    hostedReleaseProof,
    serviceWorkerVersionStamp(),
  ],
  base: resolveAppBase(),
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
