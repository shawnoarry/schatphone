import { beforeEach, describe, expect, test } from 'vitest'
import {
  DESKTOP_LAYOUT_HINT_DISMISS_KEY,
  DESKTOP_LAYOUT_HINT_ELEMENT_ID,
  detectForcedDesktopLayout,
  startDesktopLayoutGuard,
} from '../src/lib/desktop-layout-guard'

const setViewport = ({ innerWidth, screenWidth, maxTouchPoints }) => {
  Object.defineProperty(window, 'innerWidth', {
    value: innerWidth,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(window.screen, 'width', { value: screenWidth, configurable: true })
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  })
}

const hintElement = () => document.getElementById(DESKTOP_LAYOUT_HINT_ELEMENT_ID)

describe('detectForcedDesktopLayout', () => {
  test('flags a touch device rendered far wider than its screen', () => {
    expect(
      detectForcedDesktopLayout({ innerWidth: 980, screenWidth: 393, touchFirst: true }),
    ).toBe(true)
  })

  test('ignores a normal phone viewport', () => {
    expect(
      detectForcedDesktopLayout({ innerWidth: 393, screenWidth: 393, touchFirst: true }),
    ).toBe(false)
  })

  test('ignores touch-less desktop monitors', () => {
    expect(
      detectForcedDesktopLayout({ innerWidth: 1440, screenWidth: 1440, touchFirst: false }),
    ).toBe(false)
  })

  test('ignores tablets whose layout width matches the screen', () => {
    expect(
      detectForcedDesktopLayout({ innerWidth: 820, screenWidth: 820, touchFirst: true }),
    ).toBe(false)
  })

  test('ignores touch laptops with slightly undersized windows', () => {
    expect(
      detectForcedDesktopLayout({ innerWidth: 1200, screenWidth: 1440, touchFirst: true }),
    ).toBe(false)
  })

  test('rejects invalid measurements', () => {
    expect(
      detectForcedDesktopLayout({ innerWidth: Number.NaN, screenWidth: 393, touchFirst: true }),
    ).toBe(false)
    expect(
      detectForcedDesktopLayout({ innerWidth: 980, screenWidth: 0, touchFirst: true }),
    ).toBe(false)
  })
})

describe('startDesktopLayoutGuard', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    setViewport({ innerWidth: 393, screenWidth: 393, maxTouchPoints: 5 })
  })

  test('stays hidden on a normal phone viewport', () => {
    startDesktopLayoutGuard()
    expect(hintElement()).toBeNull()
  })

  test('shows an alert hint when the layout viewport is forced to desktop width', () => {
    setViewport({ innerWidth: 980, screenWidth: 393, maxTouchPoints: 5 })
    startDesktopLayoutGuard()
    expect(hintElement()).not.toBeNull()
    expect(hintElement().getAttribute('role')).toBe('alert')
  })

  test('stays hidden on touch-less devices even with a wide layout', () => {
    setViewport({ innerWidth: 980, screenWidth: 393, maxTouchPoints: 0 })
    startDesktopLayoutGuard()
    expect(hintElement()).toBeNull()
  })

  test('reacts to resize into and out of the forced desktop layout', () => {
    startDesktopLayoutGuard()
    expect(hintElement()).toBeNull()

    setViewport({ innerWidth: 980, screenWidth: 393, maxTouchPoints: 5 })
    window.dispatchEvent(new Event('resize'))
    expect(hintElement()).not.toBeNull()

    setViewport({ innerWidth: 393, screenWidth: 393, maxTouchPoints: 5 })
    window.dispatchEvent(new Event('resize'))
    expect(hintElement()).toBeNull()
  })

  test('dismissal persists and suppresses future hints', () => {
    setViewport({ innerWidth: 980, screenWidth: 393, maxTouchPoints: 5 })
    startDesktopLayoutGuard()
    hintElement().querySelector('button').click()

    expect(hintElement()).toBeNull()
    expect(localStorage.getItem(DESKTOP_LAYOUT_HINT_DISMISS_KEY)).toBe('1')

    startDesktopLayoutGuard()
    window.dispatchEvent(new Event('resize'))
    expect(hintElement()).toBeNull()
  })

  test('uses Chinese copy for zh locales', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'zh-CN', configurable: true })
    setViewport({ innerWidth: 980, screenWidth: 393, maxTouchPoints: 5 })
    startDesktopLayoutGuard()
    expect(hintElement().textContent).toContain('桌面版网站')
  })
})
