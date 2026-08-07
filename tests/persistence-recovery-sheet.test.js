import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import PersistenceRecoverySheet from '../src/components/PersistenceRecoverySheet.vue'

const createStatus = (patch = {}) => ({
  active: true,
  mode: 'save_failed',
  phase: 'idle',
  incidentCount: 1,
  affectedKeys: ['store:system'],
  primaryCode: 'quota_exceeded',
  retryAvailable: true,
  revision: 1,
  updatedAt: 1,
  ...patch,
})

describe('PersistenceRecoverySheet', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('presents read-only protection and emits the three recovery actions', async () => {
    const wrapper = mount(PersistenceRecoverySheet, {
      props: {
        status: createStatus({ mode: 'read_only', primaryCode: 'read_only_conflict' }),
      },
      global: {
        plugins: [createPinia()],
      },
    })

    expect(wrapper.get('[data-testid="persistence-recovery-sheet"]').attributes('data-mode')).toBe(
      'read_only',
    )
    expect(wrapper.text()).toContain('当前存档已进入只读保护')

    await wrapper.get('[data-testid="persistence-recovery-retry"]').trigger('click')
    await wrapper.get('[data-testid="persistence-recovery-refresh"]').trigger('click')
    await wrapper.get('[data-testid="persistence-recovery-backup"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(wrapper.emitted('refresh')).toHaveLength(1)
    expect(wrapper.emitted('backup')).toHaveLength(1)
  })

  test('disables retry while a retry is already running', () => {
    const wrapper = mount(PersistenceRecoverySheet, {
      props: {
        status: createStatus({ phase: 'retrying' }),
      },
      global: {
        plugins: [createPinia()],
      },
    })

    expect(wrapper.get('[data-testid="persistence-recovery-retry"]').attributes('disabled')).toBe(
      '',
    )
    expect(wrapper.text()).toContain('正在重试')
  })
})
