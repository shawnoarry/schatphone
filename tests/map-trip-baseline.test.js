import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../src/stores/map'
import { useSystemStore } from '../src/stores/system'
import * as pushLib from '../src/lib/push'

describe('map trip baseline loop', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('starts trip and auto-arrives by system time timer', () => {
    const store = useMapStore()
    store.setTripEndpoint('from', '首尔站')
    store.setTripEndpoint('to', '清潭洞')

    const started = store.startTrip()
    expect(started.ok).toBe(true)
    expect(store.tripState.status).toBe('traveling')

    const durationMs = Math.max(1, Number(store.tripState.durationSeconds || 0)) * 1000
    vi.advanceTimersByTime(durationMs + 1000)

    expect(store.tripState.status).toBe('arrived')
    expect(store.currentLocation.detail).toBe('清潭洞')
    expect(store.tripHistory[0]?.status).toBe('arrived')
    expect(store.tripHistory[0]?.rewardPoints).toBeGreaterThan(0)
    expect(store.tripHistory[0]?.eventKind).toBeTruthy()
    expect(store.routeFamiliarity[0]?.completedCount).toBe(1)
    expect(store.routeFamiliarity[0]?.points).toBe(store.tripHistory[0]?.rewardPoints)
    expect(store.mapAreaUnlocks.find((area) => area.id === 'city_core')?.unlocked).toBe(true)
    expect(store.mapAreaFeedback[0]?.areaId).toBe('city_core')
    expect(store.mapAreaFeedback[0]?.triggeredAt).toBe(store.tripHistory[0]?.endedAt)
    expect(store.mapCalendarReminders[0]?.source).toBe('map_area_feedback')
    expect(store.mapCalendarReminders[0]?.dueAt).toBe(store.tripHistory[0]?.endedAt + 24 * 60 * 60 * 1000)
    expect(store.tripRuntime.remainingSeconds).toBe(0)

    const acknowledged = store.acknowledgeTripArrival()
    expect(acknowledged).toBe(true)
    expect(store.tripState.status).toBe('idle')
  })

  test('builds route familiarity from repeated completed trips', () => {
    const store = useMapStore()
    const completeCurrentTrip = () => {
      const durationMs = Math.max(1, Number(store.tripState.durationSeconds || 0)) * 1000
      vi.advanceTimersByTime(durationMs + 1000)
      expect(store.tripState.status).toBe('arrived')
    }

    store.setTripEndpoint('from', 'Home')
    store.setTripEndpoint('to', 'Office')
    expect(store.startTrip().ok).toBe(true)
    completeCurrentTrip()
    expect(store.acknowledgeTripArrival()).toBe(true)

    store.setTripEndpoint('from', 'Home')
    store.setTripEndpoint('to', 'Office')
    expect(store.startTrip().ok).toBe(true)
    completeCurrentTrip()

    const route = store.routeFamiliarity.find((item) => item.from === 'Home' && item.to === 'Office')
    expect(route?.completedCount).toBe(2)
    expect(route?.points).toBe(
      Number(store.tripHistory[0]?.rewardPoints || 0) + Number(store.tripHistory[1]?.rewardPoints || 0),
    )
    expect(route?.tier).toBe('known_route')
    expect(route?.nextTier).toBe('trusted_route')
    expect(store.mapAreaUnlocks.find((area) => area.id === 'commute_belt')?.unlocked).toBe(true)
    expect(store.mapAreaFeedback.some((item) => item.areaId === 'commute_belt')).toBe(true)
    expect(store.mapAreaFeedback.find((item) => item.areaId === 'commute_belt')?.routeLabel).toContain('Home')
    expect(store.mapCalendarReminders.some((item) => item.areaId === 'commute_belt')).toBe(true)
    expect(store.mapCalendarReminders.find((item) => item.areaId === 'commute_belt')?.summaryEn).toContain('Home')
  })

  test('derives area unlocks from restored completed trip history', () => {
    const store = useMapStore()
    const baseAt = Date.now()
    const restored = store.restoreFromBackup({
      map: {
        tripHistory: Array.from({ length: 4 }, (_, index) => ({
          id: `restored_trip_${index}`,
          status: 'arrived',
          from: 'Home',
          to: 'Office',
          fromLabel: 'Home',
          toLabel: 'Office',
          distanceKm: 5,
          fare: 9000,
          durationSeconds: 900,
          startedAt: baseAt + index * 1000,
          endedAt: baseAt + index * 1000 + 900,
          rewardPoints: 20,
        })),
      },
    })

    expect(restored).toBe(true)
    expect(store.routeFamiliarity[0]?.tier).toBe('trusted_route')
    expect(store.mapAreaUnlocks.find((area) => area.id === 'city_core')?.unlocked).toBe(true)
    expect(store.mapAreaUnlocks.find((area) => area.id === 'commute_belt')?.unlocked).toBe(true)
    expect(store.mapAreaUnlocks.find((area) => area.id === 'routine_nodes')?.unlocked).toBe(true)
    expect(store.mapAreaUnlocks.find((area) => area.id === 'outer_ring')?.unlocked).toBe(false)
    expect(store.mapAreaFeedback.map((item) => item.areaId)).toEqual([
      'city_core',
      'commute_belt',
      'routine_nodes',
    ])
    expect(store.mapCalendarReminders.map((item) => item.areaId)).toEqual([
      'city_core',
      'commute_belt',
      'routine_nodes',
    ])
  })

  test('persists calendar reminder confirmation and pinning preferences', () => {
    const store = useMapStore()
    const baseAt = Date.now()
    const restored = store.restoreFromBackup({
      map: {
        tripHistory: Array.from({ length: 2 }, (_, index) => ({
          id: `reminder_trip_${index}`,
          status: 'arrived',
          from: 'Home',
          to: 'Office',
          fromLabel: 'Home',
          toLabel: 'Office',
          distanceKm: 5,
          fare: 9000,
          durationSeconds: 900,
          startedAt: baseAt + index * 1000,
          endedAt: baseAt + index * 1000 + 900,
          rewardPoints: 20,
        })),
      },
    })

    expect(restored).toBe(true)
    const reminderId = store.mapCalendarReminders.find((item) => item.areaId === 'city_core')?.id
    expect(reminderId).toBeTruthy()
    expect(store.confirmMapCalendarReminder(reminderId)).toBe(true)
    expect(store.setMapCalendarReminderPinned(reminderId, true)).toBe(true)

    const reminder = store.mapCalendarReminders.find((item) => item.id === reminderId)
    expect(reminder?.status).toBe('confirmed')
    expect(reminder?.pinned).toBe(true)
    expect(reminder?.confirmedAt).toBeGreaterThan(0)
    expect(reminder?.pinnedAt).toBeGreaterThan(0)

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restoredStore = useMapStore()
    expect(restoredStore.restoreFromBackup({ map: snapshot })).toBe(true)

    const restoredReminder = restoredStore.mapCalendarReminders.find((item) => item.id === reminderId)
    expect(restoredReminder?.status).toBe('confirmed')
    expect(restoredReminder?.pinned).toBe(true)

    expect(restoredStore.dismissMapCalendarReminder(reminderId)).toBe(true)
    const dismissedReminder = restoredStore.mapCalendarReminders.find((item) => item.id === reminderId)
    expect(dismissedReminder?.status).toBe('dismissed')
    expect(dismissedReminder?.pinned).toBe(false)
    expect(dismissedReminder?.dismissedAt).toBeGreaterThan(0)
  })

  test('canceling a running trip returns to idle and writes cancelled history', () => {
    const store = useMapStore()
    store.setTripEndpoint('from', '公司')
    store.setTripEndpoint('to', '练习室')
    expect(store.startTrip().ok).toBe(true)

    const cancelled = store.cancelTrip()
    expect(cancelled).toBe(true)
    expect(store.tripState.status).toBe('idle')
    expect(store.tripHistory[0]?.status).toBe('cancelled')
    expect(store.tripHistory[0]?.rewardPoints).toBe(0)
    expect(store.mapAreaUnlocks.find((area) => area.id === 'city_core')?.unlocked).toBe(false)
    expect(store.mapAreaFeedback.length).toBe(0)
    expect(store.mapCalendarReminders.length).toBe(0)

    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(store.tripState.status).toBe('idle')
  })

  test('backup snapshot and restore keep running trip state', () => {
    const storeA = useMapStore()
    storeA.setTripEndpoint('from', '家')
    storeA.setTripEndpoint('to', '公司')
    expect(storeA.startTrip().ok).toBe(true)

    const snapshot = storeA.createBackupSnapshot()
    setActivePinia(createPinia())
    const storeB = useMapStore()
    const restored = storeB.restoreFromBackup({ map: snapshot })

    expect(restored).toBe(true)
    expect(storeB.tripState.status).toBe('traveling')

    const remainingMs = Math.max(1, Number(storeB.tripRuntime.remainingSeconds || 0)) * 1000
    vi.advanceTimersByTime(remainingMs + 1000)

    expect(storeB.tripState.status).toBe('arrived')
    expect(storeB.currentLocation.detail).toBe('公司')
    expect(storeB.tripHistory[0]?.rewardPoints).toBeGreaterThan(0)
  })

  test('map visual falls back to default when gallery asset is unavailable', () => {
    const store = useMapStore()
    store.setMapVisualMode('gallery')
    store.setMapVisualAssetId('asset_missing')

    expect(store.resolveMapVisualMode({ assetAvailable: false })).toBe('default')
    const changed = store.enforceMapVisualFallback({ assetAvailable: false })
    expect(changed).toBe(true)
    expect(store.mapVisualSettings.mode).toBe('default')
    expect(store.mapVisualSettings.assetId).toBe('')
  })

  test('backup snapshot persists map visual settings', () => {
    const storeA = useMapStore()
    storeA.setMapVisualMode('gallery')
    storeA.setMapVisualAssetId('asset_abc')
    storeA.setMapAiVisualEnabled(true)
    storeA.setMapProviderVisualEnabled(true)
    storeA.dismissMapVisualOnboardingPrompt()

    const snapshot = storeA.createBackupSnapshot()
    setActivePinia(createPinia())
    const storeB = useMapStore()
    const restored = storeB.restoreFromBackup({ map: snapshot })

    expect(restored).toBe(true)
    expect(storeB.mapVisualSettings.mode).toBe('gallery')
    expect(storeB.mapVisualSettings.assetId).toBe('asset_abc')
    expect(storeB.mapVisualSettings.aiVisualEnabled).toBe(true)
    expect(storeB.mapVisualSettings.providerVisualEnabled).toBe(true)
    expect(storeB.mapVisualSettings.onboardingPromptPending).toBe(false)
  })

  test('builds read-only Food Delivery location handoff without starting a trip', () => {
    const store = useMapStore()
    store.setCurrentLocation({
      label: 'Studio',
      detail: 'Studio Street 9',
      source: 'test',
    })

    const handoff = store.buildFoodDeliveryMapHandoff({
      categoryKey: 'nearby',
      restaurant: {
        id: 'food_restaurant_test',
        name: 'Moon Bistro',
        address: 'Kitchen Lane 3',
        distanceKm: 2.4,
        deliveryEtaMinutes: 18,
      },
    })

    expect(handoff).toMatchObject({
      sourceModule: 'food_delivery_map_courier_route',
      sourceId: 'map_food_delivery_food_restaurant_test',
      categoryKey: 'nearby',
      readOnly: true,
      orderOwner: 'food_delivery',
      mapOwner: 'location_eta_context',
      deliveryAddress: 'Studio Street 9',
      pickupPoint: 'Kitchen Lane 3',
      restaurantId: 'food_restaurant_test',
      restaurantName: 'Moon Bistro',
      distanceKm: 2.4,
      etaMinutes: 18,
    })
    expect(handoff.sourceKeys).toEqual([
      'food_delivery_map_restaurant_location',
      'food_delivery_map_courier_route',
    ])
    expect(handoff.routeSummaryEn).toContain('Moon Bistro')
    expect(handoff.routeSummaryEn).toContain('18 min')
    expect(store.tripState.status).toBe('idle')
    expect(store.tripHistory).toHaveLength(0)
  })

  test('builds read-only delivery event handoff for Food Delivery order events', () => {
    const store = useMapStore()
    store.setCurrentLocation({
      label: 'Apartment',
      detail: 'Apartment Gate 5',
      source: 'test',
    })

    const handoff = store.buildDeliveryEventMapHandoff({
      ownerModule: 'food_delivery',
      order: {
        id: 'food_order_1',
        restaurantName: 'Night Noodle',
        restaurantAddress: 'Noodle Alley 7',
        deliveryAddress: 'Apartment Gate 5',
      },
      event: {
        id: 'food_event_1',
        type: 'eta_update',
        title: 'ETA update',
        etaMinutes: 22,
      },
    })

    expect(handoff).toMatchObject({
      sourceModule: 'food_delivery_map_courier_route',
      readOnly: true,
      eventOwner: 'food_delivery',
      orderOwner: 'food_delivery',
      mapOwner: 'delivery_location_context',
      orderId: 'food_order_1',
      eventId: 'food_event_1',
      pickupPoint: 'Noodle Alley 7',
      dropoffPoint: 'Apartment Gate 5',
      etaMinutes: 22,
    })
    expect(handoff.routeSummaryEn).toContain('Food Delivery')
    expect(store.tripState.status).toBe('idle')
    expect(store.tripHistory).toHaveLength(0)
  })

  test('builds read-only delivery event handoff for Shopping logistics events', () => {
    const store = useMapStore()
    store.setCurrentLocation({
      label: 'Studio',
      detail: 'Studio Street 9',
      source: 'test',
    })

    const handoff = store.buildDeliveryEventMapHandoff({
      ownerModule: 'shopping',
      order: {
        id: 'shopping_order_1',
        note: 'Gift order',
      },
      event: {
        id: 'shopping_event_1',
        type: 'pickup_point_changed',
        pickupPoint: 'Locker A12',
        locationHint: 'West Gate',
        trackingCode: 'TRACK-9',
        carrierName: 'Standard Courier',
        etaDays: 2,
      },
    })

    expect(handoff).toMatchObject({
      sourceModule: 'logistics_map_delivery_location',
      readOnly: true,
      eventOwner: 'shopping',
      orderOwner: 'shopping',
      mapOwner: 'delivery_location_context',
      orderId: 'shopping_order_1',
      eventId: 'shopping_event_1',
      pickupPoint: 'Locker A12',
      dropoffPoint: 'Studio Street 9',
      locationHint: 'West Gate',
      trackingCode: 'TRACK-9',
      carrierName: 'Standard Courier',
      etaDays: 2,
      etaMinutes: 2880,
    })
    expect(handoff.routeSummaryEn).toContain('Shopping logistics')
    expect(store.tripState.status).toBe('idle')
    expect(store.tripHistory).toHaveLength(0)
  })

  test('map AI visual refresh executes when system automation policy allows it', async () => {
    const mapStore = useMapStore()
    const systemStore = useSystemStore()
    mapStore.setMapAiVisualEnabled(true)
    systemStore.settings.aiAutomation.masterEnabled = true
    systemStore.settings.aiAutomation.modules.map.enabled = true

    const result = await mapStore.requestMapAiVisualRefresh({ source: 'test' })
    expect(result.ok).toBe(true)
    expect(['executed', 'queued']).toContain(result.runtimeResult)
    expect(mapStore.mapAutomationRuntime.lastExecuteAt > 0).toBe(true)
  })

  test('map AI visual refresh enters notify-only when system is notify-only', async () => {
    const mapStore = useMapStore()
    const systemStore = useSystemStore()
    mapStore.setMapAiVisualEnabled(true)
    systemStore.settings.aiAutomation.masterEnabled = true
    systemStore.settings.aiAutomation.modules.map.enabled = true
    systemStore.settings.aiAutomation.notifyOnlyMode = true

    const result = await mapStore.requestMapAiVisualRefresh({ source: 'test' })
    expect(result.ok).toBe(false)
    expect(result.notifyOnly).toBe(true)
    expect(result.reason).toBe('notify_only_mode')
    expect(mapStore.mapAutomationRuntime.lastNotifyOnlyAt > 0).toBe(true)
  })

  test('provider visual step is skipped when API key is missing', async () => {
    const mapStore = useMapStore()
    const systemStore = useSystemStore()
    mapStore.setMapAiVisualEnabled(true)
    mapStore.setMapProviderVisualEnabled(true)
    systemStore.settings.aiAutomation.masterEnabled = true
    systemStore.settings.aiAutomation.modules.map.enabled = true
    systemStore.settings.api.key = ''

    const result = await mapStore.requestMapAiVisualRefresh({ source: 'test_provider_skip' })
    expect(result.ok).toBe(true)
    expect(mapStore.mapAutomationRuntime.lastProviderMode).toBe('skipped_no_key')
    expect(mapStore.mapAutomationRuntime.lastProviderErrorCode).toBe('NO_API_KEY')
  })

  test('provider visual step can apply image url via test runner override', async () => {
    const mapStore = useMapStore()
    const systemStore = useSystemStore()
    mapStore.setMapAiVisualEnabled(true)
    mapStore.setMapProviderVisualEnabled(true)
    systemStore.settings.aiAutomation.masterEnabled = true
    systemStore.settings.aiAutomation.modules.map.enabled = true
    systemStore.settings.api.key = 'sk-test-provider'

    mapStore.setMapAiProviderRunnerForTesting(async () => ({
      text: JSON.stringify({
        sceneLabel: 'Rain City',
        visualNote: 'Wet roads with neon reflections.',
        imageUrl: 'https://example.com/map-ai-visual.png',
      }),
    }))

    const result = await mapStore.requestMapAiVisualRefresh({ source: 'test_provider_image' })
    expect(result.ok).toBe(true)
    expect(mapStore.mapAutomationRuntime.lastProviderMode).toBe('provider_image_url')
    expect(mapStore.mapAutomationRuntime.lastProviderImageUrl).toBe(
      'https://example.com/map-ai-visual.png',
    )
    expect(mapStore.mapAutomationRuntime.lastProviderSummary).toContain('Wet roads')
  })

  test('map background tasks and visual refresh share one dispatcher without overriding each other', async () => {
    const mapStore = useMapStore()
    const systemStore = useSystemStore()
    systemStore.settings.aiAutomation.masterEnabled = true
    systemStore.settings.aiAutomation.modules.map.enabled = true

    const now = Date.now()
    const queuedBackground = systemStore.enqueueAiAutomationTask(
      {
        moduleKey: 'map',
        targetId: 'map:auto',
        source: 'map_background_tick',
        reason: 'map:auto',
        dueAt: now,
        payload: {
          locationText: 'Seoul | Gangnam',
          minutes: 12,
          distanceKm: 4,
        },
      },
      {
        baseAt: now,
      },
    )
    expect(queuedBackground.accepted).toBe(true)

    const backgroundRun = await systemStore.runAiAutomationQueueTick(now)
    expect(backgroundRun.handled).toBe(true)
    expect(backgroundRun.result?.kind).toBe('background')
    expect(systemStore.apiReports.some((item) => item.action === 'auto_background_update')).toBe(true)

    mapStore.setMapAiVisualEnabled(true)
    const visualResult = await mapStore.requestMapAiVisualRefresh({ source: 'test_dispatch' })
    expect(visualResult.ok).toBe(true)
    expect(['executed', 'queued']).toContain(visualResult.runtimeResult)

    const visualTickAt = now + 30_000
    const visualRun = await systemStore.runAiAutomationQueueTick(visualTickAt)
    expect(visualRun.handled).toBe(true)
    expect(visualRun.result?.kind).toBe('visual')
    expect(mapStore.mapAutomationRuntime.lastExecuteAt).toBeGreaterThan(0)

    const nextTickAt = visualTickAt + 30_000
    const queuedBackgroundAgain = systemStore.enqueueAiAutomationTask(
      {
        moduleKey: 'map',
        targetId: 'map:auto',
        source: 'map_background_tick',
        reason: 'map:auto',
        dueAt: nextTickAt,
        payload: {
          locationText: 'Seoul | Mapo',
          minutes: 18,
          distanceKm: 7,
        },
      },
      {
        baseAt: nextTickAt,
      },
    )
    expect(queuedBackgroundAgain.accepted).toBe(true)

    const backgroundRunAgain = await systemStore.runAiAutomationQueueTick(nextTickAt)
    expect(backgroundRunAgain.handled).toBe(true)
    expect(backgroundRunAgain.result?.kind).toBe('background')
    expect(
      systemStore.apiReports.filter((item) => item.action === 'auto_background_update').length,
    ).toBeGreaterThanOrEqual(2)
  })

  test('startTrip can arm a background arrival push when real push is ready', async () => {
    const mapStore = useMapStore()
    const systemStore = useSystemStore()
    systemStore.setPushState({
      realPushEnabled: true,
      pushServerUrl: 'http://localhost:8787',
      pushDeviceId: 'push_device_1',
      pushSubscriptionActive: true,
    })

    const scheduleSpy = vi.spyOn(pushLib, 'schedulePushNotification').mockResolvedValue({
      ok: true,
      scheduleId: 'map_trip_1',
      deliverAt: Date.now() + 60_000,
    })

    mapStore.setTripEndpoint('from', 'Home')
    mapStore.setTripEndpoint('to', 'Office')
    const started = mapStore.startTrip()
    await started.remotePushPromise

    expect(started.ok).toBe(true)
    expect(scheduleSpy).toHaveBeenCalledTimes(1)
    expect(mapStore.tripState.scheduledPushId).toBe('map_trip_1')
  })

  test('cancelTrip clears an armed background arrival push schedule', async () => {
    const mapStore = useMapStore()
    const systemStore = useSystemStore()
    systemStore.setPushState({
      realPushEnabled: true,
      pushServerUrl: 'http://localhost:8787',
      pushDeviceId: 'push_device_1',
      pushSubscriptionActive: true,
    })

    vi.spyOn(pushLib, 'schedulePushNotification').mockResolvedValue({
      ok: true,
      scheduleId: 'map_trip_cancel_1',
      deliverAt: Date.now() + 60_000,
    })
    const cancelSpy = vi.spyOn(pushLib, 'cancelScheduledPushNotification').mockResolvedValue({
      ok: true,
      removed: true,
      scheduleId: 'map_trip_cancel_1',
    })

    mapStore.setTripEndpoint('from', 'Home')
    mapStore.setTripEndpoint('to', 'Cafe')
    const started = mapStore.startTrip()
    await started.remotePushPromise

    const cancelled = mapStore.cancelTrip()
    await Promise.resolve()

    expect(cancelled).toBe(true)
    expect(cancelSpy).toHaveBeenCalledTimes(1)
    expect(mapStore.tripState.status).toBe('idle')
  })
})
