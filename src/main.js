import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { ensurePushServiceWorkerRegistration } from './lib/push'
import './style.css'

const runAfterFirstPaint = (task) => {
  if (typeof window === 'undefined') return
  window.setTimeout(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(task, { timeout: 2000 })
      return
    }
    task()
  }, 0)
}

const loadDeferredIconStyles = () => {
  void Promise.all([
    import('@fortawesome/fontawesome-free/css/fontawesome.css'),
    import('@fortawesome/fontawesome-free/css/solid.css'),
  ])
}

const registerPushServiceWorker = () => {
  if (typeof window === 'undefined' || window.isSecureContext !== true) return
  void ensurePushServiceWorkerRegistration().catch(() => {
    // Notification subscription is still user-driven in Settings.
  })
}

if (typeof window !== 'undefined') {
  const lockViewportContent =
    'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content'

  const preventGestureZoom = (event) => {
    event.preventDefault()
  }

  document.addEventListener('gesturestart', preventGestureZoom, { passive: false })
  document.addEventListener('gesturechange', preventGestureZoom, { passive: false })
  document.addEventListener('gestureend', preventGestureZoom, { passive: false })

  let lastTouchEndAt = 0
  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now()
      if (now - lastTouchEndAt <= 280) {
        event.preventDefault()
      }
      lastTouchEndAt = now
    },
    { passive: false },
  )

  const viewportMeta = document.querySelector('meta[name="viewport"]')
  if (viewportMeta) {
    viewportMeta.setAttribute('content', lockViewportContent)
    document.addEventListener(
      'focusin',
      () => {
        viewportMeta.setAttribute('content', lockViewportContent)
      },
      { passive: true },
    )
  }
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')

runAfterFirstPaint(loadDeferredIconStyles)
runAfterFirstPaint(registerPushServiceWorker)
