import { describe, expect, test } from 'vitest'
import {
  createEmptyRoleAssetFolderBindings,
  createEmptyRoleAssetPack,
  createRoleBindingContract,
  normalizeRoleAssetFolderBindings,
  normalizeRoleAssetPack,
  toRoleBindingAssetContext,
} from '../src/lib/role-binding-contract'

describe('role binding contract helpers', () => {
  test('normalizes and deduplicates role asset pack ids', () => {
    const normalized = normalizeRoleAssetPack({
      wallpaperAssetIds: ['asset_a', 'asset_a', 'illegal id', 'asset_b'],
      emojiAssetIds: ['emoji_1', 'emoji_1'],
      referenceAssetIds: ['ref_a'],
      scenarioAssetIds: [null, 'scene_a'],
    })

    expect(normalized.wallpaperAssetIds).toEqual(['asset_a', 'asset_b'])
    expect(normalized.emojiAssetIds).toEqual(['emoji_1'])
    expect(normalized.referenceAssetIds).toEqual(['ref_a'])
    expect(normalized.scenarioAssetIds).toEqual(['scene_a'])
  })

  test('creates role contract with avatar hierarchy and recommended asset', () => {
    const contract = createRoleBindingContract({
      moduleKey: 'map',
      contact: {
        id: 7,
        kind: 'role',
        name: 'Ari',
        profileId: 9,
      },
      profile: {
        id: 9,
        name: 'Ari Prime',
        role: 'Guide',
        isMain: true,
      },
      relationshipLevel: 88,
      relationshipNote: 'Thread note',
      preferredImageAssetId: '',
      profileAssetPack: {
        referenceAssetIds: ['asset_ref_1'],
        scenarioAssetIds: ['asset_scene_1'],
      },
      profileAssetFolderBindings: {
        imageReference: {
          folderId: 'folder_ref',
          folderPriority: 15,
          folderPriorityChain: ['folder_ref', 'folder_ref_backup'],
        },
      },
      avatarSources: {
        threadAvatar: 'https://example.com/thread.png',
        moduleAvatar: 'https://example.com/module.png',
        globalAvatar: 'https://example.com/global.png',
        fallbackSeed: 'Ari',
      },
    })

    expect(contract.moduleKey).toBe('map')
    expect(contract.roleBound).toBe(true)
    expect(contract.avatar.activeLayer).toBe('thread')
    expect(contract.avatar.resolved).toBe('https://example.com/thread.png')
    expect(contract.relationship.level).toBe(88)
    expect(contract.assets.recommendedImageAssetId).toBe('asset_ref_1')
    expect(contract.assets.profileAssetIds).toContain('asset_ref_1')
    expect(contract.assets.profileAssetFolderBindings.imageReference.folderId).toBe('folder_ref')
    expect(contract.assets.profileAssetFolderBindings.imageReference.folderPriority).toBe(15)
  })

  test('maps contract to legacy-friendly role asset context shape', () => {
    const contract = createRoleBindingContract({
      contact: {
        id: 1,
        kind: 'role',
        name: 'Eva',
        profileId: 11,
      },
      profile: {
        id: 11,
        name: 'Eva',
      },
      preferredImageAssetId: 'asset_custom',
      profileAssetPack: {
        wallpaperAssetIds: ['asset_wall'],
      },
      avatarSources: {
        fallbackSeed: 'Eva',
      },
    })

    const context = toRoleBindingAssetContext(contract)
    expect(context.profileId).toBe(11)
    expect(context.profileName).toBe('Eva')
    expect(context.preferredImageAssetId).toBe('asset_custom')
    expect(context.recommendedImageAssetId).toBe('asset_custom')
    expect(context.profileAssetPack.wallpaperAssetIds).toEqual(['asset_wall'])
    expect(context.profileAssetIds).toEqual(['asset_wall'])
    expect(context.profileAssetFolderBindings.profileImage.folderId).toBe('')
  })

  test('empty pack helper always returns all expected categories', () => {
    const empty = createEmptyRoleAssetPack()
    expect(empty).toEqual({
      wallpaperAssetIds: [],
      emojiAssetIds: [],
      referenceAssetIds: [],
      scenarioAssetIds: [],
    })
  })

  test('normalizes role folder bindings with v1 single-folder schema and reserved priority fields', () => {
    const normalized = normalizeRoleAssetFolderBindings({
      profileImage: {
        folderId: 'folder_profile',
        folderPriority: 10,
        folderPriorityChain: ['folder_profile', 'folder_backup', 'folder_profile'],
      },
      emojiPack: {
        folderId: 'invalid folder id',
        folderPriority: -100,
        folderPriorityChain: ['folder_emoji', 'invalid folder'],
      },
    })

    expect(normalized.profileImage.folderId).toBe('folder_profile')
    expect(normalized.profileImage.folderPriority).toBe(10)
    expect(normalized.profileImage.folderPriorityChain).toEqual(['folder_profile', 'folder_backup'])
    expect(normalized.emojiPack.folderId).toBe('')
    expect(normalized.emojiPack.folderPriority).toBe(0)
    expect(normalized.emojiPack.folderPriorityChain).toEqual(['folder_emoji'])
    expect(normalized.dynamicMedia.folderId).toBe('')
    expect(normalized.imageReference.folderPriorityChain).toEqual([])
  })

  test('empty folder bindings helper returns all expected slots', () => {
    const empty = createEmptyRoleAssetFolderBindings()
    expect(empty).toEqual({
      profileImage: {
        folderId: '',
        folderPriority: 0,
        folderPriorityChain: [],
      },
      dynamicMedia: {
        folderId: '',
        folderPriority: 0,
        folderPriorityChain: [],
      },
      emojiPack: {
        folderId: '',
        folderPriority: 0,
        folderPriorityChain: [],
      },
      imageReference: {
        folderId: '',
        folderPriority: 0,
        folderPriorityChain: [],
      },
    })
  })
})
