import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import OpenFreeMapCanvas from '../src/components/map/OpenFreeMapCanvas.vue'
import { getMapPackById, mapPositionToNormalized } from '../src/lib/map-packs'

const maplibreMock = vi.hoisted(() => {
  class FakeMap {
    constructor(options) {
      this.options = options
      this.handlers = new Map()
      this.controls = []
      this.easeToCalls = []
      this.removed = false
      this.zoom = options.zoom
      const createInteraction = () => ({ enabled: true })
      ;[
        'boxZoom',
        'dragPan',
        'keyboard',
        'doubleClickZoom',
        'touchZoomRotate',
        'dragRotate',
        'touchPitch',
        'scrollZoom',
      ].forEach((name) => {
        const state = createInteraction()
        this[name] = {
          enable: () => { state.enabled = true },
          disable: () => { state.enabled = false },
          state,
        }
      })
      maplibreMock.maps.push(this)
    }

    addControl(control, position) {
      this.controls.push({ control, position })
    }

    on(name, handler) {
      this.handlers.set(name, [...(this.handlers.get(name) || []), handler])
      return this
    }

    once(name, handler) {
      const onceHandler = (...args) => {
        this.off(name, onceHandler)
        handler(...args)
      }
      return this.on(name, onceHandler)
    }

    off(name, handler) {
      this.handlers.set(
        name,
        (this.handlers.get(name) || []).filter((candidate) => candidate !== handler),
      )
    }

    emit(name, payload = {}) {
      ;[...(this.handlers.get(name) || [])].forEach((handler) => handler(payload))
    }

    getZoom() {
      return this.zoom
    }

    easeTo(options) {
      this.easeToCalls.push(options)
      this.zoom = options.zoom
    }

    resize() {}

    remove() {
      if (maplibreMock.failMapRemove) throw new Error('map cleanup unavailable')
      this.removed = true
    }
  }

  class FakeMarker {
    constructor(options) {
      this.options = options
      this.element = options.element
      this.removed = false
      maplibreMock.markers.push(this)
    }

    setLngLat(lngLat) {
      this.lngLat = lngLat
      return this
    }

    addTo(map) {
      if (maplibreMock.failMarkerAdd) throw new Error('marker projection unavailable')
      this.map = map
      return this
    }

    remove() {
      this.removed = true
    }
  }

  class FakeNavigationControl {
    constructor(options) {
      this.options = options
    }
  }

  return {
    maps: [],
    markers: [],
    failMapRemove: false,
    failMarkerAdd: false,
    FakeMap,
    FakeMarker,
    FakeNavigationControl,
  }
})

vi.mock('maplibre-gl', () => ({
  default: {
    Map: maplibreMock.FakeMap,
    Marker: maplibreMock.FakeMarker,
    NavigationControl: maplibreMock.FakeNavigationControl,
  },
}))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

const seoulPack = getMapPackById('real-seoul-v1')

const mountCanvas = (props = {}) =>
  mount(OpenFreeMapCanvas, {
    props: {
      mapPack: seoulPack,
      pins: [],
      ...props,
    },
    global: { plugins: [createPinia()] },
  })

describe('OpenFreeMap canvas', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    maplibreMock.maps.length = 0
    maplibreMock.markers.length = 0
    maplibreMock.failMapRemove = false
    maplibreMock.failMarkerAdd = false
  })

  test('selects canonical markers normally and makes them pass through during coordinate placement', async () => {
    const userPin = {
      placeId: 'address:17',
      source: 'user',
      name: 'Seoul studio',
      position: { kind: 'geo', lat: 37.5444, lng: 127.0441 },
    }
    const ignoredCanvasPin = {
      placeId: 'canvas-only',
      name: 'Canvas pin',
      position: { kind: 'canvas', x: 0.4, y: 0.6 },
    }
    const pendingPosition = { kind: 'geo', lat: 37.5665, lng: 126.978 }
    const wrapper = mountCanvas({
      pins: [userPin, ignoredCanvasPin],
      pendingPosition,
    })
    await flushPromises()

    await vi.waitFor(() => expect(maplibreMock.maps).toHaveLength(1))
    const map = maplibreMock.maps[0]
    expect(map.options).toMatchObject({
      style: 'https://tiles.openfreemap.org/styles/liberty',
      attributionControl: false,
      interactive: true,
    })
    expect(wrapper.attributes('data-renderer')).toBe('openfreemap-loading')

    map.emit('load')
    await nextTick()

    expect(wrapper.attributes('data-renderer')).toBe('openfreemap')
    expect(maplibreMock.markers).toHaveLength(2)
    expect(maplibreMock.markers[0].lngLat).toEqual([127.0441, 37.5444])
    expect(maplibreMock.markers[1].lngLat).toEqual([126.978, 37.5665])

    maplibreMock.markers[0].element.click()
    expect(wrapper.emitted('select-pin')?.[0]?.[0]).toEqual(userPin)

    map.emit('click', { lngLat: { lat: 37.56, lng: 126.98 } })
    expect(wrapper.emitted('map-interact')).toHaveLength(1)
    expect(wrapper.emitted('place-pin')).toBeUndefined()

    await wrapper.setProps({ allowPinPlacement: true })
    await nextTick()
    const placementMarker = maplibreMock.markers.find(
      (marker) => !marker.removed && !marker.element.classList.contains('is-pending'),
    )
    expect(placementMarker.element.classList.contains('is-placement-pass-through')).toBe(true)
    expect(placementMarker.element.tabIndex).toBe(-1)
    placementMarker.element.click()
    expect(wrapper.emitted('select-pin')).toHaveLength(1)

    const placedPosition = { kind: 'geo', lat: 37.5712, lng: 126.9918 }
    map.emit('click', { lngLat: placedPosition })
    expect(wrapper.emitted('map-interact')).toHaveLength(2)
    const placedPayload = wrapper.emitted('place-pin')?.[0]?.[0]
    expect(placedPayload.position).toEqual(placedPosition)
    expect(placedPayload.point).toEqual(mapPositionToNormalized(seoulPack, placedPosition))

    wrapper.unmount()
    expect(map.removed).toBe(true)
  })

  test('reacts to pin, focus, and interaction prop updates without replacing map truth', async () => {
    const firstPin = {
      placeId: 'first',
      name: 'First',
      position: { kind: 'geo', lat: 37.55, lng: 126.99 },
    }
    const wrapper = mountCanvas({ pins: [firstPin] })
    await flushPromises()
    await vi.waitFor(() => expect(maplibreMock.maps).toHaveLength(1))
    const map = maplibreMock.maps[0]
    map.emit('load')
    await nextTick()

    const nextPin = {
      placeId: 'next',
      name: 'Next',
      position: { kind: 'geo', lat: 37.58, lng: 127.03 },
    }
    await wrapper.setProps({ pins: [nextPin] })
    expect(maplibreMock.markers.filter((marker) => !marker.removed)).toHaveLength(1)
    expect(maplibreMock.markers.at(-1).lngLat).toEqual([127.03, 37.58])

    await wrapper.setProps({ focusPosition: nextPin.position })
    expect(map.easeToCalls.at(-1)).toMatchObject({
      center: [127.03, 37.58],
      zoom: 13.4,
    })

    await wrapper.setProps({ interactive: false })
    expect(map.dragPan.state.enabled).toBe(false)
    expect(map.keyboard.state.enabled).toBe(false)

    wrapper.unmount()
  })

  test('contains startup failures through the fallback event before reporting ready', async () => {
    const wrapper = mountCanvas()
    await flushPromises()
    await vi.waitFor(() => expect(maplibreMock.maps).toHaveLength(1))
    const map = maplibreMock.maps[0]

    map.emit('error', { error: new Error('style unavailable') })
    await nextTick()

    expect(wrapper.emitted('fallback')?.[0]?.[0]).toEqual({ reason: 'style unavailable' })
    expect(wrapper.emitted('renderer-status')?.some(([event]) => event.status === 'ready')).toBe(false)

    wrapper.unmount()
  })

  test('falls back when marker rendering fails and safely cleans up a partial map', async () => {
    maplibreMock.failMarkerAdd = true
    const wrapper = mountCanvas({
      pins: [{ name: 'Seoul', position: { kind: 'geo', lat: 37.5665, lng: 126.978 } }],
    })
    await flushPromises()
    await vi.waitFor(() => expect(maplibreMock.maps).toHaveLength(1))

    const map = maplibreMock.maps[0]
    map.emit('load')
    await nextTick()

    expect(wrapper.emitted('fallback')?.[0]?.[0]).toEqual({
      reason: 'OPENFREEMAP_MARKER_RENDER_FAILED',
    })

    maplibreMock.failMapRemove = true
    expect(() => wrapper.unmount()).not.toThrow()
  })
})
