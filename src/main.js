import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { ensurePushServiceWorkerRegistration } from './lib/push'
import { preparePersistedStateLayers } from './lib/persistence'
import { PERSISTED_STATE_AUDIT_TARGETS } from './lib/persistence-owner-inventory'
import {
  closeCurrentSaveWriter,
  initializeCurrentSaveWriter,
} from './lib/current-save-write-runtime'
import { recoverPendingBackupRestores } from './lib/backup-restore-runtime'
import { startDesktopLayoutGuard } from './lib/desktop-layout-guard'
import './style.css'

let currentSaveWriteAccess = null
if (typeof window !== 'undefined') {
  currentSaveWriteAccess = await initializeCurrentSaveWriter()
  window.addEventListener(
    'pagehide',
    () => {
      void closeCurrentSaveWriter()
    },
  )
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) void initializeCurrentSaveWriter()
  })
  const persistenceBootstrapTargets = PERSISTED_STATE_AUDIT_TARGETS.map((target) => ({
    ...target,
    inspectOnly: target.key === 'store:book' || currentSaveWriteAccess.ok !== true,
  }))
  await preparePersistedStateLayers(persistenceBootstrapTargets)
}

const pinia = createPinia()
let scheduleRuntimesReady = false
if (typeof window !== 'undefined' && currentSaveWriteAccess?.ok === true) {
  const recovery = await recoverPendingBackupRestores({ pinia })
  if (!recovery.ok) {
    await closeCurrentSaveWriter()
  } else {
    scheduleRuntimesReady = true
  }
}

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

const registerScheduleRuntimes = () => {
  if (!scheduleRuntimesReady || import.meta.env.MODE === 'test') return
  void Promise.all([
    import('./lib/schedule-orchestrator-runtime'),
    import('./lib/agenda-journey-runtime'),
    import('./lib/activity-session-runtime'),
  ]).then(([scheduleModule, agendaModule, activitySessionModule]) => {
    scheduleModule.startScheduleOrchestratorRuntime({ pinia })
    agendaModule.startAgendaJourneyRuntime({ pinia })
    activitySessionModule.startActivitySessionRuntime({ pinia })
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

  startDesktopLayoutGuard()
}

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')

runAfterFirstPaint(loadDeferredIconStyles)
runAfterFirstPaint(registerPushServiceWorker)
runAfterFirstPaint(registerScheduleRuntimes)
