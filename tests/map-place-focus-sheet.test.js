import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'
import MapPlaceFocusSheet from '../src/components/map/MapPlaceFocusSheet.vue'

const createWrapper = (overrides = {}, mountOptions = {}) =>
  mount(MapPlaceFocusSheet, {
    ...mountOptions,
    props: {
      place: { id: 'place-1', placeId: 'place-1', source: 'map_pack' },
      visual: { icon: 'fas fa-building', tone: '#17664f' },
      media: {
        id: 'media-place-1',
        kind: 'exact_photo',
        labelZh: '地点实景',
        labelEn: 'Exact-place photo',
        noteZh: '照片直接展示这一地点。',
        noteEn: 'This photograph directly shows the place.',
        asset: {
          url: 'https://example.test/place.webp',
          altZh: '地点照片',
          altEn: 'Place photo',
        },
        source: {
          creator: 'Example Author',
          sourcePageUrl: 'https://example.test/source',
          licenseId: 'CC BY 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
          changesZh: '已裁切。',
          changesEn: 'Cropped.',
        },
      },
      name: 'A Television',
      summary: 'Broadcast center and meeting venue.',
      detail: '1 Studio Road',
      sourceLabel: 'World place',
      categoryLabel: 'Work',
      contextLabel: '2.4 km from current position',
      t: (_zh, en) => en,
      ...overrides,
    },
  })

describe('MapPlaceFocusSheet', () => {
  test('keeps the floating overview concise and emits the Go command', async () => {
    const wrapper = createWrapper()

    expect(wrapper.get('[data-testid="map-place-summary"]').text()).toContain(
      'Broadcast center and meeting venue.',
    )
    expect(wrapper.get('[data-testid="map-place-context"]').text()).toContain(
      '2.4 km from current position',
    )
    expect(wrapper.find('[data-testid="map-place-detail-view"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-media-image"]').attributes('alt')).toBe('Place photo')
    expect(wrapper.get('[data-testid="map-place-use-destination"]').classes()).toContain(
      'map-place-focus-primary',
    )

    await wrapper.get('[data-testid="map-place-use-destination"]').trigger('click')

    expect(wrapper.emitted('go')).toHaveLength(1)
  })

  test('keeps Go visible at the current place and explains the state without emitting it', async () => {
    const wrapper = createWrapper({
      primaryAction: 'current',
      contextLabel: 'Current position',
      contextTone: 'current',
    })

    const currentAction = wrapper.get('[data-testid="map-place-current-location-action"]')
    expect(currentAction.text()).toContain('Go')
    expect(currentAction.classes()).toContain('is-current')
    expect(currentAction.attributes('disabled')).toBeUndefined()
    expect(currentAction.attributes('title')).toBe('You are currently here')

    await currentAction.trigger('click')

    expect(wrapper.get('[data-testid="map-place-primary-action-notice"]').text()).toBe(
      'You are currently here',
    )
    expect(wrapper.emitted('go')).toBeUndefined()
    expect(wrapper.emitted('view-journey')).toBeUndefined()
  })

  test('renders category fallbacks in the same stable image slot with an explicit truth label', () => {
    const wrapper = createWrapper({
      media: {
        id: 'fallback-place-1',
        kind: 'category_fallback',
        labelZh: '类别示意',
        labelEn: 'Category visual',
        noteZh: '仅表示地点类型，不代表真实外观。',
        noteEn: 'Represents the place category, not its real appearance.',
        asset: {
          url: 'https://example.test/category.webp',
          altZh: '类别示意图',
          altEn: 'Category visual',
        },
        source: { licenseId: 'not_applicable' },
      },
    })

    expect(wrapper.get('[data-testid="map-place-media-image"]').attributes('src')).toBe(
      'https://example.test/category.webp',
    )
    expect(wrapper.get('.map-place-focus-media').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-media"]').text()).toContain('Category visual')
    expect(wrapper.text()).toContain('not its real appearance')
  })

  test('does not carry the overview fallback treatment into a real detail-area slide', async () => {
    const wrapper = createWrapper({
      media: {
        id: 'fallback-place-1',
        kind: 'category_fallback',
        labelZh: '类别示意',
        labelEn: 'Category visual',
        noteZh: '仅表示地点类型，不代表真实外观。',
        noteEn: 'Represents the place category, not its real appearance.',
        asset: {
          url: 'https://example.test/category.webp',
          altZh: '类别示意图',
          altEn: 'Category visual',
        },
        source: { licenseId: 'not_applicable' },
      },
      mediaGallery: [{
        id: 'area-place-1',
        kind: 'area_atmosphere',
        labelZh: '周边实景',
        labelEn: 'Area view',
        noteZh: '展示周边环境。',
        noteEn: 'Shows the surrounding area.',
        asset: {
          url: 'https://example.test/place-area.webp',
          altZh: '地点周边照片',
          altEn: 'Area around the place',
        },
        source: { licenseId: 'CC BY 4.0' },
      }],
    })

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')

    expect(wrapper.get('[data-testid="map-place-detail-media"]').classes()).not.toContain(
      'is-category-fallback',
    )
    expect(wrapper.get('[data-testid="map-place-detail-media-image"]').attributes('src')).toBe(
      'https://example.test/place-area.webp',
    )
  })

  test('downgrades a failed photo to an image-backed category fallback without stale attribution', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="map-place-media-image"]').trigger('error')

    expect(wrapper.get('[data-testid="map-place-media-image"]').attributes('src')).toContain(
      'seoul-street-map-v1.webp',
    )
    expect(wrapper.get('.map-place-focus-media').exists()).toBe(true)
    expect(wrapper.text()).toContain('not its real appearance')
    expect(wrapper.text()).not.toContain('Example Author')
  })

  test('shows place content and source attribution in detail without diagnostics', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')

    expect(wrapper.get('[data-testid="map-place-detail-view"]').text()).toContain('1 Studio Road')
    expect(wrapper.get('[data-testid="map-place-about-section"]').text()).toContain(
      'About this place',
    )
    expect(wrapper.get('[data-testid="map-place-about-section"]').text()).toContain(
      'Broadcast center and meeting venue.',
    )
    expect(wrapper.get('[data-testid="map-place-detail-media"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-media-source"]').attributes('open')).toBeUndefined()
    expect(wrapper.get('[data-testid="map-place-media-source"] summary').text()).toContain(
      'Image information',
    )
    expect(wrapper.get('[data-testid="map-place-media-source"]').text()).toContain('Example Author')
    expect(wrapper.find('[data-testid="map-place-footprints-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-place-state-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-place-language-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-place-use-destination"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-share-chat"]').exists()).toBe(true)

    await wrapper.get('[data-testid="map-place-detail-back"]').trigger('click')
    expect(wrapper.find('[data-testid="map-place-detail-view"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-summary"]').exists()).toBe(true)
  })

  test('browses detail images with synchronized truth labels and attribution', async () => {
    const wrapper = createWrapper({
      mediaGallery: [
        {
          id: 'media-place-1',
          kind: 'exact_photo',
          labelZh: '地点实景',
          labelEn: 'Exact-place photo',
          noteZh: '照片直接展示这一地点。',
          noteEn: 'This photograph directly shows the place.',
          asset: {
            url: 'https://example.test/place.webp',
            altZh: '地点照片',
            altEn: 'Place photo',
          },
          source: {
            creator: 'Example Author',
            sourcePageUrl: 'https://example.test/source',
            licenseId: 'CC BY 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
            changesZh: '已裁切。',
            changesEn: 'Cropped.',
          },
        },
        {
          id: 'media-place-1-area',
          kind: 'area_atmosphere',
          labelZh: '周边实景',
          labelEn: 'Area view',
          noteZh: '展示周边环境。',
          noteEn: 'Shows the surrounding area.',
          asset: {
            url: 'https://example.test/place-area.webp',
            altZh: '地点周边照片',
            altEn: 'Area around the place',
          },
          source: {
            creator: 'Second Author',
            sourcePageUrl: 'https://example.test/source-area',
            licenseId: 'CC BY-SA 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
            changesZh: '已裁切。',
            changesEn: 'Cropped.',
          },
        },
      ],
    })

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')
    expect(wrapper.get('[data-testid="map-place-gallery-count"]').text()).toContain('1 / 2')

    await wrapper.get('[data-testid="map-place-gallery-next"]').trigger('click')
    expect(wrapper.get('[data-testid="map-place-detail-media-image"]').attributes('src')).toBe(
      'https://example.test/place-area.webp',
    )
    expect(wrapper.get('[data-testid="map-place-detail-media"]').text()).toContain('Area view')
    expect(wrapper.get('[data-testid="map-place-media-source"]').text()).toContain('Second Author')

    await wrapper.get('[data-testid="map-place-detail-media"]').trigger('touchstart', {
      changedTouches: [{ clientX: 180 }],
    })
    await wrapper.get('[data-testid="map-place-detail-media"]').trigger('touchend', {
      changedTouches: [{ clientX: 240 }],
    })
    expect(wrapper.get('[data-testid="map-place-gallery-count"]').text()).toContain('1 / 2')
  })

  test('copies the displayed detail address and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')
    await wrapper.get('[data-testid="map-place-copy-address"]').trigger('click')

    expect(writeText).toHaveBeenCalledWith('1 Studio Road')
    expect(wrapper.get('[data-testid="map-place-address-copy-notice"]').text()).toBe(
      'Address copied',
    )
  })

  test('offers the existing journey without exposing sandbox relocation controls', async () => {
    const wrapper = createWrapper({
      primaryAction: 'view_journey',
      contextLabel: 'Active journey · Browsing place',
      contextTone: 'journey',
    })

    expect(wrapper.find('[data-testid="map-place-use-destination"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-context"]').text()).toContain('Active journey')

    await wrapper.get('[data-testid="map-place-view-journey"]').trigger('click')
    expect(wrapper.emitted('view-journey')).toHaveLength(1)

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')
    expect(wrapper.find('[data-testid="map-place-set-current"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-place-use-start"]').exists()).toBe(false)
  })

  test('shows management only for a player-owned place', async () => {
    const worldPlace = createWrapper()
    expect(worldPlace.find('[data-testid="map-place-manage-pin"]').exists()).toBe(false)

    const playerPlace = createWrapper({ canManage: true })
    expect(playerPlace.find('[data-testid="map-place-manage-pin"]').exists()).toBe(false)
    await playerPlace.get('[data-testid="map-place-open-detail"]').trigger('click')
    await playerPlace.get('[data-testid="map-place-manage-pin"]').trigger('click')

    expect(playerPlace.emitted('manage')).toHaveLength(1)
  })

  test('keeps hidden-pin recovery as a direct interaction without exposing Footprints', async () => {
    const wrapper = createWrapper({ pinVisible: false })

    expect(wrapper.get('[data-testid="map-place-pin-hidden"]').text()).toContain('hidden from the map')
    await wrapper.get('[data-testid="map-place-show-pin"]').trigger('click')
    expect(wrapper.emitted('show-pin')).toHaveLength(1)

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')
    expect(wrapper.get('[data-testid="map-place-pin-hidden"]').text()).toContain('Pin hidden')
    expect(wrapper.find('[data-testid="map-place-footprints-section"]').exists()).toBe(false)
  })

  test('does not steal map focus, closes with Escape, and restores the opener', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const wrapper = createWrapper({}, { attachTo: document.body })
    await nextTick()

    expect(document.activeElement).toBe(opener)

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')
    expect(document.activeElement).toBe(wrapper.get('[data-testid="map-place-detail-back"]').element)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('close')).toHaveLength(1)

    wrapper.unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  test('reserves one entry slot and switches it between unavailable, Enter, and Leave', async () => {
    const remote = createWrapper({ entryAction: 'unavailable' })
    const remoteEntry = remote.get('[data-testid="map-place-entry-action"]')
    expect(remoteEntry.classes()).toContain('is-unavailable')
    expect(remoteEntry.attributes('disabled')).toBeUndefined()
    expect(remoteEntry.attributes('data-entry-state')).toBe('unavailable')
    expect(remoteEntry.attributes('title')).toBe('You are not near this facility')
    await remoteEntry.trigger('click')
    expect(remote.get('[data-testid="map-place-entry-notice"]').text()).toContain(
      'not near this facility',
    )
    expect(remote.emitted('enter')).toBeUndefined()

    const onsite = createWrapper({ entryAction: 'enter', contextLabel: 'Current position' })
    expect(onsite.get('.map-place-entry-action').text()).toContain('Enter')
    await onsite.get('.map-place-entry-action').trigger('click')
    expect(onsite.emitted('enter')).toHaveLength(1)

    const inside = createWrapper({ entryAction: 'leave', contextLabel: 'Inside this place' })
    expect(inside.get('.map-place-entry-action').text()).toContain('Leave')
    await inside.get('.map-place-entry-action').trigger('click')
    expect(inside.emitted('leave')).toHaveLength(1)
  })

  test('shows no permanent event placeholder and expands only an eligible interaction', async () => {
    const noEvent = createWrapper({ entryAction: 'enter' })
    expect(noEvent.find('[data-testid="map-place-event-invitation"]').exists()).toBe(false)

    const invited = createWrapper({
      primaryAction: 'leave',
      eventInvitation: {
        copy: {
          title: 'Production arrival briefing',
          summary: 'A coordinator left a short call sheet at the access desk.',
        },
      },
    })
    expect(invited.get('[data-testid="map-place-event-invitation"]').text()).toContain(
      'Production arrival briefing',
    )
    await invited.get('[data-testid="map-place-expand-event"]').trigger('click')
    expect(invited.emitted('expand-event')).toHaveLength(1)
  })

  test('offers an explicit development preview without presenting it as a real invitation', async () => {
    const wrapper = createWrapper({
      entryAction: 'leave',
      eventPreviewAvailable: true,
    })

    expect(wrapper.find('[data-testid="map-place-event-invitation"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-event-preview"]').text()).toContain('Test event')
    await wrapper.get('[data-testid="map-place-preview-event"]').trigger('click')
    expect(wrapper.emitted('preview-event')).toHaveLength(1)
  })

  test('presents a completed development preview as a read-only result review', async () => {
    const wrapper = createWrapper({
      entryAction: 'leave',
      eventPreviewCompleted: true,
    })

    expect(wrapper.get('[data-testid="map-place-event-preview"]').text()).toContain(
      'Test event completed',
    )
    expect(wrapper.get('[data-testid="map-place-preview-event"]').text()).toContain('Review')
    expect(wrapper.get('[data-testid="map-place-preview-event"]').text()).not.toContain('Replay')
    await wrapper.get('[data-testid="map-place-preview-event"]').trigger('click')
    expect(wrapper.emitted('preview-event')).toHaveLength(1)
  })
})
