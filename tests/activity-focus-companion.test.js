import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ActivityFocusCompanion from '../src/components/calendar/ActivityFocusCompanion.vue'

const session = {
  status: 'running',
  completionPolicy: 'duration_sufficient',
  presentation: { minimized: false },
}

const projection = {
  elapsedMs: 10 * 60_000,
  remainingMs: 10 * 60_000,
  progress: 0.5,
  awaitingUserConfirmation: false,
  isTerminal: false,
  canPause: true,
  canResume: false,
  canComplete: false,
}

const eventRecord = {
  status: 'pending',
  titleZh: '留一点恢复缓冲吗？',
  titleEn: 'Add a short recovery buffer?',
  summaryZh: '活动已经过半。',
  summaryEn: 'This activity is halfway through.',
  detailZh: '只调整本次活动计时。',
  detailEn: 'This only adjusts the current activity timer.',
}

describe('Activity Focus Companion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('renders the pending text interaction inline and emits only allowlisted choices', async () => {
    const wrapper = mount(ActivityFocusCompanion, {
      props: { session, projection, eventRecord },
    })

    expect(wrapper.get('[data-testid="activity-session-event-text"]').text()).toContain(
      '留一点恢复缓冲吗？',
    )
    await wrapper.get('[data-testid="activity-session-event-keep-rhythm"]').trigger('click')
    await wrapper.get('[data-testid="activity-session-event-add-buffer"]').trigger('click')
    expect(wrapper.emitted('resolve-event')).toEqual([
      ['keep_rhythm'],
      ['add_recovery_buffer'],
    ])
    expect(wrapper.get('[data-testid="activity-session-pause"]').exists()).toBe(true)
  })

  test('keeps a pending interaction recoverable when the companion is minimized', () => {
    const wrapper = mount(ActivityFocusCompanion, {
      props: {
        session: { ...session, presentation: { minimized: true } },
        projection,
        eventRecord,
      },
    })

    expect(wrapper.text()).toContain('节奏选择待处理')
    expect(wrapper.find('[data-testid="activity-session-event-text"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="activity-session-expand"]').attributes('aria-label')).toBeTruthy()
  })
})
