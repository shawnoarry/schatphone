import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { useChatStore } from '../src/stores/chat'
import { useBookStore } from '../src/stores/book'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'

const aiMockState = vi.hoisted(() => ({
  calls: [],
}))

vi.mock('../src/lib/ai', async () => {
  const actual = await vi.importActual('../src/lib/ai')
  return {
    ...actual,
    callAI: vi.fn(async (payload) => {
      aiMockState.calls.push(payload)
      return {
        text: JSON.stringify({
          messages: [
            {
              replyType: 'plain',
              quote: null,
              blocks: [
                {
                  type: 'text',
                  variant: 'primary',
                  lang: 'zh',
                  text: 'Mocked worldbook reply.',
                },
              ],
            },
          ],
        }),
        meta: null,
      }
    }),
  }
})

import ChatView from '../src/views/ChatView.vue'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: DummyView },
      { path: '/chat/:id', component: ChatView },
      { path: '/home', component: DummyView },
      { path: '/worldbook', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/chat-feature/:feature', component: DummyView },
    ],
  })

const flushUi = async () => {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('chat worldbook binding visibility', () => {
  let wrapper = null
  let router = null
  let chatStore = null
  let bookStore = null
  let relationshipRuntimeStore = null
  let systemStore = null
  let binding = null
  let injectedPoint = null
  let bookAsset = null

  beforeEach(async () => {
    localStorage.clear()
    aiMockState.calls.length = 0
    setActivePinia(createPinia())

    chatStore = useChatStore()
    bookStore = useBookStore()
    relationshipRuntimeStore = useRelationshipRuntimeStore()
    systemStore = useSystemStore()

    systemStore.user.name = 'V'
    systemStore.user.occupation = 'Courier'
    systemStore.user.relationship = 'Trusted partner'
    systemStore.user.bio = 'Keeps promises and prefers direct answers.'
    systemStore.setGlobalWorldview('Night city baseline. Formal etiquette in public.')
    bookAsset = bookStore.createAsset({
      title: 'Night market protocol',
      assetType: 'worldbook_document',
      format: 'markdown',
      content: '# Night market protocol\n\nLinked Book source governs lantern passwords.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: bookAsset.id,
      usage: 'base_worldview',
      enabled: true,
      priority: 1,
      sourceVersion: bookAsset.version,
      sourceFingerprint: bookAsset.contentFingerprint,
    })
    injectedPoint = systemStore.upsertKnowledgePoint({
      id: 'kp_city_etiquette',
      title: 'City etiquette',
      content: 'Formal greeting only.',
      tags: ['style'],
      enabled: true,
    })
    systemStore.upsertKnowledgePoint({
      id: 'kp_hidden_note',
      title: 'Hidden note',
      content: 'Should stay out of prompt.',
      tags: ['secret'],
      enabled: false,
    })
    systemStore.upsertKnowledgePoint({
      id: 'kp_tea_ritual',
      title: 'Tea rituals',
      content: 'Late-night tea ceremony phrases.',
      tags: ['culture'],
      enabled: true,
    })

    const profile = chatStore.addRoleProfile({
      name: 'Nova',
      role: 'Companion',
      knowledgePointIds: ['kp_city_etiquette', 'kp_hidden_note'],
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: 'Nova',
      },
      sourceModule: 'food_delivery',
      factType: 'shared_meal',
      summary: 'Shared a late dinner after patrol.',
      metricDeltas: {
        affinity: 9,
        trust: 4,
        intimacy: 5,
      },
      milestone: 'First shared meal',
    })
    binding = chatStore.bindRoleProfile(profile.id)

    router = createTestRouter()
    await router.push(`/chat/${binding.id}`)
    await router.isReady()

    wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    router = null
    chatStore = null
    bookStore = null
    relationshipRuntimeStore = null
    systemStore = null
    binding = null
    injectedPoint = null
    bookAsset = null
    aiMockState.calls.length = 0
  })

  test('shows effective WorldBook context and injects only enabled bound points into Chat prompt', async () => {
    await wrapper.get('[data-testid="chat-thread-menu-toggle"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="thread-worldbook-summary"]').text()).toContain(
      'Night market protocol: # Night market protocol',
    )
    expect(wrapper.get('[data-testid="thread-worldbook-summary"]').text()).toContain(
      'Night city baseline. Formal',
    )
    expect(wrapper.get('[data-testid="thread-worldbook-active-count"]').text()).toContain('1 / 2')
    expect(wrapper.get(`[data-testid="thread-worldbook-point-${injectedPoint.id}"]`).text()).toContain(
      'City etiquette',
    )
    expect(wrapper.find('[data-testid="thread-worldbook-empty"]').exists()).toBe(false)

    await wrapper.get('[data-testid="chat-trigger-reply"]').trigger('click')
    await flushUi()

    expect(aiMockState.calls).toHaveLength(1)
    const systemPrompt = aiMockState.calls[0]?.systemPrompt || ''

    expect(systemPrompt).toContain('Primary worldview rules: Night market protocol: # Night market protocol')
    expect(systemPrompt).toContain('Linked Book source governs lantern passwords.')
    expect(systemPrompt).toContain('Night city baseline. Formal etiquette in public.')
    expect(systemPrompt).toContain('User profile context:')
    expect(systemPrompt).toContain('Occupation: Courier')
    expect(systemPrompt).toContain('Relationship setting: Trusted partner')
    expect(systemPrompt).toContain('Profile bio: Keeps promises and prefers direct answers.')
    expect(systemPrompt).toContain('Current role profile values:')
    expect(systemPrompt).toContain('Visible user self-profile values:')
    expect(systemPrompt).toContain('City etiquette: Formal greeting only. [tags: style]')
    expect(systemPrompt).toContain('Relationship runtime snapshot: Nova.')
    expect(systemPrompt).toContain('First shared meal')
    expect(systemPrompt).toContain('food_delivery:shared_meal')
    expect(systemPrompt).not.toContain('Hidden note')
    expect(systemPrompt).not.toContain('Tea rituals')
    expect(wrapper.text()).toContain('Mocked worldbook reply.')
  })

  test('deep-links active injected points into WorldBook filters', async () => {
    await wrapper.get('[data-testid="chat-thread-menu-toggle"]').trigger('click')
    await flushUi()

    await wrapper.get(`[data-testid="thread-worldbook-point-${injectedPoint.id}"]`).trigger('click')
    await flushPromises()
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/worldbook')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'chat',
      point: injectedPoint.id,
    })
  })

  test('chat role binding contract carries profile template fields and gates self profile out of chat targets', () => {
    const selfProfile = chatStore.addRoleProfile({
      roleId: '1400',
      name: 'My profile',
      entityType: 'self_profile',
      profileValues: [
        { fieldId: 'public_identity', value: 'Public identity', visibilityLevel: 'public' },
        { fieldId: 'private_secret', value: 'Intimate secret', visibilityLevel: 'intimate' },
      ],
    })
    expect(chatStore.bindRoleProfile(selfProfile.id)).toBeNull()

    const role = chatStore.addRoleProfile({
      roleId: '1401',
      name: 'Template role',
      entityType: 'main_role',
      profileValues: [{ fieldId: 'pheromone', value: 'Snow pine', visibilityLevel: 'public' }],
    })
    const roleBinding = chatStore.bindRoleProfile(role.id)

    const contract = chatStore.getRoleBindingContract(roleBinding.id, { moduleKey: 'chat' })
    expect(contract.profile).toMatchObject({
      entityType: 'main_role',
      profileValues: expect.arrayContaining([
        expect.objectContaining({ fieldId: 'pheromone', value: 'Snow pine' }),
      ]),
      capabilities: expect.objectContaining({
        canUseFullRelationshipProgress: true,
      }),
    })
  })
})
