import { describe, expect, test } from 'vitest'
import {
  buildWorldServiceTemplateChatContactPayload,
  buildWorldServiceTemplateGenerationRows,
} from '../src/lib/world-pack-service-accounts'
import { normalizeWorldPack } from '../src/lib/world-pack-schema'

describe('world pack service account generation helpers', () => {
  test('maps a marketplace service template to a Chat Directory service account payload', () => {
    const pack = normalizeWorldPack({
      id: 'survival_city',
      title: '灾后生存都市',
      appBindings: [
        {
          id: 'survival_supply_board',
          archetype: 'marketplace',
          title: '补给站',
          moduleKey: 'shopping',
        },
      ],
      serviceAccountTemplates: [
        {
          id: 'survival_supply_dispatch',
          title: '补给调度员',
          category: 'service_notification',
          description: '发送补给与配送更新。',
          linkedAppBindingId: 'survival_supply_board',
        },
      ],
    })

    expect(buildWorldServiceTemplateChatContactPayload({
      pack,
      templateId: 'survival_supply_dispatch',
    })).toMatchObject({
      name: '补给调度员',
      kind: 'service',
      role: 'Service',
      serviceTemplate: '补给调度员',
      shoppingServiceKey: 'daily_fresh',
      logisticsServiceKey: '',
      foodDeliveryServiceKey: '',
      worldPackId: 'survival_city',
      worldServiceTemplateId: 'survival_supply_dispatch',
      worldAppBindingId: 'survival_supply_board',
    })
  })

  test('maps a publication template to an official account without source-module writes', () => {
    const pack = normalizeWorldPack({
      id: 'fandom_parallel',
      title: '偶像企划平行世界',
      appBindings: [
        {
          id: 'fandom_publication_feed',
          archetype: 'publication_feed',
          title: '粉丝站',
          moduleKey: 'chat',
        },
      ],
      serviceAccountTemplates: [
        {
          id: 'fandom_official_feed',
          title: '官方粉丝站',
          category: 'publication',
          linkedAppBindingId: 'fandom_publication_feed',
        },
      ],
    })

    expect(buildWorldServiceTemplateChatContactPayload({
      pack,
      templateId: 'fandom_official_feed',
    })).toMatchObject({
      name: '官方粉丝站',
      kind: 'official',
      shoppingServiceKey: '',
      logisticsServiceKey: '',
      foodDeliveryServiceKey: '',
    })
  })

  test('marks generation rows as generated when a matching contact already exists', () => {
    const pack = normalizeWorldPack({
      id: 'modern_parallel',
      serviceAccountTemplates: [{ id: 'modern_city_bulletin', title: '城市公告频道' }],
    })

    const rows = buildWorldServiceTemplateGenerationRows({
      pack,
      findExistingContact: (packId, templateId) => ({
        id: 42,
        worldPackId: packId,
        worldServiceTemplateId: templateId,
      }),
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      generated: true,
      contactId: 42,
    })
  })

  test('describes source notification plans before and after join', () => {
    const pack = normalizeWorldPack({
      id: 'survival_city',
      appBindings: [
        {
          id: 'survival_dispatch',
          archetype: 'dispatch',
          title: 'Dispatch',
          moduleKey: 'food_delivery',
        },
      ],
      serviceAccountTemplates: [
        {
          id: 'shelter_bulletin',
          title: 'Shelter Bulletin',
          linkedAppBindingId: 'survival_dispatch',
        },
      ],
    })

    const availableRows = buildWorldServiceTemplateGenerationRows({ pack })
    expect(availableRows[0].sourceNotificationPlan).toMatchObject({
      status: 'available_after_join',
      rows: [
        expect.objectContaining({
          sourceModule: 'food_delivery_chat_push',
          serviceBindingKey: 'foodDeliveryServiceKey',
        }),
      ],
    })

    const joinedRows = buildWorldServiceTemplateGenerationRows({
      pack,
      findExistingContact: () => ({ id: 77 }),
    })
    expect(joinedRows[0].sourceNotificationPlan.status).toBe('ready')
    expect(joinedRows[0].sourcePlanSummary).toContain('can push event-driven updates')
  })
})
