import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WorldBookView from '../src/views/WorldBookView.vue'
import CurrentWorldPackPanel from '../src/components/worldbook/CurrentWorldPackPanel.vue'
import { useChatStore } from '../src/stores/chat'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/worldbook', component: WorldBookView },
      { path: '/settings', component: DummyView },
      { path: '/app-store', component: DummyView },
      { path: '/chat-contacts', component: DummyView },
      { path: '/shopping', component: DummyView },
    ],
  })

const mountWorldBook = async () => {
  const router = createTestRouter()
  await router.push('/worldbook')
  await router.isReady()

  const wrapper = mount(WorldBookView, {
    global: {
      plugins: [router],
    },
  })
  await nextTick()
  return wrapper
}

describe('WorldBook functional IA', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('leads with active world overview and current pack before editing controls', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const worldview = 'This city is built on night etiquette and stable relationship networks.'
    systemStore.setGlobalWorldview(worldview)
    systemStore.upsertKnowledgePoint({
      id: 'kp_city',
      title: 'City etiquette',
      content: 'Formal greetings come first in public.',
      enabled: true,
    })
    systemStore.upsertKnowledgePoint({
      id: 'kp_disabled',
      title: 'Disabled item',
      content: 'This should not be injected.',
      enabled: false,
    })
    systemStore.createWorldProfileTemplateFromPreset('preset_abo', {
      worldId: 'default_world',
    })

    const wrapper = await mountWorldBook()

    const overview = wrapper.get('[data-testid="worldbook-overview"]')
    const currentPack = wrapper.get('[data-testid="worldbook-current-pack"]')
    const worldKernel = wrapper.get('[data-testid="worldbook-world-kernel"]')

    expect(overview.text()).toContain('Active world')
    expect(overview.get('[data-testid="worldbook-overview-pack"]').text()).toContain('Default world')
    expect(overview.get('[data-testid="worldbook-overview-context-total"]').text()).toContain(
      String(worldview.length),
    )
    expect(overview.get('[data-testid="worldbook-overview-text-category-worldview"]').text()).toContain(
      'Not set',
    )
    expect(overview.get('[data-testid="worldbook-overview-text-category-rules"]').text()).toContain(
      'Not set',
    )
    expect(overview.get('[data-testid="worldbook-overview-text-category-encyclopedia"]').text()).toContain(
      'Encyclopedia',
    )
    expect(overview.get('[data-testid="worldbook-overview-text-category-profile"]').text()).toContain(
      'Profiles',
    )
    expect(overview.get('[data-testid="worldbook-overview-consumer-chat"]').text()).toContain('Chat')
    expect(overview.get('[data-testid="worldbook-overview-consumer-runtime"]').text()).toContain(
      'Event Runtime',
    )

    expect(currentPack.text()).toContain('Current World Pack')
    expect(currentPack.get('[data-testid="worldbook-current-pack-state"]').text()).toContain(
      'Default active',
    )
    expect(currentPack.get('[data-testid="worldbook-current-pack-effects"]').text()).toContain(
      '1 enabled, 1 disabled',
    )
    expect(currentPack.get('[data-testid="worldbook-current-pack-effects"]').text()).toContain(
      'Enabled encyclopedia',
    )
    expect(overview.element.compareDocumentPosition(currentPack.element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(currentPack.element.compareDocumentPosition(worldKernel.element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )

    wrapper.unmount()
  })

  test('active text overview opens category directories and shows enabled manuscript names', async () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    systemStore.settings.system.language = 'en-US'
    const asset = bookStore.createAsset({
      id: 'asset_overview_encyclopedia',
      title: 'Agency Glossary',
      category: 'encyclopedia',
      content: 'Trainee dorm terms and agency shorthand.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      role: 'encyclopedia',
      enabled: true,
    })

    const wrapper = await mountWorldBook()

    expect(wrapper.get('[data-testid="worldbook-overview-text-category-encyclopedia"]').text()).toContain(
      'Agency Glossary',
    )

    await wrapper.get('[data-testid="worldbook-overview-text-category-encyclopedia"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-source-directory"]').text()).toContain('Encyclopedia')
    expect(wrapper.get('[data-testid="worldbook-source-directory-active"]').text()).toContain(
      'Agency Glossary',
    )
    expect(wrapper.get('[data-testid="worldbook-source-directory-asset-asset_overview_encyclopedia"]').text()).toContain(
      'Enabled',
    )

    wrapper.unmount()
  })

  test('uses English pack and consumer labels when system language is English', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setGlobalWorldview('Quiet daily city.')

    const wrapper = await mountWorldBook()
    const overview = wrapper.get('[data-testid="worldbook-overview"]')

    expect(overview.get('[data-testid="worldbook-overview-pack"]').text()).toContain('Default world')
    expect(overview.get('[data-testid="worldbook-overview-consumer-chat"]').text()).toContain('Chat')
    expect(wrapper.get('[data-testid="worldbook-current-pack-name"]').text()).toContain('Default world')

    wrapper.unmount()
  })

  test('focuses source activation first and lets users switch management panels', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = await mountWorldBook()

    expect(wrapper.get('[data-testid="worldbook-control-deck"]').text()).toContain('World settings')
    expect(wrapper.get('[data-testid="worldbook-control-deck"]').text()).toContain('Setting text')
    expect(wrapper.get('[data-testid="worldbook-setup-path"]').text()).toContain('World setup path')
    expect(wrapper.get('[data-testid="worldbook-setup-path"]').text()).toContain('World pack')
    expect(wrapper.get('[data-testid="worldbook-setup-path"]').text()).toContain('Profile templates')
    expect(wrapper.get('[data-testid="worldbook-setup-path"]').text()).toContain('Encyclopedia')
    expect(wrapper.get('[data-testid="worldbook-setup-path"]').text()).toContain('Advanced fallback')
    expect(wrapper.get('[data-testid="worldbook-panel-sources"]').element.style.display).not.toBe(
      'none',
    )
    expect(wrapper.get('[data-testid="worldbook-source-stats"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="worldbook-panel-pack"]').element.style.display).toBe('none')

    await wrapper.get('[data-testid="worldbook-setup-step-kernel"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-world-kernel"]').element.style.display).not.toBe(
      'none',
    )
    expect(wrapper.get('[data-testid="worldbook-world-kernel"]').text()).toContain(
      'Advanced compatibility',
    )

    await wrapper.get('[data-testid="worldbook-setup-step-sources"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-panel-sources"]').element.style.display).not.toBe(
      'none',
    )

    await wrapper.get('[data-testid="worldbook-panel-tab-pack"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-panel-pack"]').element.style.display).not.toBe(
      'none',
    )
    expect(wrapper.get('[data-testid="worldbook-panel-sources"]').element.style.display).toBe(
      'none',
    )

    await wrapper.get('[data-testid="worldbook-panel-tab-knowledge"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-knowledge-manager"]').element.style.display).not.toBe(
      'none',
    )

    wrapper.unmount()
  })

  test('reviews and activates a built-in world pack from WorldBook', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-current-pack-select"]').setValue('survival_city')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-current-pack-active-summary"]').text()).toContain('Default world')
    expect(wrapper.get('[data-testid="worldbook-current-pack-candidate-preview"]').text()).toContain(
      'Post-disaster survival city',
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-candidate-preview"]').text()).toContain('3')
    expect(wrapper.get('[data-testid="worldbook-current-pack-candidate-preview"]').text()).toContain('1')

    const review = wrapper.get('[data-testid="worldbook-current-pack-review"]')
    expect(review.text()).toContain('Post-disaster survival city')
    expect(review.text()).toContain('World apps')
    expect(review.text()).toContain('Service templates')

    await wrapper.get('[data-testid="worldbook-current-pack-activate"]').trigger('click')
    await nextTick()

    expect(systemStore.user.activeWorldPackId).toBe('survival_city')
    expect(wrapper.get('[data-testid="worldbook-overview-pack"]').text()).toContain('Post-disaster survival city')
    expect(wrapper.get('[data-testid="worldbook-current-pack-state"]').text()).toContain('Active')

    const activeSummary = wrapper.get('[data-testid="worldbook-current-pack-active-summary"]')
    expect(activeSummary.text()).toContain('Post-disaster survival city')
    expect(activeSummary.text()).toContain('3')
    expect(activeSummary.text()).toContain('App Store')
    expect(wrapper.find('[data-testid="worldbook-current-pack-open-app-survival_supply_board"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Browse, place, or open world entries from the App Store World section')
    expect(wrapper.find('[data-testid="worldbook-current-pack-open-app-store"]').exists()).toBe(false)

    const serviceHandoff = wrapper.get('[data-testid="worldbook-current-pack-service-handoff"]')
    expect(serviceHandoff.text()).toContain('1')
    expect(serviceHandoff.text()).toContain('Chat')
    expect(wrapper.find('[data-testid="worldbook-current-pack-create-service-survival_supply_dispatch"]').exists()).toBe(
      false,
    )
    expect(chatStore.findWorldServiceTemplateContact('survival_city', 'survival_supply_dispatch')).toBeNull()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/worldbook')

    await wrapper.get('[data-testid="worldbook-current-pack-reset-default"]').trigger('click')
    await nextTick()

    expect(systemStore.user.activeWorldPackId).toBe('default_world')
    expect(systemStore.user.enabledWorldPackIds).toEqual([])
    expect(wrapper.get('[data-testid="worldbook-overview-pack"]').text()).toContain('Default world')
    expect(wrapper.get('[data-testid="worldbook-current-pack-reset-default"]').text()).toContain(
      'Default world active',
    )

    wrapper.unmount()
  })

  test('lets users review AI-fit recommendations and enable multiple compatible expansion packs', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setWorldProfileAnalysis({
      era: 'modern',
      settingTraits: ['school'],
      realism: 'realistic',
      socialRoles: ['student'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'high',
      evidence: ['campus setting'],
    })

    const wrapper = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-panel-tab-pack"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-world-profile"]').text()).toContain('modern era')
    expect(wrapper.get('[data-testid="worldbook-world-profile"]').text()).toContain('High confidence')
    expect(wrapper.get('[data-testid="worldbook-pack-recommendations"]').text()).toContain(
      'School life expansion',
    )
    expect(wrapper.get('[data-testid="worldbook-pack-all"]').text()).toContain('Business family expansion')
    expect(wrapper.get('[data-testid="worldbook-pack-all"]').text()).toContain('Adaptable')
    expect(wrapper.get('[data-testid="worldbook-pack-all"]').text()).not.toContain('adaptable')
    expect(wrapper.get('[data-testid="worldbook-pack-recommendations"]').text()).not.toContain(
      'matches settingTraits',
    )

    await wrapper.get('[data-testid="worldbook-enable-pack-school_life"]').trigger('click')
    await nextTick()

    expect(systemStore.user.enabledWorldPackIds).toEqual(['school_life'])
    expect(wrapper.get('[data-testid="worldbook-enable-pack-school_life"]').text()).toContain(
      'Disable',
    )
    expect(wrapper.get('[data-testid="worldbook-enabled-expansions"]').text()).toContain(
      'School life expansion',
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-active-summary"]').text()).toContain(
      'App Store',
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-service-handoff"]').text()).toContain(
      'Chat',
    )

    await wrapper.get('[data-testid="worldbook-enable-all-pack-business_family"]').trigger('click')
    await nextTick()

    expect(systemStore.user.enabledWorldPackIds).toEqual(['school_life', 'business_family'])
    expect(wrapper.get('[data-testid="worldbook-enable-all-pack-business_family"]').text()).toContain(
      'Disable',
    )
    expect(wrapper.get('[data-testid="worldbook-enabled-expansions"]').text()).toContain(
      'Business family expansion',
    )

    await wrapper.get('[data-testid="worldbook-enable-pack-school_life"]').trigger('click')
    await nextTick()

    expect(systemStore.user.enabledWorldPackIds).toEqual(['business_family'])
    expect(wrapper.find('[data-testid="worldbook-enabled-pack-school_life"]').exists()).toBe(false)

    await wrapper.get('[data-testid="worldbook-current-pack-reset-default"]').trigger('click')
    await nextTick()

    expect(systemStore.user.activeWorldPackId).toBe('default_world')
    expect(systemStore.user.enabledWorldPackIds).toEqual([])
    expect(wrapper.get('[data-testid="worldbook-enabled-expansions"]').text()).toContain(
      'No expansion packs are enabled yet',
    )

    wrapper.unmount()
  })

  test('reviews pasted nonstandard app proposals before adding a world app binding', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-panel-tab-pack"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-current-pack-template-registry"]').text()).toContain(
      'Transit pass',
    )

    await wrapper.get('[data-testid="worldbook-current-pack-template-draft"]').setValue(
      JSON.stringify({
        proposals: [
          {
            templateId: 'transit_pass',
            title: 'Metro Pass',
            confidence: 'medium',
            evidence: 'The world mentions route permits and safe transit access.',
          },
          {
            templateId: 'made_up_console',
            title: 'Made Up Console',
            confidence: 'high',
          },
          {
            templateId: 'clinic_dispatch',
            title: 'Unclear Clinic',
            confidence: 'low',
          },
        ],
      }),
    )
    await wrapper.get('[data-testid="worldbook-current-pack-template-review-json"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-current-pack-template-review-summary"]').text()).toContain(
      '1 entries need confirmation',
    )
    expect(
      wrapper.get('[data-testid="worldbook-current-pack-template-confirmable-default_world_transit_pass"]').text(),
    ).toContain('Metro Pass')
    expect(
      wrapper.get('[data-testid="worldbook-current-pack-template-rejected-made_up_console"]').text(),
    ).toContain('Not in the built-in template whitelist')
    expect(
      wrapper
        .get('[data-testid="worldbook-current-pack-template-rejection-reason-made_up_console"]')
        .attributes('data-rejection-reason'),
    ).toBe('unknown_template')
    expect(
      wrapper.get('[data-testid="worldbook-current-pack-template-rejected-default_world_clinic_dispatch"]').text(),
    ).toContain('Low confidence')

    await wrapper
      .get('[data-testid="worldbook-current-pack-template-confirm-default_world_transit_pass"]')
      .trigger('click')
    await nextTick()

    expect(systemStore.getWorldPackById('default_world').appBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'default_world_transit_pass',
          title: 'Metro Pass',
          moduleKey: 'map',
          route: '/map',
        }),
      ]),
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-app-binding-default_world_transit_pass"]').text()).toContain(
      'Metro Pass',
    )

    wrapper.unmount()
  })

  test('shows empty and error states for nonstandard app proposal review', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-panel-tab-pack"]').trigger('click')
    await nextTick()

    await wrapper.get('[data-testid="worldbook-current-pack-template-review-json"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-current-pack-template-notice"]').attributes('data-notice-tone')).toBe(
      'warning',
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-template-empty"]').text()).toContain(
      'No world app entries to add',
    )

    await wrapper.get('[data-testid="worldbook-current-pack-template-clear"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="worldbook-current-pack-template-draft"]').setValue('{bad json')
    await wrapper.get('[data-testid="worldbook-current-pack-template-review-json"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-current-pack-template-notice"]').attributes('data-notice-tone')).toBe(
      'danger',
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-template-notice"]').text()).toContain(
      'JSON parse failed',
    )

    wrapper.unmount()
  })

  test('keeps nonstandard app proposal loading state explicit and non-editing', () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(CurrentWorldPackPanel, {
      props: {
        overview: {
          activePack: { id: 'default_world', title: 'Default world', name: 'Default world' },
          hasWorldview: false,
          worldviewCharCount: 0,
          enabledKnowledgeCount: 0,
          disabledKnowledgeCount: 0,
          profileTemplateCount: 0,
          worldPackAppBindingCount: 0,
          worldPackServiceTemplateCount: 0,
        },
        packs: [{ id: 'default_world', title: 'Default world', name: 'Default world' }],
        selectedPackId: 'default_world',
        activationReview: null,
        serviceTemplateRows: [],
        appBindingRows: [],
        templateRegistryRows: [],
        templateProposalReview: {
          worldPackId: 'default_world',
          confirmableProposals: [],
          rejectedProposals: [],
          proposals: [],
        },
        templateProposalLoading: true,
        templateProposalNotice: 'AI extraction failed. Check API settings.',
        templateProposalNoticeTone: 'danger',
      },
    })

    expect(wrapper.get('[data-testid="worldbook-current-pack-template-review"]').attributes('aria-busy')).toBe(
      'true',
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-template-loading"]').text()).toContain(
      'Reviewing world context',
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-template-review-json"]').attributes('disabled')).toBe('')
    expect(wrapper.get('[data-testid="worldbook-current-pack-template-notice"]').attributes('data-notice-tone')).toBe(
      'danger',
    )
    expect(wrapper.get('[data-testid="worldbook-current-pack-template-empty"]').exists()).toBe(true)

    wrapper.unmount()
  })
})
