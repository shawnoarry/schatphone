import {
  cloneEventValue,
  normalizeEventTemplateV2,
  normalizeEventVariantPackV1,
} from './event-contracts'
import { createEventTemplateRegistry, createEventVariantPackRegistry } from './event-registry'

export const KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID = 'workplace.arrival_briefing'
export const KPOP_REALISM_EVENT_PACK_ID = 'kpop-realism-core-events'
export const KPOP_REALISM_EVENT_ADAPTER_KEY = 'map.place_session.validate_event_resolution'

const RAW_ARRIVAL_BRIEFING_TEMPLATE = {
  schemaVersion: 2,
  id: KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
  version: 1,
  archetypeId: 'arrival_briefing',
  owner: {
    sourceModuleKey: 'map',
    effectModuleKey: 'map',
  },
  source: {
    recordType: 'map_place_session',
    checkpointId: 'map.place_session.entered.v1',
  },
  trigger: {
    modes: ['condition'],
    activationScope: 'interior',
    discoverability: 'hidden_until_eligible',
    probability: 1,
    cooldownMs: 21_600_000,
    dailyLimit: 1,
    targetScope: 'place_id',
    modulePermissionKey: 'map',
    intensityPolicy: 'enabled_when_not_off',
  },
  eligibility: {
    requiredPlaceCategoryIds: ['broadcast_station', 'entertainment_agency', 'production_center'],
    requiredCapabilityIds: ['work', 'wait'],
    acceptedPositionProvenance: ['manual', 'journey_arrival'],
    requiredPlaceSessionState: 'inside',
    conditions: [
      { key: 'placeSession.state', op: 'eq', value: 'inside' },
      { key: 'placeSession.revision', op: 'gt', value: 0 },
    ],
  },
  presentation: {
    surfaceKeys: ['map.event_invitation', 'map.event_detail'],
    expansionKind: 'host_detail',
    textMaterializationMode: 'optional_ai_after_entry',
    mediaIntentKey: 'workplace.arrival_briefing.lobby',
  },
  choices: [
    {
      id: 'review_brief',
      outcomeId: 'brief_reviewed',
      effectRequest: {
        adapterKey: KPOP_REALISM_EVENT_ADAPTER_KEY,
        payloadSchema: 'MapPlaceSessionEventResolutionRequestV1',
      },
    },
    {
      id: 'check_equipment',
      outcomeId: 'equipment_checked',
      effectRequest: {
        adapterKey: KPOP_REALISM_EVENT_ADAPTER_KEY,
        payloadSchema: 'MapPlaceSessionEventResolutionRequestV1',
      },
    },
    {
      id: 'wait_for_staff',
      outcomeId: 'wait_acknowledged',
      effectRequest: {
        adapterKey: KPOP_REALISM_EVENT_ADAPTER_KEY,
        payloadSchema: 'MapPlaceSessionEventResolutionRequestV1',
      },
    },
  ],
  safety: {
    risk: 'low',
    requiresAdditionalConfirmation: false,
    reversibleExternalMutation: true,
    externalMutation: 'none',
    relationshipGatePresetId: '',
  },
}

const RAW_KPOP_REALISM_EVENT_PACK = {
  schemaVersion: 1,
  id: KPOP_REALISM_EVENT_PACK_ID,
  version: 1,
  worldContextFamily: 'daily',
  contentProfileId: 'kpop_realism',
  locales: ['zh-CN', 'en'],
  templateVariants: {
    [KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID]: [
      {
        id: 'kpop-realism.production-arrival-briefing.standard',
        version: 1,
        placeCategoryIds: ['broadcast_station', 'entertainment_agency', 'production_center'],
        toneTags: ['professional', 'grounded', 'low_pressure'],
        participantSlots: [
          {
            id: 'staff_coordinator',
            kind: 'role_slot',
            required: false,
            fallbackLabelZh: '现场协调人员',
            fallbackLabelEn: 'Staff coordinator',
          },
        ],
        localCopy: {
          invitation: {
            titleZh: '到达后的简短准备',
            titleEn: 'A short arrival briefing',
            summaryZh: '进入制作场所后，一份简短的现场说明正在等你确认。',
            summaryEn:
              'A short on-site briefing is ready after you enter the production workplace.',
          },
          scene: {
            titleZh: '制作场所到达简报',
            titleEn: 'Production arrival briefing',
            openingZh: '大厅里的工作节奏已经开始。正式进入下一段安排前，你还有一点准备时间。',
            openingEn:
              'The workplace is already settling into its rhythm. You have a little preparation time before the next block begins.',
            environmentZh: '签到台、通行提示和今天的工作信息都保持在不打扰人的低声秩序里。',
            environmentEn:
              "The check-in desk, access notices, and today's production notes sit in a quiet working order.",
          },
          choicesById: {
            review_brief: { labelZh: '查看现场简报', labelEn: 'Review the briefing' },
            check_equipment: { labelZh: '确认随身设备', labelEn: 'Check your equipment' },
            wait_for_staff: { labelZh: '在等候区稍候', labelEn: 'Wait for staff' },
          },
          consequencesByOutcomeId: {
            brief_reviewed: {
              zh: '你看完了当前的现场说明，接下来可以按自己的节奏继续。',
              en: 'You finish the current briefing and can continue at your own pace.',
            },
            equipment_checked: {
              zh: '你确认了随身设备，没有产生额外的物品或数值变化。',
              en: 'You check the equipment you brought. No inventory or value change is created.',
            },
            wait_acknowledged: {
              zh: '你在等候区留出了一点时间，现场安排本身没有被改写。',
              en: 'You leave a little time in the waiting area without rewriting the underlying schedule.',
            },
          },
        },
        mediaIntent: {
          schemaVersion: 1,
          slot: 'scene_background',
          sceneKey: 'workplace.arrival_briefing.lobby',
          requiredCapabilityIds: ['work', 'wait'],
          toneTags: ['professional', 'daytime', 'quiet'],
          required: false,
          fallbackMode: 'text_only',
        },
      },
    ],
  },
}

export const BUILT_IN_KPOP_EVENT_TEMPLATE = normalizeEventTemplateV2(RAW_ARRIVAL_BRIEFING_TEMPLATE)
export const BUILT_IN_KPOP_EVENT_PACK = normalizeEventVariantPackV1(RAW_KPOP_REALISM_EVENT_PACK)

export const createBuiltInKpopEventRegistries = () => {
  const templateRegistry = createEventTemplateRegistry([BUILT_IN_KPOP_EVENT_TEMPLATE], {
    adapterKeys: [KPOP_REALISM_EVENT_ADAPTER_KEY],
  })
  const variantPackRegistry = createEventVariantPackRegistry([BUILT_IN_KPOP_EVENT_PACK], {
    templateRegistry,
  })
  return { templateRegistry, variantPackRegistry }
}

export const getBuiltInKpopEventTemplate = () => cloneEventValue(BUILT_IN_KPOP_EVENT_TEMPLATE)
export const getBuiltInKpopEventPack = () => cloneEventValue(BUILT_IN_KPOP_EVENT_PACK)
