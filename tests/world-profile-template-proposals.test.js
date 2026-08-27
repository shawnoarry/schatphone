import { describe, expect, test, vi } from 'vitest'
import {
  buildDeterministicWorldProfileTemplateProposal,
  extractWorldProfileTemplateProposalWithAI,
  normalizeWorldProfileTemplateProposalPayload,
} from '../src/lib/world-profile-template-proposals'
import { BUILT_IN_WORLD_PACKS } from '../src/lib/world-pack-schema'

const findPack = (packId) => BUILT_IN_WORLD_PACKS.find((pack) => pack.id === packId)

describe('world profile template proposals', () => {
  test('generates different editable structures for fandom and xianxia worlds', () => {
    const fandom = buildDeterministicWorldProfileTemplateProposal({
      worldPack: findPack('fandom_parallel'),
      worldPacks: [findPack('fandom_parallel')],
      locale: 'zh-CN',
    })
    const xianxia = buildDeterministicWorldProfileTemplateProposal({
      worldContextText: '这是一个仙侠修行世界，宗门、灵根与法器决定人物身份。',
      locale: 'zh-CN',
    })

    expect(fandom.matchedRuleIds).toContain('fandom')
    expect(fandom.draft.fields.map((field) => field.id)).toEqual(
      expect.arrayContaining(['stage_name', 'group_role', 'debut_date']),
    )
    expect(xianxia.matchedRuleIds).toContain('xianxia')
    expect(xianxia.draft.fields.map((field) => field.id)).toEqual(
      expect.arrayContaining(['species_origin', 'cultivation_stage', 'spiritual_root']),
    )
    expect(xianxia.draft.fields.map((field) => field.id)).not.toContain('stage_name')
  })

  test('keeps a universal identity foundation without a clear world signal', () => {
    const review = buildDeterministicWorldProfileTemplateProposal({
      worldContextText: '',
      worldPack: findPack('default_world'),
    })

    expect(review.fallbackUsed).toBe(true)
    expect(review.draft.fields.map((field) => field.id)).toEqual([
      'occupation',
      'public_identity',
      'affiliation',
    ])
  })

  test('uses only recommended pack traits and keeps stable semantic field ids', () => {
    const modern = buildDeterministicWorldProfileTemplateProposal({
      worldPack: findPack('modern_parallel'),
      worldPacks: [findPack('modern_parallel')],
    })
    const repeated = buildDeterministicWorldProfileTemplateProposal({
      worldPack: findPack('modern_parallel'),
      worldPacks: [findPack('modern_parallel')],
    })

    expect(modern.matchedRuleIds).toContain('modern')
    expect(modern.matchedRuleIds).not.toContain('fandom')
    expect(modern.draft.fields.map((field) => field.id)).toEqual(
      repeated.draft.fields.map((field) => field.id),
    )
    expect(modern.draft.fields.map((field) => field.id)).toEqual(
      expect.arrayContaining(['occupation', 'affiliation', 'public_identity']),
    )
  })

  test('safely filters AI field types, purposes, visibility, and entity types', () => {
    const review = normalizeWorldProfileTemplateProposalPayload({
      title: 'AI suggestion',
      categories: [{ id: 'identity', label: 'Identity' }],
      fields: [
        {
          id: 'public_identity',
          categoryId: 'identity',
          label: 'Public identity',
          type: 'unsupported_number',
          purposes: ['chat_context', 'event_eligibility', 'unknown_purpose'],
          entityTypes: ['unknown_person_type'],
          defaultVisibilityLevel: 'unknown_visibility',
        },
        {
          id: 'biography',
          categoryId: 'identity',
          label: 'Biography',
          type: 'long_text',
          purposes: ['chat_context', 'event_eligibility', 'work_hub_matching'],
        },
      ],
    })

    expect(review.draft.fields[0]).toMatchObject({
      id: 'public_identity',
      type: 'short_text',
      purposes: ['chat_context', 'event_eligibility'],
      defaultVisibilityLevel: 'world_specific',
      entityTypes: ['self_profile', 'main_role', 'supporting_role', 'npc'],
    })
    expect(review.draft.fields[1].purposes).toEqual(['chat_context'])
  })

  test('returns no draft when AI output cannot be parsed', async () => {
    const callAi = vi.fn(async () => 'not json')
    const result = await extractWorldProfileTemplateProposalWithAI({ callAi })

    expect(result).toMatchObject({ ok: false, reason: 'parse_failed', review: null })
  })

  test('does not mutate existing templates while building a proposal', () => {
    const existingTemplates = [
      {
        id: 'world_template_existing',
        title: 'Existing',
        categories: [{ id: 'general', label: 'General' }],
        fields: [{ id: 'occupation', categoryId: 'general', label: 'Occupation' }],
      },
    ]
    const before = structuredClone(existingTemplates)

    buildDeterministicWorldProfileTemplateProposal({
      worldPack: findPack('fandom_parallel'),
      worldPacks: [findPack('fandom_parallel')],
      existingTemplates,
    })

    expect(existingTemplates).toEqual(before)
  })
})
