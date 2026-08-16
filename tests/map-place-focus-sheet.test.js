import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import MapPlaceFocusSheet from '../src/components/map/MapPlaceFocusSheet.vue'

const displayOptions = [
  {
    id: 'system',
    labelZh: '系统',
    labelEn: 'Auto',
    titleZh: '跟随系统语言',
    titleEn: 'Follow system language',
  },
  {
    id: 'en',
    labelZh: 'EN',
    labelEn: 'EN',
    titleZh: '显示英文地名',
    titleEn: 'Show English place names',
  },
]

const createWrapper = (overrides = {}) =>
  mount(MapPlaceFocusSheet, {
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
      displayMode: 'system',
      displayOptions,
      t: (_zh, en) => en,
      ...overrides,
    },
  })

describe('MapPlaceFocusSheet', () => {
  test('keeps the overview concise and emits the Go command', async () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Broadcast center and meeting venue.')
    expect(wrapper.text()).toContain('2.4 km from current position')
    expect(wrapper.find('[data-testid="map-place-detail-view"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-media-image"]').attributes('alt')).toBe('Place photo')
    expect(wrapper.get('[data-testid="map-place-media"]').text()).toContain('Example Author')

    await wrapper.get('[data-testid="map-place-use-destination"]').trigger('click')

    expect(wrapper.emitted('go')).toHaveLength(1)
  })

  test('keeps category fallbacks explicit and non-evidentiary', () => {
    const wrapper = createWrapper({
      media: {
        id: 'fallback-place-1',
        kind: 'category_fallback',
        labelZh: '类别示意',
        labelEn: 'Category visual',
        noteZh: '仅表示地点类型，不代表真实外观。',
        noteEn: 'Represents the place category, not its real appearance.',
        asset: null,
        source: { licenseId: 'not_applicable' },
      },
    })

    expect(wrapper.find('[data-testid="map-place-media-image"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-media-fallback"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-media"]').text()).toContain('not its real appearance')
  })

  test('downgrades a failed photo to the category fallback without stale attribution', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="map-place-media-image"]').trigger('error')

    expect(wrapper.find('[data-testid="map-place-media-image"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-media-fallback"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-media"]').text()).toContain('Category visual')
    expect(wrapper.get('[data-testid="map-place-media"]').text()).toContain('not its real appearance')
    expect(wrapper.get('[data-testid="map-place-media"]').text()).not.toContain('Example Author')
  })

  test('replaces the overview with details and returns without nesting a surface', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')

    expect(wrapper.get('[data-testid="map-place-detail-view"]').text()).toContain('1 Studio Road')
    expect(wrapper.find('[data-testid="map-place-use-destination"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-place-set-current"]').trigger('click')
    expect(wrapper.emitted('set-current')).toHaveLength(1)

    await wrapper.get('[data-testid="map-place-detail-back"]').trigger('click')
    expect(wrapper.find('[data-testid="map-place-detail-view"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-use-destination"]').exists()).toBe(true)
  })

  test('offers the existing journey without exposing relocation while travel is locked', async () => {
    const wrapper = createWrapper({
      primaryAction: 'view_journey',
      journeyLocked: true,
      contextLabel: 'Heading here',
      contextTone: 'journey',
    })

    expect(wrapper.find('[data-testid="map-place-use-destination"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-journey-lock"]').exists()).toBe(true)

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
    await playerPlace.get('[data-testid="map-place-manage-pin"]').trigger('click')

    expect(playerPlace.emitted('manage')).toHaveLength(1)
  })

  test('uses explicit Enter and Leave commands for onsite place sessions', async () => {
    const onsite = createWrapper({ primaryAction: 'enter', contextLabel: 'Current position' })
    expect(onsite.get('[data-testid="map-place-enter"]').text()).toContain('Enter')
    await onsite.get('[data-testid="map-place-enter"]').trigger('click')
    expect(onsite.emitted('enter')).toHaveLength(1)

    const inside = createWrapper({ primaryAction: 'leave', contextLabel: 'Inside this place' })
    expect(inside.get('[data-testid="map-place-leave"]').text()).toContain('Leave')
    await inside.get('[data-testid="map-place-leave"]').trigger('click')
    expect(inside.emitted('leave')).toHaveLength(1)
  })

  test('shows no permanent event placeholder and expands only an eligible invitation', async () => {
    const noEvent = createWrapper({ primaryAction: 'enter' })
    expect(noEvent.find('[data-testid="map-place-event-invitation"]').exists()).toBe(false)
    expect(noEvent.text()).not.toContain('Expand event')

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
})
