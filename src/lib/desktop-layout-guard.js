// Detects when the browser ignores the mobile viewport meta tag (for example
// Chrome's "Desktop site" mode on Android, which already-installed PWA
// shortcuts inherit) and surfaces a dismissible recovery hint. A page cannot
// override that mode by itself, so the best in-app defense is detection plus
// clear user guidance.

const DESKTOP_LAYOUT_MIN_WIDTH = 700
const DESKTOP_LAYOUT_WIDTH_RATIO = 1.25

export const DESKTOP_LAYOUT_HINT_DISMISS_KEY = 'schatphone:desktop-layout-hint-dismissed'
export const DESKTOP_LAYOUT_HINT_ELEMENT_ID = 'desktop-layout-hint'

const HINT_COPY = {
  zh: {
    title: '检测到「桌面版网站」模式',
    body: '页面正按桌面宽度渲染，字体图标会变小、双指可缩放。请在浏览器菜单中关闭「桌面版网站」后刷新，即可恢复手机界面。',
    dismiss: '知道了',
  },
  en: {
    title: 'Desktop site mode detected',
    body: 'This page is rendering at desktop width, so text looks small and pinch zoom works. Turn off "Desktop site" in the browser menu and reload to restore the phone layout.',
    dismiss: 'Got it',
  },
}

export const detectForcedDesktopLayout = ({ innerWidth, screenWidth, touchFirst }) => {
  if (touchFirst !== true) return false
  if (!Number.isFinite(innerWidth) || !Number.isFinite(screenWidth) || screenWidth <= 0) {
    return false
  }
  return (
    innerWidth >= DESKTOP_LAYOUT_MIN_WIDTH && innerWidth > screenWidth * DESKTOP_LAYOUT_WIDTH_RATIO
  )
}

const isTouchFirstDevice = (targetWindow) => {
  if (Number(targetWindow.navigator?.maxTouchPoints) > 0) return true
  if (typeof targetWindow.matchMedia !== 'function') return false
  try {
    return targetWindow.matchMedia('(pointer: coarse)').matches === true
  } catch {
    return false
  }
}

const readDismissed = (targetWindow) => {
  try {
    return targetWindow.localStorage?.getItem(DESKTOP_LAYOUT_HINT_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

const persistDismissed = (targetWindow) => {
  try {
    targetWindow.localStorage?.setItem(DESKTOP_LAYOUT_HINT_DISMISS_KEY, '1')
  } catch {
    // Storage can be unavailable (private mode); the hint simply reappears next launch.
  }
}

const resolveCopy = (targetWindow) => {
  const language = String(targetWindow.navigator?.language || '').toLowerCase()
  return language.startsWith('zh') ? HINT_COPY.zh : HINT_COPY.en
}

const removeHint = (targetWindow) => {
  targetWindow.document.getElementById(DESKTOP_LAYOUT_HINT_ELEMENT_ID)?.remove()
}

const showHint = (targetWindow) => {
  const { document } = targetWindow
  if (!document?.body || document.getElementById(DESKTOP_LAYOUT_HINT_ELEMENT_ID)) return
  const copy = resolveCopy(targetWindow)

  const hint = document.createElement('div')
  hint.id = DESKTOP_LAYOUT_HINT_ELEMENT_ID
  hint.setAttribute('data-testid', DESKTOP_LAYOUT_HINT_ELEMENT_ID)
  hint.setAttribute('role', 'alert')
  hint.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:16px',
    'transform:translateX(-50%)',
    'width:min(480px, calc(100% - 32px))',
    'z-index:2147483647',
    'background:#111827',
    'color:#f9fafb',
    'border:1px solid rgba(255,255,255,0.16)',
    'border-radius:12px',
    'padding:12px 14px',
    'box-shadow:0 12px 32px rgba(0,0,0,0.45)',
    'font-family:-apple-system,"Segoe UI",system-ui,sans-serif',
    'font-size:13px',
    'line-height:1.5',
  ].join(';')

  const title = document.createElement('strong')
  title.textContent = copy.title
  title.style.cssText = 'display:block;font-size:14px;margin-bottom:4px'

  const body = document.createElement('p')
  body.textContent = copy.body
  body.style.cssText = 'margin:0 0 10px'

  const dismiss = document.createElement('button')
  dismiss.type = 'button'
  dismiss.textContent = copy.dismiss
  dismiss.style.cssText = [
    'border:0',
    'border-radius:8px',
    'padding:6px 14px',
    'background:#f9fafb',
    'color:#111827',
    'font-size:13px',
    'font-weight:600',
    'cursor:pointer',
  ].join(';')
  dismiss.addEventListener('click', () => {
    persistDismissed(targetWindow)
    removeHint(targetWindow)
  })

  hint.append(title, body, dismiss)
  document.body.appendChild(hint)
}

export const startDesktopLayoutGuard = (targetWindow = window) => {
  if (!targetWindow?.document || readDismissed(targetWindow)) return () => {}

  const evaluate = () => {
    if (readDismissed(targetWindow)) {
      removeHint(targetWindow)
      return
    }
    const forcedDesktopLayout = detectForcedDesktopLayout({
      innerWidth: targetWindow.innerWidth,
      screenWidth: targetWindow.screen?.width,
      touchFirst: isTouchFirstDevice(targetWindow),
    })
    if (forcedDesktopLayout) {
      showHint(targetWindow)
    } else {
      removeHint(targetWindow)
    }
  }

  evaluate()
  targetWindow.addEventListener('resize', evaluate, { passive: true })
  targetWindow.addEventListener('orientationchange', evaluate, { passive: true })

  return () => {
    targetWindow.removeEventListener('resize', evaluate)
    targetWindow.removeEventListener('orientationchange', evaluate)
    removeHint(targetWindow)
  }
}
