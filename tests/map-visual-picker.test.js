import { describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import MapVisualSettingsPanel from '../src/components/map/MapVisualSettingsPanel.vue'

const baseProps = () => ({
  currentLocationText: 'Office',
  resolvedMapVisualMode: 'default',
  mapVisualPreviewUrl: '',
  mapOneOffVisualUrl: '',
  mapOneOffVisualName: '',
  mapProviderGeneratedImageUrl: '',
  mapVisualBindingStatusText: 'Default visual',
  showMapVisualOnboarding: false,
  mapVisualSettings: {
    mode: 'default',
    assetId: '',
    aiVisualEnabled: false,
    providerVisualEnabled: false,
  },
  mapVisualAssetOptions: [
    {
      id: 'asset_map_bg',
      name: 'Neon Map',
      category: 'scenario',
      sourceType: 'url',
      sourceUrl: 'https://example.com/map-bg.png',
    },
  ],
  mapVisualSelectedAsset: null,
  mapVisualSelectionTitle: 'No map background selected yet',
  mapVisualSelectionDescription: 'Choose one from Gallery.',
  mapVisualQuickAssetOptions: [],
  mapVisualQuickOverflowCount: 0,
  mapVisualQuickPreviewMap: {},
  mapAutomationRuntime: {},
  mapAiVisualAutomationPolicy: {},
  mapAiPolicySummary: '',
  mapAiPolicyHint: '',
  mapProviderStatusLabel: '',
  mapAiVisualRefreshing: false,
  mapVisualLoading: false,
  mapVisualHint: { tone: '', message: '' },
  formatTime: () => '00:00',
})

describe('MapVisualSettingsPanel shared image source picker', () => {
  test('emits existing map visual mode and asset events through the shared picker', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(MapVisualSettingsPanel, {
      props: baseProps(),
    })

    await wrapper.get('[data-testid="map-visual-image-source"]').setValue('gallery')
    expect(wrapper.emitted('change-map-visual-mode')?.[0]?.[0]).toMatchObject({
      target: { value: 'gallery' },
    })

    await wrapper.setProps({
      mapVisualSettings: {
        mode: 'gallery',
        assetId: '',
        aiVisualEnabled: false,
        providerVisualEnabled: false,
      },
    })

    await wrapper.get('[data-testid="map-visual-gallery-asset"]').setValue('asset_map_bg')
    expect(wrapper.emitted('change-map-visual-asset')?.[0]?.[0]).toMatchObject({
      target: { value: 'asset_map_bg' },
    })
    wrapper.unmount()
  })
})
