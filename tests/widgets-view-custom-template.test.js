import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WidgetsView from '../src/views/WidgetsView.vue'
import { OFFICIAL_WIDGET_STYLE_PRESETS } from '../src/lib/widget-style-presets'
import { VALID_WIDGET_SIZES } from '../src/lib/widget-schema'
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

    expect(nameInput.element.value).toBe('Mood Charm')
    expect(sizeSelect.element.value).toBe('1x1')
    expect(codeTextarea.element.value).toContain('sp-charm')
    expect(wrapper.find('.widgets-draft-preview iframe').exists()).toBe(true)
    expect(wrapper.find('.widgets-code-summary').text()).toContain('Preview ready')
    expect(wrapper.find('.widgets-code-editor').attributes('style')).toContain('display: none')

    await wrapper.find('.widgets-code-toggle').trigger('click')
    await nextTick()

    expect(wrapper.find('.widgets-code-editor').attributes('style') || '').not.toContain('display: none')
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
    expect(wrapper.find('[data-testid="widgets-market-built-in-weather"]').text()).toContain('In Home Library')
    expect(wrapper.text()).not.toContain('Restore')

    wrapper.unmount()
  })

  test('routes hidden built-in widgets into Home slot selection instead of restore', async () => {
    const router = createTestRouter()
    await router.push('/widgets?from=home&homePage=3')
    await router.isReady()
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    store.setHomeWidgetPages([['calendar'], [], [], [], []])

    const wrapper = mount(WidgetsView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()
    await nextTick()

    const weatherCard = wrapper.find('[data-testid="widgets-market-built-in-weather"]')
    expect(weatherCard.text()).toContain('Choose Slot')
    expect(weatherCard.text()).not.toContain('Restore')

    await weatherCard.find('[data-testid="widgets-built-in-action-weather"]').trigger('click')
    await flushPromises()

    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('weather')
    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query).toMatchObject({
      from: 'home',
      homePage: '3',
      widgetEdit: '1',
      libraryTile: 'weather',
    })

    wrapper.unmount()
  })

  test('filters the Widget Market by Home slot size', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()

    const sizeButton = wrapper.findAll('.widgets-size-filter button').find((button) => button.text() === '4x3')
    expect(sizeButton).toBeTruthy()

    await sizeButton.trigger('click')
    await nextTick()

    const marketCards = wrapper.findAll('.widgets-market-card')
    expect(marketCards).toHaveLength(1)
    expect(marketCards[0].text()).toContain('Theme Board')
    expect(marketCards[0].text()).toContain('4x3')
    expect(wrapper.text()).toContain('1 items')
    expect(wrapper.text()).not.toContain('Weather')

    wrapper.unmount()
  })

  test('opens an official style preview and can add or edit from it', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()

    const previewButton = wrapper.find('.widgets-market-card.is-style-preset .widgets-preview-open')
    expect(previewButton.exists()).toBe(true)

    await previewButton.trigger('click')
    await nextTick()

    const previewDialog = wrapper.find('.widgets-style-preview-dialog')
    expect(previewDialog.exists()).toBe(true)
    expect(previewDialog.text()).toContain('Mood Charm')
    expect(previewDialog.text()).toContain('1x1')
    expect(previewDialog.find('iframe').attributes('srcdoc')).toContain('sp-charm')
    expect(store.settings.appearance.customWidgets).toHaveLength(0)

    await wrapper.find('.widgets-style-preview-actions .widgets-secondary-btn').trigger('click')
    await nextTick()

    expect(store.settings.appearance.customWidgets).toHaveLength(1)
    expect(store.settings.appearance.customWidgets[0].name).toBe('Mood Charm')
    expect(wrapper.find('.widgets-style-preview-dialog').exists()).toBe(true)

    await wrapper.find('.widgets-style-preview-actions .widgets-primary-btn').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.find('.widgets-style-preview-dialog').exists()).toBe(false)
    expect(wrapper.find('input[type="text"]').element.value).toBe('Mood Charm')
    expect(wrapper.find('textarea').element.value).toContain('sp-charm')

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

    expect(wrapper.find('input[type="text"]').element.value).toBe('Index Capsule')
    expect(wrapper.find('textarea').element.value).toContain('sp-index')

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
    expect(starterCards.length).toBeGreaterThanOrEqual(7)
    expect(wrapper.find('.widgets-template-strip iframe').exists()).toBe(false)
    expect(starterCards.every((card) => card.find('.widgets-template-thumb').exists())).toBe(true)
    expect(starterCards.every((card) => /\d+x\d+/.test(card.text()))).toBe(true)

    wrapper.unmount()
  })

  test('keeps import as a visual-code library step with supported size chips', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()

    await wrapper.findAll('.widgets-tab')[2].trigger('click')
    await nextTick()

    const guide = wrapper.find('.widgets-import-guide')
    expect(guide.exists()).toBe(true)
    expect(guide.text()).toContain('Import visual code without placing it on Home automatically.')
    expect(wrapper.findAll('.widgets-import-preview-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Weather Card')
    expect(wrapper.text()).toContain('Quick Card')
    expect(wrapper.findAll('.widgets-import-size-chips span').map((chip) => chip.text())).toEqual([
      ...VALID_WIDGET_SIZES,
    ])

    wrapper.unmount()
  })

  test('previews pasted import content and disables invalid imports before submission', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()

    await wrapper.findAll('.widgets-tab')[2].trigger('click')
    await nextTick()

    const textarea = wrapper.find('.widgets-import-textarea')
    await textarea.setValue(
      JSON.stringify([
        {
          name: 'Desk Clock',
          size: '4x1',
          code: '<div style="height:100%;display:grid;place-items:center;">Desk</div>',
        },
      ]),
    )
    await nextTick()

    const previewCards = wrapper.findAll('.widgets-import-preview-card')
    expect(previewCards).toHaveLength(1)
    expect(previewCards[0].text()).toContain('Desk Clock')
    expect(previewCards[0].find('iframe').attributes('srcdoc')).toContain('Desk')
    expect(wrapper.find('.widgets-import-actions .widgets-primary-btn').element.disabled).toBe(false)

    await textarea.setValue('{')
    await nextTick()

    expect(wrapper.find('.widgets-import-preview-empty.is-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Import content format is invalid.')
    expect(wrapper.find('.widgets-import-actions .widgets-primary-btn').element.disabled).toBe(true)

    wrapper.unmount()
  })

  test('renders created custom widgets as preview cards with icon actions', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    store.addCustomWidget({
      name: 'Preview Card',
      size: '1x1',
      code: '<div style="height:100%;display:grid;place-items:center;">Demo</div>',
    })

    const wrapper = await mountWidgetsView()

    await wrapper.findAll('.widgets-tab')[1].trigger('click')
    await nextTick()

    const createdItem = wrapper.find('.widgets-created-item')
    expect(createdItem.exists()).toBe(true)
    expect(wrapper.find('.widgets-created-grid').exists()).toBe(true)
    expect(createdItem.classes()).toContain('widgets-created-card')
    expect(createdItem.find('.widgets-created-preview iframe').exists()).toBe(true)
    expect(createdItem.find('.widgets-created-actions .fa-pen').exists()).toBe(true)
    expect(createdItem.find('.widgets-created-actions .fa-trash').exists()).toBe(true)

    wrapper.unmount()
  })

  test('official style presets are complete rendered widgets across key Home sizes', () => {
    expect(OFFICIAL_WIDGET_STYLE_PRESETS).toHaveLength(7)
    expect(OFFICIAL_WIDGET_STYLE_PRESETS.map((preset) => preset.size)).toEqual([
      '1x1',
      '2x1',
      '2x2',
      '4x1',
      '4x2',
      '4x3',
      '4x4',
    ])
    expect(OFFICIAL_WIDGET_STYLE_PRESETS.map((preset) => preset.nameEn)).toContain('Theme Board')

    OFFICIAL_WIDGET_STYLE_PRESETS.forEach((preset) => {
      expect(preset.code).toContain('<style>')
      expect(preset.code).not.toContain('{{text:')
      expect(preset.code).not.toContain('{{image:')
      expect(preset.code).not.toContain('<script')
      expect(preset.code).not.toMatch(/\son[a-z0-9_-]+\s*=/i)
    })
  })
})
