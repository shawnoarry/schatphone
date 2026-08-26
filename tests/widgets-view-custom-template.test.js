import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WidgetsView from '../src/views/WidgetsView.vue'
import { OFFICIAL_WIDGET_STYLE_PRESETS } from '../src/lib/widget-style-presets'
import { BUILT_IN_HOME_WIDGETS } from '../src/lib/home-widgets'
import { VALID_WIDGET_SIZES } from '../src/lib/widget-schema'
import { useSystemStore } from '../src/stores/system'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'

const DummyView = { template: '<div />' }
let mobileLayoutMatches = false

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/widgets', component: WidgetsView },
      { path: '/home', component: DummyView },
      { path: '/appearance', component: DummyView },
    ],
  })

const mountWidgetsView = async ({ attachToDocument = false } = {}) => {
  const router = createTestRouter()
  await router.push('/widgets')
  await router.isReady()

  const wrapper = mount(WidgetsView, {
    ...(attachToDocument ? { attachTo: document.body } : {}),
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
    mobileLayoutMatches = false
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: mobileLayoutMatches,
        media: '(max-width: 719px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    )
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
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
    expect(text).toContain('Daily Steps')
    expect(text).toContain('Mood Window')
    expect(text).toContain('Commute Rail')
    expect(text).toContain('Today Agenda')
    expect(text).toContain('Paper Moon Week')
    expect(text).toContain('Color Memory Wall')
    expect(text).toContain('Aurora Waveform')
    expect(text).toContain('Day & Night Veil')
    expect(text).toContain('World Pulse')
    expect(text).toContain('2x2')
    expect(text).toContain('4x2')
    expect(text).toContain('Evening Radio')
    expect(text).toContain('Daily Mix')
    expect(wrapper.find('[data-testid="widgets-market-built-in-weather"]').text()).toContain('In Home Library')
    expect(wrapper.text()).not.toContain('Restore')

    wrapper.unmount()
  })

  test('configures Weather tap behavior without changing Home placement', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    const originalPages = store.settings.appearance.homeWidgetPages.map((page) => [...page])
    const wrapper = await mountWidgetsView()

    const actionSelect = wrapper.get('[data-testid="widgets-weather-action-select"]')
    expect(actionSelect.element.value).toBe('open_weather')

    await actionSelect.setValue('toggle_details')
    expect(store.settings.weather.widgetAction).toBe('toggle_details')

    await actionSelect.setValue('none')
    expect(store.settings.weather.widgetAction).toBe('none')
    expect(store.settings.appearance.homeWidgetPages).toEqual(originalPages)

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
    expect(marketCards).toHaveLength(3)
    expect(marketCards.map((card) => card.text())).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Theme Board'),
        expect.stringContaining('Paper Moon Week'),
        expect.stringContaining('World Pulse'),
      ]),
    )
    expect(marketCards.every((card) => card.text().includes('4x3'))).toBe(true)
    expect(wrapper.text()).toContain('3 items')
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

  test('keeps official preset added state across locale changes and numbers copies', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()
    const firstPresetAction = wrapper.find(
      '.widgets-market-card.is-style-preset .widgets-action-btn',
    )

    await firstPresetAction.trigger('click')
    await nextTick()
    await firstPresetAction.trigger('click')
    await nextTick()

    expect(
      store.settings.appearance.customWidgets.map((widget) => ({
        name: widget.name,
        sourcePresetId: widget.sourcePresetId,
      })),
    ).toEqual([
      { name: 'Mood Charm', sourcePresetId: 'mood_charm' },
      { name: 'Mood Charm 2', sourcePresetId: 'mood_charm' },
    ])

    store.settings.system.language = 'zh-CN'
    await nextTick()

    const localizedPreset = wrapper.find('.widgets-market-card.is-style-preset')
    expect(localizedPreset.text()).toContain('心情徽章')
    expect(localizedPreset.text()).toContain('创建副本')

    wrapper.unmount()
  })

  test('moves focus into style previews and restores it after Escape', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView({ attachToDocument: true })
    const previewButton = wrapper.find(
      '.widgets-market-card.is-style-preset .widgets-preview-open',
    )
    previewButton.element.focus()

    await previewButton.trigger('click')
    await flushPromises()
    await nextTick()

    const dialog = wrapper.find('.widgets-style-preview-dialog')
    const closeButton = dialog.find('[data-dialog-initial-focus]')
    expect(document.activeElement).toBe(closeButton.element)

    await dialog.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.find('.widgets-style-preview-dialog').exists()).toBe(false)
    expect(document.activeElement).toBe(previewButton.element)

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

  test('exposes accessible tabs and selected size filters', async () => {
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView()
    const tabs = wrapper.findAll('[role="tab"]')

    expect(tabs).toHaveLength(3)
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[0].attributes('tabindex')).toBe('0')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
    expect(tabs[1].attributes('tabindex')).toBe('-1')

    await tabs[0].trigger('keydown', { key: 'ArrowRight' })
    await nextTick()

    expect(wrapper.find('#widgets-tab-custom').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('#widgets-panel-custom').attributes('role')).toBe('tabpanel')

    await wrapper.find('#widgets-tab-library').trigger('click')
    const sizeFilter = wrapper
      .findAll('.widgets-size-filter button')
      .find((button) => button.text() === '4x2')
    await sizeFilter.trigger('click')

    expect(sizeFilter.attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('.widgets-size-filter button')[0].attributes('aria-pressed')).toBe(
      'false',
    )

    wrapper.unmount()
  })

  test('treats the mobile custom editor as a focus-restoring dialog', async () => {
    mobileLayoutMatches = true
    useSystemStore().settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView({ attachToDocument: true })
    const createButton = wrapper.find('.widgets-home-btn')
    createButton.element.focus()

    await createButton.trigger('click')
    await flushPromises()
    await nextTick()

    const sheet = wrapper.find('.widgets-custom-composer')
    const closeButton = sheet.find('[data-dialog-initial-focus]')
    expect(sheet.attributes('role')).toBe('dialog')
    expect(sheet.attributes('aria-modal')).toBe('true')
    expect(wrapper.find('.widgets-header').attributes()).toHaveProperty('inert')
    expect(document.activeElement).toBe(closeButton.element)

    await sheet.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(sheet.attributes('role')).toBeUndefined()
    expect(document.activeElement).toBe(createButton.element)

    wrapper.unmount()
  })

  test('shows unsafe custom code and invalid imports inside their active mobile sheets', async () => {
    mobileLayoutMatches = true
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    const wrapper = await mountWidgetsView({ attachToDocument: true })

    await wrapper.find('.widgets-home-btn').trigger('click')
    await nextTick()
    await wrapper.find('.widgets-code-toggle').trigger('click')
    const customSheet = wrapper.find('.widgets-custom-composer')
    const customCode = customSheet.find('textarea')
    await customCode.setValue('<script>window.parent.hacked = true</script>')
    await customSheet.find('.widgets-form-actions .widgets-primary-btn').trigger('click')
    await nextTick()

    expect(customSheet.find('.widgets-editor-feedback.is-error').text()).toContain(
      'unsupported script content',
    )
    expect(customSheet.find('iframe').attributes('srcdoc')).not.toMatch(/<script/i)
    expect(store.settings.appearance.customWidgets).toHaveLength(0)

    await customSheet.trigger('keydown', { key: 'Escape' })
    await wrapper.find('#widgets-tab-import').trigger('click')
    await wrapper
      .find('.widgets-mobile-action-strip .widgets-primary-btn')
      .trigger('click')
    await nextTick()

    const importSheet = wrapper.find('.widgets-import-editor')
    expect(importSheet.attributes('role')).toBe('dialog')
    await importSheet.find('.widgets-import-textarea').setValue('{')
    await nextTick()

    const importError = importSheet.find('#widgets-import-editor-feedback')
    expect(importError.exists()).toBe(true)
    expect(importError.text()).toContain('Import content format is invalid.')
    expect(importSheet.find('textarea').attributes('aria-invalid')).toBe('true')

    wrapper.unmount()
  })

  test('renders created custom widgets as preview cards with icon actions', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    store.addCustomWidget({
      name: 'Preview Card',
      size: '1x1',
      code: '<div style="height:100%;display:grid;place-items:center;">Demo</div>',
      pageIndex: null,
      placeOnHome: false,
    })

    const wrapper = await mountWidgetsView()

    await wrapper.findAll('.widgets-tab')[1].trigger('click')
    await nextTick()

    const createdItem = wrapper.find('.widgets-created-item')
    expect(createdItem.exists()).toBe(true)
    expect(wrapper.find('.widgets-created-grid').exists()).toBe(true)
    expect(createdItem.classes()).toContain('widgets-created-card')
    expect(createdItem.find('.widgets-created-preview iframe').exists()).toBe(true)
    expect(createdItem.text()).toContain('Choose Slot')
    expect(createdItem.find('.widgets-created-actions .fa-table-cells').exists()).toBe(true)
    expect(createdItem.find('.widgets-created-actions .fa-pen').exists()).toBe(true)
    expect(createdItem.find('.widgets-created-actions .fa-trash').exists()).toBe(true)

    wrapper.unmount()
  })

  test('routes saved widgets and newly imported widgets into matching Home slots', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    const savedWidgetId = store.addCustomWidget({
      name: 'Saved Card',
      size: '2x2',
      code: '<div>Saved</div>',
      pageIndex: null,
      placeOnHome: false,
    })
    const wrapper = await mountWidgetsView()

    await wrapper.find('#widgets-tab-custom').trigger('click')
    await nextTick()
    await wrapper.find(`[data-testid="widgets-choose-slot-${savedWidgetId}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/home')
    expect(wrapper.vm.$router.currentRoute.value.query).toMatchObject({
      widgetEdit: '1',
      libraryTile: savedWidgetId,
    })

    wrapper.unmount()

    const importWrapper = await mountWidgetsView()
    await importWrapper.find('#widgets-tab-import').trigger('click')
    await nextTick()
    await importWrapper.find('.widgets-import-textarea').setValue(
      JSON.stringify([
        {
          name: 'Imported Card',
          size: '4x1',
          code: '<div>Imported</div>',
        },
      ]),
    )
    await importWrapper.find('.widgets-import-actions .widgets-primary-btn').trigger('click')
    await nextTick()

    const importedWidgetId = store.settings.appearance.customWidgets.at(-1).id
    const feedbackAction = importWrapper.find('[data-testid="widgets-feedback-choose-slot"]')
    expect(feedbackAction.exists()).toBe(true)
    await feedbackAction.trigger('click')
    await flushPromises()

    expect(importWrapper.vm.$router.currentRoute.value.path).toBe('/home')
    expect(importWrapper.vm.$router.currentRoute.value.query).toMatchObject({
      widgetEdit: '1',
      libraryTile: importedWidgetId,
    })

    importWrapper.unmount()
  })

  test('routes placed saved widgets back to their Home entry', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    const widgetId = store.addCustomWidget({
      name: 'Placed Card',
      size: '2x2',
      code: '<div>Placed</div>',
      pageIndex: 1,
      placeOnHome: true,
    })
    const wrapper = await mountWidgetsView()

    await wrapper.find('#widgets-tab-custom').trigger('click')
    await nextTick()
    const action = wrapper.find(`[data-testid="widgets-choose-slot-${widgetId}"]`)
    expect(action.text()).toContain('Edit Home')
    await action.trigger('click')
    await flushPromises()

    expect(wrapper.vm.$router.currentRoute.value.query).toMatchObject({
      widgetEdit: '1',
      focusTile: widgetId,
    })
    expect(wrapper.vm.$router.currentRoute.value.query.libraryTile).toBeUndefined()

    wrapper.unmount()
  })

  test('official style presets are complete rendered widgets across key Home sizes', () => {
    expect(OFFICIAL_WIDGET_STYLE_PRESETS).toHaveLength(12)
    expect(OFFICIAL_WIDGET_STYLE_PRESETS.map((preset) => preset.size)).toEqual([
      '1x1',
      '2x1',
      '2x2',
      '4x1',
      '4x2',
      '4x3',
      '4x4',
      '1x1',
      '2x1',
      '2x2',
      '4x1',
      '4x2',
    ])
    expect(OFFICIAL_WIDGET_STYLE_PRESETS.map((preset) => preset.nameEn)).toContain('Theme Board')
    expect(OFFICIAL_WIDGET_STYLE_PRESETS.map((preset) => preset.nameEn)).toContain(
      'Liquid Agenda',
    )

    OFFICIAL_WIDGET_STYLE_PRESETS.forEach((preset) => {
      expect(preset.code).toContain('<style>')
      expect(preset.code).not.toContain('{{text:')
      expect(preset.code).not.toContain('{{image:')
      expect(preset.code).not.toContain('<script')
      expect(preset.code).not.toMatch(/\son[a-z0-9_-]+\s*=/i)
    })
  })

  test('built-in widgets cover every supported Home slot size with explicit visual variants', () => {
    expect(new Set(BUILT_IN_HOME_WIDGETS.map((widget) => widget.size))).toEqual(
      new Set(VALID_WIDGET_SIZES),
    )
    expect(BUILT_IN_HOME_WIDGETS.map((widget) => widget.id)).toEqual(
      expect.arrayContaining([
        'focus_pulse',
        'daily_steps',
        'photo_note',
        'commute_strip',
        'today_agenda',
        'week_rhythm',
        'memory_board',
        'music_wave',
        'ambient_scene',
        'world_pulse',
      ]),
    )
    expect(new Set(BUILT_IN_HOME_WIDGETS.map((widget) => widget.variant)).size).toBe(
      BUILT_IN_HOME_WIDGETS.length,
    )
  })
})
