import { describe, expect, test } from 'vitest'
import {
  COMPLETE_BACKUP_MAGIC,
  COMPLETE_BACKUP_SCHEMA_VERSION,
  COMPLETE_BACKUP_SECTION_PATHS,
  createCompleteBackupPackage,
  inspectCompleteBackupPackage,
} from '../src/lib/complete-backup-package'

const createPayload = ({ includeMaterial = true } = {}) => {
  const binaryText = 'retained-gallery-binary'
  const dataUrl = `data:image/png;base64,${Buffer.from(binaryText).toString('base64')}`
  const payload = {
    backupMeta: {
      schemaVersion: COMPLETE_BACKUP_SCHEMA_VERSION,
      exportedAt: 1_786_144_000_000,
      exportMode: includeMaterial ? 'metadata_with_asset_package' : 'metadata_only',
      galleryAssetPackage: {
        requested: includeMaterial,
        included: includeMaterial,
      },
    },
  }

  for (const path of COMPLETE_BACKUP_SECTION_PATHS) payload[path] = {}
  payload.notifications = []
  payload.apiReports = []
  payload.roleProfiles = []
  payload.contacts = []
  payload.chatHistory = []
  payload.moduleIdentity = { nickname: 'Backup user', avatar: 'https://example.com/self.png' }
  payload.moduleAvatarOverrides = {
    defaultContactAvatar: 'https://example.com/contact.png',
    contactAvatars: {},
  }
  payload.gallery = {
    assets: [
      {
        id: 'asset_complete_1',
        blobId: 'asset_complete_1',
        sourceType: 'file',
        mimeType: 'image/png',
        sizeBytes: Buffer.byteLength(binaryText),
      },
    ],
    folders: [],
    assetPackage: includeMaterial
      ? {
          version: 1,
          items: [
            {
              id: 'asset_complete_1',
              blobId: 'asset_complete_1',
              mimeType: 'image/png',
              sizeBytes: Buffer.byteLength(binaryText),
              dataUrl,
            },
          ],
        }
      : null,
  }
  return payload
}

describe('complete backup package', () => {
  test('creates and self-verifies required sections, Chat identity, and retained binaries', async () => {
    const packaged = await createCompleteBackupPackage(createPayload(), {
      packageId: 'backup-test-complete',
    })
    const inspection = await inspectCompleteBackupPackage(packaged)

    expect(packaged.backupMeta).toMatchObject({
      magic: COMPLETE_BACKUP_MAGIC,
      schemaVersion: COMPLETE_BACKUP_SCHEMA_VERSION,
      packageId: 'backup-test-complete',
    })
    expect(packaged.backupMeta.manifest.sections).toHaveLength(
      COMPLETE_BACKUP_SECTION_PATHS.length,
    )
    expect(packaged.backupMeta.manifest.binaries).toMatchObject({
      materialLibraryIncluded: true,
      retainedFileAssetCount: 1,
    })
    expect(packaged.backupMeta.manifest.binaries.items[0].sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(packaged.moduleIdentity.nickname).toBe('Backup user')
    expect(packaged.moduleAvatarOverrides.defaultContactAvatar).toContain('contact.png')
    expect(inspection).toMatchObject({
      ok: true,
      classification: 'current_complete',
      binaryCount: 1,
    })
  })

  test('rejects section and binary corruption before restore', async () => {
    const sectionCorrupt = await createCompleteBackupPackage(createPayload(), {
      packageId: 'backup-test-section-corrupt',
    })
    sectionCorrupt.moduleIdentity.nickname = 'Changed after export'
    const sectionInspection = await inspectCompleteBackupPackage(sectionCorrupt)
    expect(sectionInspection.ok).toBe(false)
    expect(sectionInspection.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SECTION_DIGEST_MISMATCH', detail: 'moduleIdentity' }),
      ]),
    )

    const binaryCorrupt = await createCompleteBackupPackage(createPayload(), {
      packageId: 'backup-test-binary-corrupt',
    })
    binaryCorrupt.gallery.assetPackage.items[0].dataUrl =
      `data:image/png;base64,${Buffer.from('changed-binary-content').toString('base64')}`
    const binaryInspection = await inspectCompleteBackupPackage(binaryCorrupt)
    expect(binaryInspection.ok).toBe(false)
    expect(binaryInspection.errors.some((error) =>
      error.code === 'BINARY_DIGEST_MISMATCH' || error.code === 'SECTION_DIGEST_MISMATCH',
    )).toBe(true)
  })

  test('permits an explicit metadata-only package without claiming binary completeness', async () => {
    const packaged = await createCompleteBackupPackage(createPayload({ includeMaterial: false }), {
      packageId: 'backup-test-metadata-only',
    })
    const inspection = await inspectCompleteBackupPackage(packaged)

    expect(inspection.ok).toBe(true)
    expect(packaged.backupMeta.manifest.binaries).toEqual({
      materialLibraryIncluded: false,
      retainedFileAssetCount: 1,
      items: [],
    })
  })
})
