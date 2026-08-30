import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'

const PROVIDER_ROOT = 'http://localhost:11434'
const PROVIDER_MODEL = 'world-review-test'
const VISUAL_EVIDENCE_DIR = path.resolve('output/e2e/settings-world-setup')
const WORLD_TEXT =
  'Tide Contract City permits passage through named covenants. Chant Namers confirm public street names but cannot rewrite settled history.'

const seedWorldSetup = async (page) => {
  await page.addInitScript(
    ({ providerRoot, providerModel, worldText }) => {
      const now = Date.now()
      if (!window.localStorage.getItem('schatphone:store:system')) {
        window.localStorage.setItem(
          'schatphone:store:system',
          JSON.stringify({
            version: 1,
            savedAt: now,
            data: {
              settings: {
                api: {
                  url: `${providerRoot}/v1`,
                  key: '',
                  model: providerModel,
                  resolvedKind: 'openai_compatible',
                  transportMode: 'direct',
                  proxyUrl: '',
                  proxyToken: '',
                  presets: [],
                  activePresetId: '',
                },
                system: {
                  language: 'en-US',
                },
              },
              user: {
                name: 'World Setup Test User',
                globalWorldview: worldText,
                worldBook: worldText,
                worldBookSourceLinks: [],
                knowledgePoints: [],
                encyclopediaEntries: [],
                profileTemplates: [],
                enabledWorldPackIds: [],
                worldPackEnablements: {},
              },
            },
          }),
        )
      }
      if (!window.localStorage.getItem('schatphone:store:simulation')) {
        window.localStorage.setItem(
          'schatphone:store:simulation',
          JSON.stringify({
            version: 7,
            savedAt: now,
            data: {
              eventInstances: [],
              eventLogs: [],
            },
          }),
        )
      }
    },
    { providerRoot: PROVIDER_ROOT, providerModel: PROVIDER_MODEL, worldText: WORLD_TEXT },
  )
}

const readOwnedStorage = (page) =>
  page.evaluate(() => ({
    system: window.localStorage.getItem('schatphone:store:system'),
    simulation: window.localStorage.getItem('schatphone:store:simulation'),
  }))

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body should not overflow horizontally').toBeLessThanOrEqual(1)
}

const expectNoCriticalAxeViolations = async (page) => {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(
    accessibility.violations.filter((violation) => violation.impact === 'critical'),
  ).toEqual([])
}

const fulfillWorldVersionReview = async (route) => {
  const requestBody = route.request().postDataJSON()
  const prompt = requestBody?.messages?.at(-1)?.content || ''
  const inputMarker = 'Input JSON:\n'
  const input = JSON.parse(prompt.slice(prompt.lastIndexOf(inputMarker) + inputMarker.length))
  const { worldId, sourceFingerprint } = input.world
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'world-review-request-1',
      model: PROVIDER_MODEL,
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              preview: {
                summary:
                  'Tide Contract City uses named covenants to govern passage while preserving settled history.',
                concepts: [
                  {
                    id: 'concept_chant_namer',
                    label: 'Chant Namer',
                    kind: 'role',
                    meaning: 'A public role that confirms street names.',
                    evidence: 'confirm public street names',
                    confidence: 'high',
                  },
                ],
                capabilities: [
                  {
                    id: 'capability_covenant_passage',
                    label: 'Covenant passage',
                    description: 'Check whether a named covenant permits passage.',
                    evidence: 'permits passage through named covenants',
                    confidence: 'high',
                  },
                ],
                boundaries: ['Cannot rewrite settled history.'],
                unknowns: ['The source does not define how a covenant is granted.'],
                conflicts: [],
              },
              proposal: {
                schemaVersion: 1,
                worldId,
                namespace: 'tide_contract',
                sourceFingerprint,
                concepts: [
                  {
                    id: 'tide_contract:chant_namer',
                    label: 'Chant Namer',
                    kind: 'actor',
                    aliases: ['public name confirmer'],
                    meaning: 'A public role that confirms street names.',
                    confidence: 'high',
                    evidence: [
                      {
                        sourceId: 'world_fallback_narrative',
                        excerpt: 'Chant Namers confirm public street names',
                      },
                    ],
                  },
                  {
                    id: 'tide_contract:named_covenant_route',
                    label: 'Named covenant route',
                    kind: 'place',
                    aliases: [],
                    meaning: 'A route whose passage depends on a named covenant.',
                    confidence: 'high',
                    evidence: [
                      {
                        sourceId: 'world_fallback_narrative',
                        excerpt: 'passage through named covenants',
                      },
                    ],
                  },
                ],
                capabilities: [
                  {
                    id: 'tide_contract:covenant_passage',
                    label: 'Covenant passage',
                    description: 'Validate whether a named covenant permits passage.',
                    actorConceptIds: ['tide_contract:chant_namer'],
                    objectConceptIds: ['tide_contract:named_covenant_route'],
                    effects: [
                      {
                        id: 'tide_contract:covenant_passage_check',
                        ownerModule: 'map',
                        actionId: 'map:access:validate',
                        description: 'Map confirms the current route-access result.',
                      },
                    ],
                    confidence: 'high',
                    evidence: [
                      {
                        sourceId: 'world_fallback_narrative',
                        excerpt: 'permits passage through named covenants',
                      },
                    ],
                  },
                ],
                boundaries: [
                  {
                    id: 'tide_contract:settled_history',
                    kind: 'prohibition',
                    statement: 'A Chant Namer cannot rewrite settled history.',
                    capabilityIds: ['tide_contract:covenant_passage'],
                    evidence: [
                      {
                        sourceId: 'world_fallback_narrative',
                        excerpt: 'cannot rewrite settled history',
                      },
                    ],
                  },
                ],
                bridges: [
                  {
                    id: 'tide_contract:bridge_covenant_passage',
                    sourceType: 'capability',
                    sourceId: 'tide_contract:covenant_passage',
                    targetCapabilityId: 'runtime:access:restricted_place',
                    evidence: [
                      {
                        sourceId: 'world_fallback_narrative',
                        excerpt: 'passage through named covenants',
                      },
                    ],
                  },
                ],
                unknowns: [
                  {
                    id: 'tide_contract:unknown_covenant_grant',
                    statement: 'The source does not define how a covenant is granted.',
                    capabilityIds: [],
                  },
                ],
                conflicts: [],
              },
            }),
          },
        },
      ],
    }),
  })
}

test('Settings prepares an arbitrary world with one transient model check', async ({
  page,
}, testInfo) => {
  let providerCalls = 0
  await seedWorldSetup(page)
  await page.route(`${PROVIDER_ROOT}/**`, async (route) => {
    providerCalls += 1
    await fulfillWorldVersionReview(route)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/settings')
  await page.getByTestId('settings-world-setup-entry').click()

  const setup = page.getByTestId('settings-world-setup')
  await expect(setup).toBeVisible()
  await expect(setup).toContainText('Prepare the current world')
  await expect(setup).toContainText(PROVIDER_MODEL)
  await expect(setup).toContainText('Check whether the model understands your custom terms')
  expect(providerCalls, 'opening World Setup must not call the provider').toBe(0)

  const storageBefore = await readOwnedStorage(page)
  await page.getByTestId('settings-world-check').click()

  const result = page.getByTestId('settings-world-result')
  await expect(result).toBeVisible()
  expect(providerCalls, 'one explicit check should make exactly one provider call').toBe(1)
  await expect(result).toContainText('How the model understands it')
  await expect(result).toContainText('Chant Namer')
  await expect(result).toContainText('Interactions it can support')
  await expect(result).toContainText('Covenant passage')
  await expect(result).toContainText('Clear world rules')
  await expect(result).toContainText('Cannot rewrite settled history')
  await expect(result).toContainText('Worth adding or confirming')
  await expect(result).toContainText('The source does not define how a covenant is granted')

  const renderedText = (await setup.innerText()).toLowerCase()
  for (const hiddenTerm of [
    'semantic manifest',
    'runtime boundary',
    'schema',
    'compiler',
    'provider receipt',
  ]) {
    expect(renderedText).not.toContain(hiddenTerm)
  }

  expect(await readOwnedStorage(page)).toEqual(storageBefore)
  await expectNoHorizontalOverflow(page)
  await expectNoCriticalAxeViolations(page)

  await mkdir(VISUAL_EVIDENCE_DIR, { recursive: true })
  await page.screenshot({
    path: path.join(VISUAL_EVIDENCE_DIR, `${testInfo.project.name}-world-check.png`),
    fullPage: true,
    animations: 'disabled',
  })

  await navigateInsideUnlockedApp(page, '/home')
  await navigateInsideUnlockedApp(page, '/settings')
  await page.getByTestId('settings-world-setup-entry').click()
  await expect(page.getByTestId('settings-world-result')).toHaveCount(0)
  expect(providerCalls, 'returning to World Setup must not repeat the provider call').toBe(1)
  expect(await readOwnedStorage(page)).toEqual(storageBefore)
})

test('Settings activates a reviewed world version only after explicit confirmation', async ({
  page,
}) => {
  let providerCalls = 0
  await seedWorldSetup(page)
  await page.route(`${PROVIDER_ROOT}/**`, async (route) => {
    providerCalls += 1
    await fulfillWorldVersionReview(route)
  })

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/settings')
  await page.getByTestId('settings-world-setup-entry').click()
  await page.getByTestId('settings-world-check').click()
  await expect(page.getByTestId('settings-world-use-version')).toBeVisible()

  await page.getByTestId('settings-world-use-version').click()
  await expect(page.getByTestId('settings-world-version')).toBeVisible()
  await expect(page.getByTestId('settings-world-setup')).toContainText(
    'The updated world rules now apply to future content',
  )
  expect(providerCalls).toBe(1)

  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('schatphone:store:system')),
  )
  const worldSetting = stored.data.user.worldSetting
  expect(worldSetting.identity.worldId).toBe('world_local_primary')
  expect(worldSetting.semantic.activeVersionId).toBeTruthy()
  expect(worldSetting.semantic.versions).toHaveLength(1)
  expect(worldSetting.semantic.versions[0]).toMatchObject({
    worldId: 'world_local_primary',
    revision: 1,
    runtimeRegistryVersion: 'world-semantic-runtime-v1',
  })

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/settings')
  await page.getByTestId('settings-world-setup-entry').click()
  await expect(page.getByTestId('settings-world-version')).toBeVisible()
  await expect(page.getByTestId('settings-world-setup')).toContainText('World rules in use')
  expect(providerCalls, 'reopening a persisted version must not call the provider').toBe(1)
})
