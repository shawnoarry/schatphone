import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  buildSharedExperienceMemoryKey,
  normalizeSharedExperiencesV1,
  normalizeSharedExperienceV1,
} from '../src/lib/shared-experience-contract'

const fixture = JSON.parse(
  readFileSync(
    resolve(
      'tests/fixtures/relationships/shared-experience-v1/gift-experience-v1.json',
    ),
    'utf8',
  ),
)

describe('shared experience V1 contract', () => {
  test('keeps the gift journey as one experience with three progress points and one memory', () => {
    const result = normalizeSharedExperiencesV1(fixture.experiences)

    expect(result).toEqual({
      experiences: fixture.experiences,
      rejected: [],
      inputCount: 1,
    })
    const [experience] = result.experiences
    expect(experience.progress).toHaveLength(3)
    expect(experience.roleMemory).toEqual(fixture.experiences[0].roleMemory)
    expect(experience.roleMemory.memoryKey).toBe(
      buildSharedExperienceMemoryKey(experience.id),
    )
  })

  test('keeps owner-native records as references instead of extra role memories', () => {
    const experience = normalizeSharedExperienceV1(fixture.experiences[0])

    expect(experience.ownerRecordRefs.map((ref) => ref.ownerModule)).toEqual([
      'shopping',
      'wallet',
      'calendar',
      'phone',
    ])
    expect(experience.ownerRecordRefs.map((ref) => ref.recordId)).toEqual([
      'shopping_order_gift_xia_august_2026',
      'wallet_transaction_gift_xia_august_2026',
      'calendar_event_gift_xia_delivery',
      'phone_call_xia_gift_feedback',
    ])
    expect(Array.isArray(experience.roleMemory)).toBe(false)
  })

  test('fails closed for dangling, duplicate, or out-of-order evidence', () => {
    const dangling = structuredClone(fixture.experiences[0])
    dangling.progress[2].ownerRecordRefIds = ['phone:call:missing']

    const duplicate = structuredClone(fixture.experiences[0])
    duplicate.ownerRecordRefs.push({
      ...duplicate.ownerRecordRefs[3],
      id: 'phone:call:xia_gift_feedback_copy',
      ownerRevision: 2,
    })
    duplicate.progress[2].ownerRecordRefIds.push('phone:call:xia_gift_feedback_copy')

    const outOfOrder = structuredClone(fixture.experiences[0])
    outOfOrder.progress[1].occurredAt = outOfOrder.progress[2].occurredAt + 1

    expect(normalizeSharedExperienceV1(dangling)).toBeNull()
    expect(normalizeSharedExperienceV1(duplicate)).toBeNull()
    expect(normalizeSharedExperienceV1(outOfOrder)).toBeNull()
  })

  test('rejects oversized text instead of silently shortening it', () => {
    const oversized = structuredClone(fixture.experiences[0])
    oversized.roleMemory.summary = 'x'.repeat(1001)

    expect(normalizeSharedExperienceV1(oversized)).toBeNull()
  })

  test('reports invalid and duplicate experiences without hiding the input count', () => {
    const result = normalizeSharedExperiencesV1([
      fixture.experiences[0],
      fixture.experiences[0],
      { schemaVersion: 1, id: 'invalid' },
    ])

    expect(result.experiences).toHaveLength(1)
    expect(result.inputCount).toBe(3)
    expect(result.rejected).toEqual([
      {
        index: 1,
        id: 'gift_xia_august_2026',
        reason: 'duplicate_shared_experience_id',
      },
      { index: 2, id: 'invalid', reason: 'invalid_shared_experience_v1' },
    ])
  })
})
