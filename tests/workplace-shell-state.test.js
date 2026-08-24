import { beforeEach, describe, expect, test, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  resetWorkplaceShellStateForTesting,
  useWorkplaceShellState,
  WORKPLACE_FIXTURE_COUNTS,
  normalizeWorkplaceShellState,
} from '../src/composables/useWorkplaceShellState'
import {
  WORKPLACE_ROLE_TEMPLATES,
  WORKPLACE_SHELL_STORAGE_KEY,
  resolveWorkplaceRoleTemplate,
} from '../src/lib/workplace-shell-data'

describe('Organization Workplace S1 preview state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetWorkplaceShellStateForTesting()
    vi.restoreAllMocks()
  })

  test('keeps role templates reusable while the visible fixture defaults to artist', () => {
    expect(Object.keys(WORKPLACE_ROLE_TEMPLATES)).toEqual([
      'artist',
      'manager',
      'assistant',
      'producer',
      'employee',
      'student',
    ])
    expect(resolveWorkplaceRoleTemplate('artist').modules).toContain('call_sheet')
    expect(resolveWorkplaceRoleTemplate('manager').modules).toContain('represented_artists')
    expect(resolveWorkplaceRoleTemplate('student').modules).toContain('assignments')
    expect(resolveWorkplaceRoleTemplate('unknown').id).toBe('artist')
    expect(WORKPLACE_FIXTURE_COUNTS).toEqual({ channels: 2, tasks: 3, proposals: 1 })
  })

  test('persists bounded owner-local interactions without cross-owner records', () => {
    const state = useWorkplaceShellState()
    expect(state.setOrganizationDisplayName('  星河娱乐  ')).toEqual({ ok: true, value: '星河娱乐' })
    expect(state.toggleTask('task-in-ear-check')).toMatchObject({ ok: true, completed: true })
    expect(state.sendMessage('channel-artist-team-1', '我会在四点五十分下楼。')).toMatchObject({ ok: true })
    expect(state.submitStatusReport('ready', '耳返和证件都已装包。')).toMatchObject({ ok: true })
    expect(state.decideProposal('proposal-radio-20260827', 'accepted')).toMatchObject({ ok: true })
    expect(state.submitArtistApplication()).toMatchObject({ ok: true })

    const stored = JSON.parse(localStorage.getItem(WORKPLACE_SHELL_STORAGE_KEY))
    expect(stored.version).toBe(2)
    expect(stored.organizationDisplayName).toBe('星河娱乐')
    expect(stored.completedTaskIds).toEqual(['task-in-ear-check'])
    expect(stored.sentMessages).toHaveLength(1)
    expect(stored.statusReports).toHaveLength(1)
    expect(stored.proposalDecisions).toEqual({ 'proposal-radio-20260827': 'accepted' })
    expect(stored.artistApplication.status).toBe('pending')
    expect(JSON.stringify(stored)).not.toMatch(/calendarEvent|agendaJourney|mapSession|eventInstance|entitlementGranted/)
  })

  test('migrates v1 preview interactions while adding an empty organization display override', () => {
    const migrated = normalizeWorkplaceShellState({
      version: 1,
      completedTaskIds: ['task-in-ear-check'],
      sentMessages: [],
      statusReports: [],
      proposalDecisions: { 'proposal-radio-20260827': 'accepted' },
      artistApplication: null,
    })

    expect(migrated).toMatchObject({
      version: 2,
      organizationDisplayName: '',
      completedTaskIds: ['task-in-ear-check'],
      proposalDecisions: { 'proposal-radio-20260827': 'accepted' },
    })
  })

  test('validates fixtures and refuses empty or unknown writes', () => {
    const state = useWorkplaceShellState()
    expect(state.toggleTask('missing')).toEqual({ ok: false, error: 'task_missing' })
    expect(state.sendMessage('missing', 'hello')).toEqual({ ok: false, error: 'channel_missing' })
    expect(state.sendMessage('channel-artist-team-1', '   ')).toEqual({ ok: false, error: 'message_empty' })
    expect(state.submitStatusReport('imaginary')).toEqual({ ok: false, error: 'status_missing' })
    expect(state.decideProposal('proposal-radio-20260827', 'maybe')).toEqual({ ok: false, error: 'decision_invalid' })
    expect(state.setOrganizationDisplayName('   ')).toEqual({ ok: false, error: 'organization_name_empty' })
  })

  test('does not show success or mutate reactive state when durable preview write fails', () => {
    const state = useWorkplaceShellState()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(state.toggleTask('task-in-ear-check')).toEqual({ ok: false, error: 'write_failed' })
    expect(state.completedTaskIds.value).toEqual([])
    expect(state.sendMessage('channel-artist-team-1', 'not saved')).toEqual({ ok: false, error: 'write_failed' })
    expect(state.sentMessages.value).toEqual([])
  })
})
