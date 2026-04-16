import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import '@fortawesome/fontawesome-free/css/all.css'
import { ensurePushServiceWorkerRegistration } from './lib/push'

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

if (typeof window !== 'undefined' && window.isSecureContext === true) {
  void ensurePushServiceWorkerRegistration().catch(() => {
    // Notification subscription is still user-driven in Settings.
  })
}
