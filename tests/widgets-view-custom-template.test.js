import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WidgetsView from '../src/views/WidgetsView.vue'
import { useSystemStore } from '../src/stores/system'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/widgets', component: WidgetsView },
      { path: '/home', component: DummyView },
      { path: '/appearance', component: DummyView },
    ],
  })

const mountWidgetsView = async () => {
  const router = createTestRouter()
  await router.push('/widgets')
  await router.isReady()

  const wrapper = mount(WidgetsView, {
    global: {
      plugins: [router],
    },
  })

  await flushPromises()
  await nextTick()
  return wrapper
}

describe('Widgets custom template starters', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDialogServiceForTest()
    setActivePinia(createPinia())
  })

  test('loads an official style preset into the custom editor without creating a widget', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()

    await wrapper.findAll('.widgets-tab')[1].trigger('click')
    await nextTick()

    const firstStarter = wrapper.find('.widgets-template-card')
    expect(firstStarter.exists()).toBe(true)

    await firstStarter.trigger('click')
    await nextTick()

    const nameInput = wrapper.find('input[type="text"]')
    const sizeSelect = wrapper.find('.widgets-field select')
    const codeTextarea = wrapper.find('textarea')

    expect(nameInput.element.value).toBe('Polaroid Stack')
    expect(sizeSelect.element.value).toBe('2x2')
    expect(codeTextarea.element.value).toContain('sp-polaroid')
    expect(wrapper.find('.widgets-draft-preview iframe').exists()).toBe(true)
    expect(store.settings.appearance.customWidgets).toHaveLength(0)

    wrapper.unmount()
  })

  test('presents built-in widget library entries with Home slot sizes', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()

    const text = wrapper.text()
    expect(text).toContain('Weather')
    expect(text).toContain('Calendar')
    expect(text).toContain('Music')
    expect(text).toContain('System Status')
    expect(text).toContain('2x2')
    expect(text).toContain('4x2')
    expect(text).toContain('Evening Radio')
    expect(text).toContain('Daily Mix')

    wrapper.unmount()
  })

  test('confirms before replacing an existing custom widget draft', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()
    const { dialogState, submitDialog } = useDialog()

    await wrapper.findAll('.widgets-tab')[1].trigger('click')
    await nextTick()

    await wrapper.find('input[type="text"]').setValue('Draft')
    await wrapper.find('textarea').setValue('<div>Draft</div>')
    await wrapper.findAll('.widgets-template-card')[1].trigger('click')
    await nextTick()

    expect(dialogState.visible).toBe(true)
    expect(dialogState.title).toBe('Use style template')
    expect(wrapper.find('input[type="text"]').element.value).toBe('Draft')

    submitDialog()
    await flushPromises()
    await nextTick()

    expect(wrapper.find('input[type="text"]').element.value).toBe('Mood Glass Orb')
    expect(wrapper.find('textarea').element.value).toContain('sp-orb')

    wrapper.unmount()
  })

  test('inserts common widget placeholders into the code editor', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()

    await wrapper.findAll('.widgets-tab')[1].trigger('click')
    await nextTick()

    const snippetButtons = wrapper.findAll('.widgets-code-snippets button')
    expect(snippetButtons).toHaveLength(4)

    await snippetButtons[0].trigger('click')
    await nextTick()
    expect(wrapper.find('textarea').element.value).toContain('{{text:title}}')

    await snippetButtons[3].trigger('click')
    await nextTick()
    expect(wrapper.find('textarea').element.value).toContain('data-cw-image="photo"')

    wrapper.unmount()
  })

  test('renders style starter thumbnails without iframe previews', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()

    await wrapper.findAll('.widgets-tab')[1].trigger('click')
    await nextTick()

    const starterCards = wrapper.findAll('.widgets-template-card')
    expect(starterCards.length).toBeGreaterThanOrEqual(6)
    expect(wrapper.find('.widgets-template-strip iframe').exists()).toBe(false)
    expect(starterCards.every((card) => card.find('.widgets-template-thumb').exists())).toBe(true)
    expect(starterCards.every((card) => /\d+x\d+/.test(card.text()))).toBe(true)

    wrapper.unmount()
  })
})
