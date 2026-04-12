import { describe, expect, test } from 'vitest'
import {
  getRoleAssetFolderIdChain,
  getRoleAssetFolderSlotKeysByCategory,
  resolveFolderBoundAssetIds,
} from '../src/lib/role-asset-folder-resolver'

const createMockGalleryStore = () => {
  const assets = {
    asset_ref_1: { id: 'asset_ref_1', category: 'reference' },
    asset_scene_1: { id: 'asset_scene_1', category: 'scenario' },
    asset_emoji_1: { id: 'asset_emoji_1', category: 'emoji' },
    asset_wall_1: { id: 'asset_wall_1', category: 'wallpaper' },
  }
  const folders = {
    folder_ref: {
      id: 'folder_ref',
      assetIds: ['asset_ref_1', 'asset_scene_1', 'asset_ref_1', 'missing_asset'],
    },
    folder_emoji: {
      id: 'folder_emoji',
      assetIds: ['asset_emoji_1', 'asset_ref_1'],
    },
    folder_chain: {
      id: 'folder_chain',
      assetIds: ['asset_wall_1'],
    },
  }
  return {
    findAssetById: (id) => assets[id] || null,
    findFolderById: (id) => folders[id] || null,
  }
}

describe('role asset folder resolver', () => {
  test('returns expected slot key mapping by category', () => {
    expect(getRoleAssetFolderSlotKeysByCategory('emoji')).toEqual(['emojiPack'])
    expect(getRoleAssetFolderSlotKeysByCategory('reference')).toEqual([
      'imageReference',
      'dynamicMedia',
      'profileImage',
    ])
    expect(getRoleAssetFolderSlotKeysByCategory('unknown')).toEqual([
      'profileImage',
      'dynamicMedia',
      'emojiPack',
      'imageReference',
    ])
  })

  test('builds folder chain with primary + priority chain dedupe', () => {
    const chain = getRoleAssetFolderIdChain(
      {
        imageReference: {
          folderId: 'folder_ref',
          folderPriorityChain: ['folder_ref', 'folder_chain', 'folder_chain'],
        },
      },
      'imageReference',
    )

    expect(chain).toEqual(['folder_ref', 'folder_chain'])
  })

  test('resolves bound asset ids with source trace and category filter', () => {
    const galleryStore = createMockGalleryStore()

    const allResolved = resolveFolderBoundAssetIds(
      galleryStore,
      {
        imageReference: { folderId: 'folder_ref' },
        emojiPack: { folderId: 'folder_emoji' },
        profileImage: { folderId: 'folder_chain' },
      },
      ['imageReference', 'emojiPack'],
      { category: 'all' },
    )

    expect(allResolved.assetIds).toEqual(['asset_ref_1', 'asset_scene_1', 'asset_emoji_1'])
    expect(allResolved.sourceByAssetId.asset_ref_1.slotKeys).toEqual(['imageReference', 'emojiPack'])
    expect(allResolved.sourceByAssetId.asset_ref_1.folderIds).toEqual(['folder_ref', 'folder_emoji'])

    const emojiOnly = resolveFolderBoundAssetIds(
      galleryStore,
      {
        imageReference: { folderId: 'folder_ref' },
        emojiPack: { folderId: 'folder_emoji' },
      },
      ['imageReference', 'emojiPack'],
      { category: 'emoji' },
    )
    expect(emojiOnly.assetIds).toEqual(['asset_emoji_1'])
  })
})

