import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const OPENFREEMAP_HOST = 'tiles.openfreemap.org'
const MAP_PACK_ID = 'semantic-access-e2e-v1'
const PLACE_ID = 'silver-ward-archive'

const deterministicStyle = {
  version: 8,
  name: 'World semantic access test map',
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dbe5df' } }],
}

const mockOpenFreeMapStyle = async (page) => {
  await page.route(`https://${OPENFREEMAP_HOST}/**`, async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/styles/liberty') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(deterministicStyle),
      })
      return
    }
    await route.abort('blockedbyclient')
  })
}

const readPersistedData = async (page, key) =>
  page.evaluate((storageKey) => {
    const envelope = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
    return envelope?.data || null
  }, key)

const seedSemanticAccessWorld = async (page) => page.evaluate(async ({ mapPackId, placeId }) => {
  const [
    { useMapStore },
    { useSystemStore },
    { useWorkHubStore },
    {
      WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
      WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
      createWorldSemanticProposalHash,
    },
    {
      PRIMARY_PERSISTED_WORLD_ID,
      createWorldSettingSourceSnapshot,
    },
    {
      MAP_WORLD_SUITE_PROVENANCE_KIND,
      computeManagedMapPackFingerprint,
    },
    { waitForPendingPersistedStateWrites },
  ] = await Promise.all([
    import('/schatphone/src/stores/map.js'),
    import('/schatphone/src/stores/system.js'),
    import('/schatphone/src/stores/workHub.js'),
    import('/schatphone/src/lib/simulation/world-semantic-contract.js'),
    import('/schatphone/src/lib/world-setting-state.js'),
    import('/schatphone/src/lib/map-world-suite-inspection.js'),
    import('/schatphone/src/lib/persistence.js'),
  ])
  const now = new Date('2026-08-31T13:00:00.000Z').getTime()
  const systemStore = useSystemStore()
  const workHubStore = useWorkHubStore()
  const mapStore = useMapStore()
  const snapshot = await createWorldSettingSourceSnapshot({
    worldOverview: {
      identity: { worldId: PRIMARY_PERSISTED_WORLD_ID, title: 'Magic Academy' },
      narrative: {
        fallbackText: '',
        activeSources: [{
          id: 'world_source_magic_archive',
          assetId: 'book_magic_archive',
          promptText: 'Only oathbound students may cross the silver archive ward.',
          role: 'core',
          enabled: true,
          priority: 10,
          sourceVersion: 1,
        }],
      },
      encyclopedia: { selectedEntries: [] },
      profiles: { enabledTemplates: [] },
      capabilities: { enabledPacks: [] },
    },
    observedAt: now,
  })
  const proposal = {
    schemaVersion: 1,
    worldId: PRIMARY_PERSISTED_WORLD_ID,
    namespace: 'magic_academy',
    sourceFingerprint: snapshot.sourceFingerprint,
    concepts: [
      {
        id: 'magic_academy:oathbound_student',
        label: 'Oathbound student',
        kind: 'actor',
        aliases: [],
        meaning: 'A student carrying the archive oath.',
        confidence: 'high',
        evidence: [{
          sourceId: 'worldbook:magic:archive',
          excerpt: 'Only oathbound students may cross the silver archive ward.',
        }],
      },
      {
        id: 'magic_academy:silver_ward_archive',
        label: 'Silver Ward Archive',
        kind: 'place',
        aliases: [],
        meaning: 'An archive protected by an oath-sensitive threshold.',
        confidence: 'high',
        evidence: [{
          sourceId: 'worldbook:magic:archive',
          excerpt: 'Only oathbound students may cross the silver archive ward.',
        }],
      },
    ],
    capabilities: [{
      id: 'magic_academy:warded_archive_access',
      label: 'Warded archive access',
      description: 'Validate passage through the archive ward.',
      actorConceptIds: ['magic_academy:oathbound_student'],
      objectConceptIds: ['magic_academy:silver_ward_archive'],
      effects: [{
        id: 'magic_academy:archive_access_check',
        ownerModule: 'map',
        actionId: 'map:access:validate',
        description: 'Map confirms the current threshold-access result.',
      }],
      confidence: 'high',
      evidence: [{
        sourceId: 'worldbook:magic:archive',
        excerpt: 'Only oathbound students may cross the silver archive ward.',
      }],
    }],
    boundaries: [{
      id: 'magic_academy:no_job_title_substitution',
      kind: 'invariant',
      statement: 'The archive oath is not a modern job title.',
      capabilityIds: ['magic_academy:warded_archive_access'],
      evidence: [{
        sourceId: 'worldbook:magic:archive',
        excerpt: 'The ward recognizes the archive oath itself.',
      }],
    }],
    bridges: [{
      id: 'magic_academy:bridge_warded_archive_access',
      sourceType: 'capability',
      sourceId: 'magic_academy:warded_archive_access',
      targetCapabilityId: 'runtime:access:restricted_place',
      evidence: [{
        sourceId: 'worldbook:magic:archive',
        excerpt: 'The silver ward is a restricted-place entry rule.',
      }],
    }],
    unknowns: [],
    conflicts: [],
  }
  const proposalHash = await createWorldSemanticProposalHash(proposal)
  const activated = await systemStore.confirmAndActivateWorldSemanticProposal({
    snapshot,
    proposal,
    confirmation: {
      schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
      status: 'confirmed',
      confirmedBy: 'user',
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash,
      manifestRevision: 1,
    },
    modelReceipt: {
      schemaVersion: WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
      providerId: 'e2e_fixture',
      modelId: 'e2e_fixture',
      requestId: 'semantic_access_e2e',
      generatedAt: now,
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash,
    },
    now,
  })
  if (!activated.ok) throw new Error(`semantic activation failed: ${activated.reason}`)

  const binding = {
    worldId: PRIMARY_PERSISTED_WORLD_ID,
    worldRevision: 1,
    contactsProfileId: 'self_profile',
    contactsProfileRevision: 1,
  }
  const common = {
    worldId: binding.worldId,
    organizationId: 'organization_magic_academy',
    revision: 1,
    issuerId: 'issuer_magic_academy',
    issuedAt: now - 1_000,
    expiresAt: now + 86_400_000,
    revokedAt: 0,
  }
  const authority = {
    schemaVersion: 1,
    packageId: 'work_hub_authority_magic_academy',
    revision: 1,
    worldBinding: binding,
    issuer: {
      issuerId: common.issuerId,
      kind: 'world_configuration_authority',
      revision: 1,
      scopes: ['work_hub:issue'],
      issuedAt: common.issuedAt,
      expiresAt: common.expiresAt,
      revokedAt: 0,
    },
    issuedAt: common.issuedAt,
    expiresAt: common.expiresAt,
    revokedAt: 0,
    organizations: [{
      ...common,
      id: common.organizationId,
      nameZh: '银誓学院',
      nameEn: 'Silver Oath Academy',
      kind: 'academy',
      status: 'active',
    }],
    memberships: [{
      ...common,
      id: 'membership_oathbound_student',
      subjectProfileId: binding.contactsProfileId,
      subjectProfileRevision: binding.contactsProfileRevision,
      status: 'active',
      displayLabel: 'Oathbound student',
      semanticConceptIds: ['magic_academy:oathbound_student'],
    }],
    roleAssignments: [{
      ...common,
      id: 'role_oathbound_student',
      membershipId: 'membership_oathbound_student',
      roleKey: 'oathbound_student',
      nameZh: '持誓学生',
      nameEn: 'Oathbound student',
      scopes: [],
      teamIds: [],
      semanticConceptIds: [],
    }],
    teams: [],
    channels: [],
    workNotices: [],
    tasks: [],
    statusReports: [],
    scheduleProposals: [],
    approvalRequests: [],
    receipts: [],
  }
  const installed = workHubStore.installAuthorityPackage(authority, {
    expectedBinding: binding,
    confirmed: true,
    now,
  })
  if (!installed.ok) throw new Error(`authority install failed: ${installed.code}`)

  const pack = {
    id: mapPackId,
    version: 1,
    kind: 'fictional',
    coordinateKind: 'canvas',
    source: 'custom',
    assetId: 'gallery-semantic-access-e2e',
    assetUrl: '',
    assetWidth: 1600,
    assetHeight: 1024,
    distanceScaleKm: 24,
    labelZh: '银誓学院',
    labelEn: 'Silver Oath Academy',
    shortLabelZh: '银誓',
    shortLabelEn: 'Silver Oath',
    descriptionZh: '世界语义通行测试地图。',
    descriptionEn: 'World-semantic access test map.',
    attributionZh: '测试地图',
    attributionEn: 'Test map',
    factions: [{
      id: 'academy',
      labelZh: '学院',
      labelEn: 'Academy',
      tone: '#17664f',
      position: { kind: 'canvas', x: 0.3, y: 0.3 },
    }],
    places: [{
      id: placeId,
      nameZh: '银障档案馆',
      nameEn: 'Silver Ward Archive',
      detailZh: '学院北侧的持誓档案馆',
      detailEn: 'Oathbound archive on the academy north side',
      category: 'work',
      factionId: 'academy',
      position: { kind: 'canvas', x: 0.36, y: 0.42 },
      aliases: ['Archive'],
      semanticConceptIds: ['magic_academy:silver_ward_archive'],
    }],
    createdAt: now,
    updatedAt: now,
  }
  pack.provenance = {
    kind: MAP_WORLD_SUITE_PROVENANCE_KIND,
    resourceId: 'map.semantic-access-e2e',
    catalogId: 'semantic-access-e2e-catalog',
    catalogVersion: 1,
    installedFingerprint: computeManagedMapPackFingerprint(pack),
  }
  const mapInstall = await mapStore.commitManagedMapPackMutation({
    operation: 'create',
    mapPackId,
    pack,
  })
  if (!mapInstall.ok) throw new Error(`map install failed: ${mapInstall.code}`)
  if (!mapStore.setActiveMapPack(mapPackId)) throw new Error('map activation failed')
  if (!mapStore.bindMapPackToWorld(systemStore.getActiveWorldPack(), mapPackId)) {
    throw new Error('world map binding failed')
  }
  const place = mapStore.activeMapPlaces.find((item) => item.placeId === placeId)
  mapStore.setCurrentLocation({
    label: place.nameEn,
    detail: place.detailEn,
    source: 'semantic_access_e2e',
    mapPackId,
    placeId,
    position: place.position,
    evidenceAt: now,
  })
  mapStore.setWorldSemanticAccessRandomValueForTesting(0.99)
  systemStore.settings.system.language = 'en-US'
  systemStore.saveNow()
  workHubStore.saveNow()
  mapStore.saveNow()
  await waitForPendingPersistedStateWrites()
}, { mapPackId: MAP_PACK_ID, placeId: PLACE_ID })

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const sheet = document.querySelector('[data-testid="map-place-detail-sheet"]')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      sheet: sheet instanceof HTMLElement ? sheet.scrollWidth - sheet.clientWidth : 0,
    }
  })
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.sheet).toBeLessThanOrEqual(1)
}

test.describe('WORLD-SEMANTIC-4 restricted-place access', () => {
  test('enters through verified identity and replays the same settlement after reload', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockOpenFreeMapStyle(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')
    await seedSemanticAccessWorld(page)
    await navigateInsideUnlockedApp(
      page,
      `/map?placeId=${PLACE_ID}&mapPackId=${MAP_PACK_ID}`,
    )

    await expect(page.getByTestId('map-place-detail-sheet')).toBeVisible()
    await expect(page.getByTestId('map-place-enter')).toBeVisible()
    await page.getByTestId('map-place-enter').click()
    await expect(page.getByTestId('map-place-entry-notice')).toContainText('Identity reviewed')
    await expect(page.getByTestId('map-place-leave')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    const accessibility = await new AxeBuilder({ page })
      .include('[data-testid="map-place-detail-sheet"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(accessibility.violations.filter((violation) => violation.impact === 'critical')).toEqual([])

    const firstSimulation = await readPersistedData(page, 'schatphone:store:simulation')
    expect(firstSimulation.eventInstancesV2).toHaveLength(1)
    expect(firstSimulation.ownerFacts).toHaveLength(1)
    const firstDecision = firstSimulation.eventInstancesV2[0].decisionLedger[0]
    expect(firstSimulation.eventInstancesV2[0]).toMatchObject({
      lifecycle: 'resolved',
      resultCodes: ['semantic_access_granted_reviewed'],
    })
    expect((await readPersistedData(page, 'schatphone:store:map')).activeMapPackId).toBe(MAP_PACK_ID)
    await page.evaluate(async () => {
      const [
        { useMapStore },
        { useSimulationStore },
        { useSystemStore },
        { useWorkHubStore },
        { waitForPendingPersistedStateWrites },
      ] = await Promise.all([
        import('/schatphone/src/stores/map.js'),
        import('/schatphone/src/stores/simulation.js'),
        import('/schatphone/src/stores/system.js'),
        import('/schatphone/src/stores/workHub.js'),
        import('/schatphone/src/lib/persistence.js'),
      ])
      useMapStore().saveNow()
      useSimulationStore().saveNow()
      useSystemStore().saveNow()
      useWorkHubStore().saveNow()
      await waitForPendingPersistedStateWrites()
      const keys = [
        'schatphone:store:map',
        'schatphone:store:simulation',
        'schatphone:store:system',
        'schatphone:store:work-hub',
      ]
      const db = await new Promise((resolve, reject) => {
        const request = window.indexedDB.open('schatphone-layered-storage', 1)
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('state')) {
            request.result.createObjectStore('state', { keyPath: 'key' })
          }
        }
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('state', 'readwrite')
        const store = transaction.objectStore('state')
        keys.forEach((key) => {
          const payload = window.localStorage.getItem(key)
          if (payload) store.put({ key, payload, updatedAt: Date.now() })
        })
        transaction.oncomplete = resolve
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
      db.close()
    })

    await page.reload()
    await expect
      .poll(async () => (await readPersistedData(page, 'schatphone:store:map'))?.activeMapPackId)
      .toBe(MAP_PACK_ID)
    const unlockButton = page.getByRole('button', { name: /Unlock to Home|解锁进入主屏/ })
    await expect(unlockButton).toBeVisible()
    await unlockButton.click()
    await expect(page).toHaveURL(/#\/home(?:\?|$)/)
    await expect.poll(() => page.evaluate(async () => {
      const { useMapStore } = await import('/schatphone/src/stores/map.js')
      return useMapStore().activeMapPackId
    })).toBe(MAP_PACK_ID)
    await navigateInsideUnlockedApp(
      page,
      `/map?placeId=${PLACE_ID}&mapPackId=${MAP_PACK_ID}`,
    )
    await expect(page.getByTestId('map-place-leave')).toBeVisible()
    await page.getByTestId('map-place-leave').click()
    await expect(page.getByTestId('map-place-enter')).toBeVisible()
    await page.getByTestId('map-place-enter').click()
    await expect(page.getByTestId('map-place-entry-notice')).toContainText('Identity reviewed')

    const replayedSimulation = await readPersistedData(page, 'schatphone:store:simulation')
    expect(replayedSimulation.eventInstancesV2).toHaveLength(1)
    expect(replayedSimulation.ownerFacts).toHaveLength(1)
    expect(replayedSimulation.eventInstancesV2[0].decisionLedger[0]).toEqual(firstDecision)
    expect(pageErrors).toEqual([])
  })
})
