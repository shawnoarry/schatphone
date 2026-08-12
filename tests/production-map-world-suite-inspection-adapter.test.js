import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMapLocationShareObject, shareableObjectToChatBlock } from '../src/lib/shareable-object'
import { createProductionMapWorldSuiteInspectionAdapter } from '../src/lib/production-map-world-suite-inspection-adapter'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import { useSimulationStore } from '../src/stores/simulation'
import {
  createCatalogManagedMapPackFixture,
  createMapWorldSuiteResourceFixture,
} from './fixtures/map-world-suite-inspection'

const eventFixture = JSON.parse(
  readFileSync(
    resolve('tests/fixtures/events/kpop-realism-v1/instance-cases-v1.json'),
    'utf8',
  ),
)

const adaptEventInstance = (source, { id, mapPackId }) => ({
  ...structuredClone(source),
  id,
  world: {
    ...source.world,
    mapPackId,
  },
  place: {
    ...source.place,
    anchor: {
      ...source.place.anchor,
      mapPackId,
    },
  },
})

describe('production Map World Suite inspection Adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('composes real Map, Gallery, Event Runtime, and Chat evidence without leaking bodies', () => {
    const mapStore = useMapStore()
    const galleryStore = useGalleryStore()
    const simulationStore = useSimulationStore()
    const chatStore = useChatStore()
    const resource = createMapWorldSuiteResourceFixture(2)
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/catalog-neon-borough.webp',
      category: 'scenario',
      name: 'Catalog neon borough',
    })
    expect(imported.ok).toBe(true)

    const catalogPack = createCatalogManagedMapPackFixture({
      resource,
      catalogVersion: 2,
      overrides: { assetId: imported.assetId },
    })
    expect(mapStore.restoreFromBackup({ map: { customMapPacks: [catalogPack] } })).toBe(true)

    const activeEvent = adaptEventInstance(eventFixture.cases[0].instance, {
      id: 'event-map-pack-active',
      mapPackId: resource.ownerResourceId,
    })
    activeEvent.text.normalizedCopy.opening = 'active event body must not leak'
    const resolvedEvent = adaptEventInstance(eventFixture.cases[5].instance, {
      id: 'event-map-pack-resolved',
      mapPackId: resource.ownerResourceId,
    })
    resolvedEvent.text.normalizedCopy.opening = 'resolved event body must not leak'
    expect(
      simulationStore.restoreFromBackup({
        simulation: {
          eventInstances: [activeEvent, resolvedEvent],
          mapJourneyEventProposals: [],
        },
      }),
    ).toBe(true)

    const contact = chatStore.addContact({ name: 'Reference test contact', kind: 'service' })
    const shareable = createMapLocationShareObject({
      placeId: 'address:88',
      mapPackId: resource.ownerResourceId,
      title: 'Private location title must not leak',
      summary: 'Private location summary must not leak',
    })
    const locationBlock = shareableObjectToChatBlock(shareable)
    expect(locationBlock).toBeTruthy()
    const message = chatStore.appendMessage(contact.id, {
      id: 'message-map-location-reference',
      role: 'user',
      content: 'private chat body must not leak',
      blocks: [locationBlock],
    })
    expect(message.blocks[0]).toMatchObject({
      type: 'share_card',
      shareType: 'location_share',
      sourceModule: 'map',
    })

    const adapter = createProductionMapWorldSuiteInspectionAdapter({
      mapStore,
      galleryStore,
      simulationStore,
      chatStore,
    })
    const inspected = adapter.inspect({ resource })

    expect(Object.keys(adapter).sort()).toEqual(['inspect', 'owner'])
    expect(adapter).not.toHaveProperty('install')
    expect(adapter).not.toHaveProperty('update')
    expect(adapter).not.toHaveProperty('remove')
    expect(inspected).toMatchObject({
      installed: true,
      version: 2,
      userModified: false,
      inUse: true,
      historicalReferenceCount: 2,
      galleryAsset: {
        assetId: imported.assetId,
        available: true,
      },
      references: {
        external: {
          currentCount: 1,
          historicalCount: 2,
          count: 3,
          byOwner: {
            event_runtime: { currentCount: 1, historicalCount: 1 },
            chat: { currentCount: 0, historicalCount: 1 },
          },
        },
      },
      mutationReadiness: {
        approved: true,
        blockers: [],
      },
      mutationAdapterAvailable: false,
      canInstall: false,
    })

    const serialized = JSON.stringify(inspected)
    expect(serialized).not.toContain('event body must not leak')
    expect(serialized).not.toContain('Private location')
    expect(serialized).not.toContain('private chat body')
  })

  test('requires all production evidence owners while preserving a read-only Interface', () => {
    const mapStore = useMapStore()
    expect(() =>
      createProductionMapWorldSuiteInspectionAdapter({ mapStore }),
    ).toThrow('Gallery Store with createBackupSnapshot is required.')
  })
})
