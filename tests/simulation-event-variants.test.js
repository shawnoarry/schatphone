import { describe, expect, test } from 'vitest'
import {
  createBuiltInVariantPack,
  renderEventVariantCopy,
  selectEventVariant,
} from '../src/lib/simulation/event-variants'
import { WORLD_CONTEXT_FAMILY } from '../src/lib/simulation/world-context'

const templateId = 'food_delivery.rider_delay.v1'

const variantsByTemplateId = {
  [templateId]: [
    {
      id: 'daily_variant',
      worldScope: [WORLD_CONTEXT_FAMILY.DAILY],
      title: 'Daily delay',
      summaryTemplates: ['ETA {etaMinutes} min'],
    },
    {
      id: 'sci_fi_variant',
      worldScope: [WORLD_CONTEXT_FAMILY.SCI_FI],
      title: 'Drone delay',
      summaryTemplates: ['Drone ETA {etaMinutes} min'],
    },
  ],
}

describe('simulation event variants', () => {
  test('creates local variant packs and selects by world context family', () => {
    const worldContext = {
      id: 'world_context_sci_fi_test',
      genreTags: [WORLD_CONTEXT_FAMILY.SCI_FI],
      activeWorldBookIds: ['kp_city'],
    }
    const pack = createBuiltInVariantPack({
      worldContext,
      moduleKeys: ['food_delivery'],
      variantsByTemplateId,
      now: 100,
    })
    const selected = selectEventVariant({
      templateId,
      variantPack: pack,
      worldContext,
      randomValue: 0,
    })

    expect(pack).toMatchObject({
      worldContextId: 'world_context_sci_fi_test',
      activeWorldBookIds: ['kp_city'],
      source: 'built_in',
    })
    expect(selected).toMatchObject({
      reason: 'world_variant_selected',
      variant: {
        id: 'sci_fi_variant',
      },
    })
  })

  test('renders templates locally without API calls', () => {
    expect(
      renderEventVariantCopy(
        {
          id: 'variant_1',
          title: 'Drone delay',
          summaryTemplates: ['Drone ETA {etaMinutes} min near {timeHint}.'],
        },
        {
          etaMinutes: 42,
          timeHint: '12:30',
        },
        { randomValue: 0 },
      ),
    ).toMatchObject({
      title: 'Drone delay',
      summary: 'Drone ETA 42 min near 12:30.',
    })
  })
})
