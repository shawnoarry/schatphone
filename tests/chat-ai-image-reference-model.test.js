import { describe, expect, test, vi } from 'vitest'
import {
  CHAT_AI_IMAGE_REFERENCE_LIMITS,
  buildChatAssistantImageReferenceMeta,
  useChatAiImageReferenceModel,
} from '../src/composables/useChatAiImageReferenceModel'

const t = (zh, en) => en || zh

const createGalleryStore = () => {
  const assets = {
    context_large: { id: 'context_large', name: 'Large Context', category: 'reference' },
    context_resolved: { id: 'context_resolved', name: 'Resolved Context', category: 'reference' },
    context_url: { id: 'context_url', name: 'Explicit Context', category: 'reference' },
    preferred: { id: 'preferred', name: 'Preferred Pose', category: 'reference' },
    pack_ref: { id: 'pack_ref', name: 'Pack Reference', category: 'reference' },
    role_emoji: { id: 'role_emoji', name: 'Role Emoji', category: 'emoji' },
    scenario: { id: 'scenario', name: 'Scenario Beat', category: 'scenario' },
    folder_ref: { id: 'folder_ref', name: 'Folder Reference', category: 'reference' },
    folder_dynamic: { id: 'folder_dynamic', name: 'Folder Dynamic', category: 'reference' },
    folder_profile: { id: 'folder_profile', name: 'Folder Profile', category: 'wallpaper' },
  }
  const folders = {
    ref_folder: {
      id: 'ref_folder',
      assetIds: ['folder_ref', 'role_emoji', 'folder_ref'],
    },
    dynamic_folder: {
      id: 'dynamic_folder',
      assetIds: ['folder_dynamic'],
    },
    profile_folder: {
      id: 'profile_folder',
      assetIds: ['folder_profile'],
    },
  }

  return {
    findAssetById: vi.fn((assetId) => assets[assetId] || null),
    findFolderById: vi.fn((folderId) => folders[folderId] || null),
    getAssetAiReferenceUrl: vi.fn(async (assetId, options) => {
      expect(options).toMatchObject({
        maxBytes: CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferenceImageBytes,
      })
      if (assetId === 'context_large' || assetId === 'folder_dynamic') {
        return { ok: false, reason: 'blob_too_large' }
      }
      return {
        ok: true,
        url: `data:image/png;base64,${assetId}`,
      }
    }),
  }
}

const createChatStore = () => ({
  getRoleBindingContract: vi.fn(() => ({
    roleBound: true,
    profile: { name: 'Mina' },
    contact: { name: 'Fallback Contact' },
    assets: {
      preferredImageAssetId: 'preferred',
      profileAssetPack: {
        referenceAssetIds: ['pack_ref', 'preferred', 'role_emoji'],
        scenarioAssetIds: ['scenario'],
      },
      profileAssetFolderBindings: {
        imageReference: { folderId: 'ref_folder' },
        dynamicMedia: { folderId: 'dynamic_folder' },
        profileImage: { folderId: 'profile_folder' },
      },
    },
  })),
})

const createModel = () => {
  const galleryStore = createGalleryStore()
  const chatStore = createChatStore()
  return {
    chatStore,
    galleryStore,
    model: useChatAiImageReferenceModel({
      chatStore,
      galleryStore,
      t,
    }),
  }
}

describe('Chat AI image reference model interface', () => {
  test('normalizes assistant image-reference metadata without ChatView state', () => {
    const meta = buildChatAssistantImageReferenceMeta(
      {
        finalTransportMode: 'unsupported',
        referenceCount: 99,
        fallbackUsed: 1,
        apiKind: 'provider-name-that-is-longer-than-thirty-two-characters',
      },
      1,
      'fallback-provider',
    )

    expect(meta.imageReferenceMode).toBe('none')
    expect(meta.imageReferenceCount).toBe(CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferences)
    expect(meta.imageReferenceFallback).toBe(true)
    expect(meta.imageReferenceProvider).toHaveLength(
      CHAT_AI_IMAGE_REFERENCE_LIMITS.maxProviderLength,
    )

    expect(buildChatAssistantImageReferenceMeta(null, 2, 'openai_compatible')).toMatchObject({
      imageReferenceMode: 'none',
      imageReferenceCount: 2,
      imageReferenceFallback: false,
      imageReferenceProvider: 'openai_compatible',
    })
  })

  test('collects newest-first user context image references and prepares Gallery URLs', async () => {
    const { galleryStore, model } = createModel()

    const references = await model.collectImageReferencesFromContextMessages([
      {
        role: 'user',
        blocks: [
          {
            type: 'image_virtual',
            assetId: 'old_context',
            alt: 'Old Context',
            url: 'https://old.example/image.png',
          },
        ],
      },
      {
        role: 'assistant',
        blocks: [
          {
            type: 'image_virtual',
            assetId: 'assistant_ignored',
            url: 'https://assistant.example/image.png',
          },
        ],
      },
      {
        role: 'user',
        blocks: [
          { type: 'image_virtual', assetId: 'context_large', caption: 'large local image' },
          {
            type: 'image_virtual',
            assetId: 'context_url',
            alt: 'Explicit Context',
            caption: 'explicit caption',
            url: ' https://explicit.example/image.png ',
          },
          { type: 'image_virtual', assetId: 'context_resolved' },
          { type: 'image_virtual', assetId: 'context_resolved' },
        ],
      },
    ])

    expect(references.map((item) => item.assetId)).toEqual([
      'context_large',
      'context_url',
      'context_resolved',
    ])
    expect(references[0]).toMatchObject({
      label: 'Large Context',
      sourceUrl: '',
    })
    expect(references[0].note).toContain('large local image')
    expect(references[0].note).toContain('Local image too large')
    expect(references[1]).toMatchObject({
      label: 'Explicit Context',
      note: 'explicit caption',
      sourceUrl: 'https://explicit.example/image.png',
    })
    expect(references[2]).toMatchObject({
      label: 'Resolved Context',
      note: 'From chat context',
      sourceUrl: 'data:image/png;base64,context_resolved',
    })
    expect(galleryStore.getAssetAiReferenceUrl).toHaveBeenCalledTimes(2)
    expect(galleryStore.getAssetAiReferenceUrl).not.toHaveBeenCalledWith(
      'context_url',
      expect.anything(),
    )
  })

  test('builds role-bound reference candidates from pack and folder bindings', () => {
    const { model } = createModel()

    const candidates = model.buildRoleBoundReferenceCandidates(7)

    expect(candidates.profileName).toBe('Mina')
    expect(candidates.candidateAssetIds).toEqual([
      'preferred',
      'pack_ref',
      'role_emoji',
      'scenario',
      'folder_ref',
      'folder_dynamic',
      'folder_profile',
    ])
    expect(candidates.sourceByAssetId.folder_ref.slotKeys).toEqual(['imageReference'])
    expect(candidates.sourceByAssetId.folder_dynamic.slotKeys).toEqual(['dynamicMedia'])
    expect(candidates.sourceByAssetId.folder_profile.slotKeys).toEqual(['profileImage'])
  })

  test('collects role-bound references while filtering excluded, emoji, and oversized assets', async () => {
    const { galleryStore, model } = createModel()

    const references = await model.collectImageReferencesFromRoleBindings(7, {
      limit: 4,
      excludeAssetIds: [' preferred '],
    })

    expect(references.map((item) => item.assetId)).toEqual([
      'pack_ref',
      'scenario',
      'folder_ref',
      'folder_dynamic',
    ])
    expect(references.find((item) => item.assetId === 'role_emoji')).toBeUndefined()
    expect(references[0].note).toBe('From role-bound asset (Mina)')
    expect(references[2].note).toBe('From role-bound asset (Reference · Mina)')
    expect(references[3]).toMatchObject({
      sourceUrl: '',
      label: 'Folder Dynamic',
    })
    expect(references[3].note).toContain('Dynamic · Mina')
    expect(references[3].note).toContain('Local image too large')
    expect(galleryStore.getAssetAiReferenceUrl).toHaveBeenCalledWith('pack_ref', {
      maxBytes: CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferenceImageBytes,
    })
    expect(galleryStore.getAssetAiReferenceUrl).not.toHaveBeenCalledWith(
      'preferred',
      expect.anything(),
    )
    expect(galleryStore.getAssetAiReferenceUrl).not.toHaveBeenCalledWith(
      'role_emoji',
      expect.anything(),
    )
  })

  test('merges context references first, then fills remaining slots from role bindings', async () => {
    const { model } = createModel()

    const references = await model.collectImageReferencesForAiCall(7, [
      {
        role: 'user',
        blocks: [
          {
            type: 'image_virtual',
            assetId: 'preferred',
            alt: 'Context Preferred',
            url: 'https://context.example/preferred.png',
          },
          { type: 'image_virtual', assetId: 'context_resolved' },
        ],
      },
    ])

    expect(references.map((item) => item.assetId)).toEqual([
      'preferred',
      'context_resolved',
      'pack_ref',
    ])
    expect(references[0]).toMatchObject({
      label: 'Context Preferred',
      sourceUrl: 'https://context.example/preferred.png',
    })
  })
})
