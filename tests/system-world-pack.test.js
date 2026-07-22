import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system world pack store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T15:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('lists built-in world packs and keeps default active', () => {
    const store = useSystemStore()

    expect(store.listWorldPacks().map((pack) => pack.id)).toEqual(
      expect.arrayContaining([
        'default_world',
        'fandom_parallel',
        'modern_parallel',
        'survival_city',
        'school_life',
        'business_family',
        'urban_mystery',
      ]),
    )
    expect(store.getActiveWorldPack()).toMatchObject({
      id: 'default_world',
      state: 'active',
    })
  })

  test('builds review and activates a built-in world pack', () => {
    const store = useSystemStore()
    const review = store.buildWorldPackActivationReview('survival_city')

    expect(review).toMatchObject({
      packId: 'survival_city',
      blocked: false,
      summary: {
        appBindingCount: 3,
        serviceTemplateCount: 1,
      },
    })

    const result = store.activateWorldPack('survival_city')

    expect(result.ok).toBe(true)
    expect(store.user.activeWorldPackId).toBe('survival_city')
    expect(store.getActiveWorldPack()).toMatchObject({
      id: 'survival_city',
      state: 'active',
    })
    expect(store.user.worldPackActivation).toMatchObject({
      activePackId: 'survival_city',
      state: 'active',
      reviewedAt: 1780066800000,
      activatedAt: 1780066800000,
    })
  })

  test('stores world profile analysis and recommends compatible packs', () => {
    const store = useSystemStore()

    store.setWorldProfileAnalysis({
      era: 'modern',
      settingTraits: ['school'],
      realism: 'realistic',
      socialRoles: ['student'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'high',
      evidence: ['campus setting'],
    })

    const review = store.buildWorldPackRecommendationReview()

    expect(store.user.worldProfileAnalysis).toMatchObject({
      era: 'modern',
      settingTraits: ['school'],
      confidence: 'high',
    })
    expect(review.grouped.recommended.map((item) => item.packId)).toContain('school_life')
    expect(review.grouped.adaptable.map((item) => item.packId)).toContain('business_family')
    expect(review.grouped.unsupported.every((item) => item.enableable === false)).toBe(true)
  })

  test('enables and disables multiple compatible world packs without auto-joining services', () => {
    const store = useSystemStore()

    const school = store.enableWorldPack('school_life')
    const business = store.enableWorldPack('business_family')

    expect(school.ok).toBe(true)
    expect(business.ok).toBe(true)
    expect(store.user.enabledWorldPackIds).toEqual(['school_life', 'business_family'])
    expect(store.listEnabledWorldPacks().map((pack) => pack.id)).toEqual(['school_life', 'business_family'])
    expect(store.user.worldPackEnablements.school_life.reviewSnapshot.summary.appBindingCount).toBeGreaterThan(0)

    const disabled = store.disableWorldPack('school_life')

    expect(disabled.ok).toBe(true)
    expect(store.user.enabledWorldPackIds).toEqual(['business_family'])
    expect(store.listEnabledWorldPacks().map((pack) => pack.id)).toEqual(['business_family'])
  })

  test('legacy activateWorldPack remains a single-pack path and seeds enabled expansions', () => {
    const store = useSystemStore()

    expect(store.activateWorldPack('survival_city').ok).toBe(true)

    expect(store.user.activeWorldPackId).toBe('survival_city')
    expect(store.user.enabledWorldPackIds).toEqual(['survival_city'])
    expect(store.listEnabledWorldPacks().map((pack) => pack.id)).toEqual(['survival_city'])
  })

  test('disabling the sole active capability Pack returns to an explicit zero-Pack state', () => {
    const store = useSystemStore()

    expect(store.activateWorldPack('survival_city').ok).toBe(true)
    expect(store.disableWorldPack('survival_city')).toMatchObject({
      ok: true,
      reason: 'disabled',
    })

    expect(store.user.enabledWorldPackIds).toEqual([])
    expect(store.user.activeWorldPackId).toBe('default_world')
    expect(store.user.worldPackActivation.activePackId).toBe('default_world')
    expect(store.listEnabledWorldPacks()).toEqual([])
  })

  test('removes inactive world app Home entries when active pack changes', () => {
    const store = useSystemStore()
    const survivalWorldAppId = 'world_app_survival_city_survival_supply_board'

    expect(store.activateWorldPack('survival_city').ok).toBe(true)
    store.setHomeWidgetPages([[survivalWorldAppId], [], [], [], []])
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain(survivalWorldAppId)

    expect(store.activateWorldPack('fandom_parallel').ok).toBe(true)

    expect(store.user.activeWorldPackId).toBe('fandom_parallel')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain(survivalWorldAppId)
  })

  test('keeps missing optional content references non-blocking for capability activation', () => {
    const store = useSystemStore()
    store.upsertWorldPack({
      id: 'optional_reference_pack',
      title: 'Optional references',
      knowledgePointIds: ['kp_missing'],
    })

    const result = store.activateWorldPack('optional_reference_pack')

    expect(result.ok).toBe(true)
    expect(result.review.blockers).toEqual([])
    expect(result.review.referenceDiagnostics).toEqual([
      { type: 'missing_encyclopedia_entry', id: 'kp_missing' },
    ])
    expect(store.user.activeWorldPackId).toBe('optional_reference_pack')
  })

  test('restores world pack state from backup payload', () => {
    const store = useSystemStore()
    const ok = store.restoreFromBackup({
      system: {
        user: {
          globalWorldview: 'Backup world.',
          activeWorldPackId: 'modern_parallel',
          worldPackActivation: {
            activePackId: 'modern_parallel',
            state: 'active',
            reviewedAt: 123,
            activatedAt: 456,
          },
        },
      },
    })

    expect(ok).toBe(true)
    expect(store.getActiveWorldPack()).toMatchObject({
      id: 'modern_parallel',
      title: '现代平行世界',
    })
    expect(store.user.worldPackActivation).toMatchObject({
      activePackId: 'modern_parallel',
      activatedAt: 456,
    })
    expect(store.user.enabledWorldPackIds).toEqual(['modern_parallel'])
  })

  test('normalizes a legacy hidden-active and explicit-empty Pack state back to zero capabilities', () => {
    const store = useSystemStore()
    const ok = store.restoreFromBackup({
      system: {
        user: {
          activeWorldPackId: 'survival_city',
          enabledWorldPackIds: [],
          worldPackActivation: {
            activePackId: 'survival_city',
            state: 'active',
          },
        },
      },
    })

    expect(ok).toBe(true)
    expect(store.user.activeWorldPackId).toBe('default_world')
    expect(store.user.enabledWorldPackIds).toEqual([])
    expect(store.user.worldPackActivation.activePackId).toBe('default_world')
    expect(store.listEnabledWorldPacks()).toEqual([])
  })

  test('confirms reviewed nonstandard app templates into world app bindings', () => {
    const store = useSystemStore()

    expect(store.listWorldAppTemplates().map((template) => template.id)).toContain('transit_pass')

    const result = store.confirmWorldAppTemplateProposal(
      {
        templateId: 'transit_pass',
        title: 'Metro Pass',
        confidence: 'medium',
      },
      'modern_parallel',
    )

    expect(result).toMatchObject({
      ok: true,
      binding: {
        id: 'modern_parallel_transit_pass',
        archetype: 'transit',
        moduleKey: 'map',
        route: '/map',
      },
    })
    expect(store.getWorldPackById('modern_parallel').appBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'modern_parallel_transit_pass',
          moduleKey: 'map',
        }),
      ]),
    )
  })

  test('keeps the default zero-Pack state free of user-added capabilities', () => {
    const store = useSystemStore()
    const appReview = store.buildWorldAppTemplateExtractionReview([{
      templateId: 'transit_pass',
      title: 'Metro Pass',
      confidence: 'high',
    }], 'default_world')
    const serviceReview = store.buildWorldServiceTemplateProposalReview([{
      id: 'default_bulletin',
      title: 'Default Bulletin',
      category: 'publication',
      confidence: 'high',
    }], 'default_world')

    expect(appReview.confirmableProposals).toEqual([])
    expect(appReview.rejectedProposals).toEqual([
      expect.objectContaining({ rejectionReason: 'capability_pack_required' }),
    ])
    expect(serviceReview.confirmableProposals).toEqual([])
    expect(serviceReview.rejectedProposals).toEqual([
      expect.objectContaining({ rejectionReason: 'capability_pack_required' }),
    ])
    expect(store.updateWorldPackEconomy('default_world', {
      currencies: [{ code: 'CRD', labelEn: 'Credits' }],
    })).toMatchObject({ ok: false, reason: 'capability_pack_required' })
    expect(store.confirmWorldAppTemplateProposal({
      templateId: 'transit_pass',
      title: 'Metro Pass',
      confidence: 'high',
    }, 'default_world')).toMatchObject({
      ok: false,
      reason: 'capability_pack_required',
    })
    expect(store.confirmWorldServiceTemplateProposal({
      id: 'default_bulletin',
      title: 'Default Bulletin',
      category: 'publication',
      confidence: 'high',
    }, 'default_world')).toMatchObject({
      ok: false,
      reason: 'capability_pack_required',
    })
    expect(store.getWorldPackById('default_world')).toMatchObject({
      appBindings: [],
      serviceAccountTemplates: [],
      economy: { currencies: [] },
    })
  })

  test('updates and resets built-in world service account templates as user overrides', () => {
    const store = useSystemStore()

    const updated = store.updateWorldServiceAccountTemplate(
      'survival_city',
      'survival_supply_dispatch',
      {
        title: '避难所广播',
        name: '避难所广播',
        description: 'Publishes shelter notices and supply windows.',
        category: 'publication',
        linkedAppBindingId: 'survival_dispatch',
      },
    )

    expect(updated).toMatchObject({
      ok: true,
      template: {
        id: 'survival_supply_dispatch',
        title: '避难所广播',
        name: '避难所广播',
        description: 'Publishes shelter notices and supply windows.',
        category: 'publication',
        linkedAppBindingId: 'survival_dispatch',
        userEditedAt: 1780066800000,
      },
    })
    expect(store.getWorldPackById('survival_city').serviceAccountTemplates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'survival_supply_dispatch',
          title: '避难所广播',
          userEditedAt: 1780066800000,
        }),
      ]),
    )

    const reset = store.resetWorldServiceAccountTemplate('survival_city', 'survival_supply_dispatch')

    expect(reset).toMatchObject({
      ok: true,
      template: {
        id: 'survival_supply_dispatch',
        title: '补给调度员',
        category: 'service_notification',
        linkedAppBindingId: 'survival_supply_board',
        userEditedAt: 0,
      },
    })
  })

  test('confirms reviewed AI service candidates into world service templates', () => {
    const store = useSystemStore()

    const result = store.confirmWorldServiceTemplateProposal(
      {
        id: 'shelter_bulletin',
        title: 'Shelter Bulletin',
        category: 'publication',
        description: 'Publishes shelter notices and supply windows.',
        linkedAppBindingId: 'survival_dispatch',
        confidence: 'high',
        evidence: 'The active world describes shelter bulletins.',
      },
      'survival_city',
    )

    expect(result).toMatchObject({
      ok: true,
      template: {
        id: 'shelter_bulletin',
        title: 'Shelter Bulletin',
        category: 'publication',
        linkedAppBindingId: 'survival_dispatch',
        source: 'ai_confirmed',
        proposalConfidence: 'high',
        proposalEvidence: 'The active world describes shelter bulletins.',
        confirmedAt: 1780066800000,
      },
    })
    expect(store.getWorldPackById('survival_city').serviceAccountTemplates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'shelter_bulletin',
          source: 'ai_confirmed',
        }),
      ]),
    )

    const duplicate = store.confirmWorldServiceTemplateProposal(
      {
        id: 'shelter_bulletin',
        title: 'Shelter Bulletin Again',
        category: 'publication',
        confidence: 'high',
      },
      'survival_city',
    )

    expect(duplicate).toMatchObject({
      ok: false,
      reason: 'duplicate_template',
    })
  })

  test('does not confirm low-confidence nonstandard app templates', () => {
    const store = useSystemStore()
    const beforeCount = store.getWorldPackById('modern_parallel').appBindings.length

    const result = store.confirmWorldAppTemplateProposal(
      {
        templateId: 'transit_pass',
        title: 'Maybe Metro',
        confidence: 'low',
      },
      'modern_parallel',
    )

    expect(result).toMatchObject({
      ok: false,
      reason: 'low_confidence',
    })
    expect(store.getWorldPackById('modern_parallel').appBindings).toHaveLength(beforeCount)
  })

  test('reviews pasted object payloads through the world app template seam', () => {
    const store = useSystemStore()

    const review = store.buildWorldAppTemplateExtractionReview(
      {
        proposals: [
          {
            templateId: 'reservation_board',
            title: 'Ritual Calendar',
            confidence: 'high',
          },
          {
            templateId: 'made_up_console',
            title: 'Made Up Console',
            confidence: 'high',
          },
        ],
      },
      'modern_parallel',
    )

    expect(review).toMatchObject({
      worldPackId: 'modern_parallel',
      confirmableProposals: [
        expect.objectContaining({
          templateId: 'reservation_board',
          bindingId: 'modern_parallel_reservation_board',
        }),
      ],
      rejectedProposals: [
        expect.objectContaining({
          templateId: 'made_up_console',
          rejectionReason: 'unknown_template',
        }),
      ],
    })
  })
})
