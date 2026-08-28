import { describe, expect, test } from 'vitest'
import {
  COMPLETE_BACKUP_MAGIC,
  COMPLETE_BACKUP_SCHEMA_VERSION,
  COMPLETE_BACKUP_SECTION_PATHS,
  COMPLETE_BACKUP_V3_SECTION_PATHS,
  COMPLETE_BACKUP_V4_SECTION_PATHS,
  createCompleteBackupPackage,
  inspectCompleteBackupPackage,
} from '../src/lib/complete-backup-package'
import { canonicalStringify, sha256Canonical } from '../src/lib/persistence-repository-schema'

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
  payload.user = {
    worldSuiteInventory: {
      schemaVersion: 1,
      resources: [
        {
          id: 'map.demo-city',
          type: 'map_pack',
          owner: 'map',
          ownerResourceId: 'demo-city-map',
          catalogId: 'demo-city-map',
          version: 1,
          installed: true,
          origins: [{ kind: 'suite', id: 'demo_suite' }],
        },
      ],
      suiteStates: [],
    },
  }
  payload.notifications = []
  payload.apiReports = []
  payload.roleProfiles = []
  payload.contactsLifecycle = {
    schemaVersion: 1,
    profileIdHighWaterMark: 12,
    tombstones: [
      {
        profileId: 12,
        roleId: 'deleted-12',
        entityType: 'supporting_role',
        worldId: 'world-a',
        deletedAt: 1_786_143_000_000,
        schemaVersion: 1,
      },
    ],
  }
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

const createLegacyV3Package = async () => {
  const current = await createCompleteBackupPackage(createPayload({ includeMaterial: false }), {
    packageId: 'backup-test-legacy-v3',
  })
  delete current.miniScene
  delete current.contactsLifecycle
  current.backupMeta.schemaVersion = 3
  const sections = []
  for (const path of COMPLETE_BACKUP_V3_SECTION_PATHS) {
    const canonical = canonicalStringify(current[path])
    sections.push({
      id: path,
      path,
      required: true,
      byteSize: new TextEncoder().encode(canonical).byteLength,
      sha256: await sha256Canonical(current[path]),
    })
  }
  const manifest = {
    version: 1,
    packageId: current.backupMeta.packageId,
    exportedAt: current.backupMeta.exportedAt,
    sectionCount: sections.length,
    sections,
    binaries: current.backupMeta.manifest.binaries,
    payloadSha256: await sha256Canonical(
      Object.fromEntries(COMPLETE_BACKUP_V3_SECTION_PATHS.map((path) => [path, current[path]])),
    ),
  }
  manifest.manifestSha256 = await sha256Canonical(manifest)
  current.backupMeta.manifest = manifest
  return current
}

const createLegacyV4Package = async () => {
  const current = await createCompleteBackupPackage(createPayload({ includeMaterial: false }), {
    packageId: 'backup-test-legacy-v4',
  })
  delete current.contactsLifecycle
  current.backupMeta.schemaVersion = 4
  const sections = []
  for (const path of COMPLETE_BACKUP_V4_SECTION_PATHS) {
    const canonical = canonicalStringify(current[path])
    sections.push({
      id: path,
      path,
      required: true,
      byteSize: new TextEncoder().encode(canonical).byteLength,
      sha256: await sha256Canonical(current[path]),
    })
  }
  const manifest = {
    version: 1,
    packageId: current.backupMeta.packageId,
    exportedAt: current.backupMeta.exportedAt,
    sectionCount: sections.length,
    sections,
    binaries: current.backupMeta.manifest.binaries,
    payloadSha256: await sha256Canonical(
      Object.fromEntries(COMPLETE_BACKUP_V4_SECTION_PATHS.map((path) => [path, current[path]])),
    ),
  }
  manifest.manifestSha256 = await sha256Canonical(manifest)
  current.backupMeta.manifest = manifest
  return current
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
    expect(packaged.contactsLifecycle).toEqual({
      schemaVersion: 1,
      profileIdHighWaterMark: 12,
      tombstones: [
        {
          profileId: 12,
          roleId: 'deleted-12',
          entityType: 'supporting_role',
          worldId: 'world-a',
          deletedAt: 1_786_143_000_000,
          schemaVersion: 1,
        },
      ],
    })
    expect(packaged.user.worldSuiteInventory.resources[0]).toMatchObject({
      id: 'map.demo-city',
      ownerResourceId: 'demo-city-map',
    })
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

  test('verifies legacy v3 complete packages without requiring the v4 Mini Scene section', async () => {
    const packaged = await createLegacyV3Package()
    const inspection = await inspectCompleteBackupPackage(packaged)

    expect(inspection).toMatchObject({
      ok: true,
      classification: 'legacy_complete',
      schemaVersion: 3,
      verifiedSectionCount: COMPLETE_BACKUP_V3_SECTION_PATHS.length,
    })

    packaged.calendar.events = [{ id: 'tampered' }]
    const corrupted = await inspectCompleteBackupPackage(packaged)
    expect(corrupted.ok).toBe(false)
    expect(corrupted.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SECTION_DIGEST_MISMATCH', detail: 'calendar' }),
      ]),
    )
  })

  test('verifies legacy v4 packages without requiring Contacts lifecycle metadata', async () => {
    const packaged = await createLegacyV4Package()
    const inspection = await inspectCompleteBackupPackage(packaged)

    expect(inspection).toMatchObject({
      ok: true,
      classification: 'legacy_complete',
      schemaVersion: 4,
      verifiedSectionCount: COMPLETE_BACKUP_V4_SECTION_PATHS.length,
    })
  })
})
