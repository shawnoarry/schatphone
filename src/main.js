import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import '@fortawesome/fontawesome-free/css/all.css'

if (typeof window !== 'undefined') {
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
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
