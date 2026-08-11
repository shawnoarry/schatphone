import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createMigrationArchive,
  isInside,
  removeVerifiedArchiveSources,
} from '../scripts/imgbed-archive-lib.mjs'
import { sha256File } from '../scripts/imgbed-migration-lib.mjs'

async function fixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), 'schatphone-archive-source-'))
  const archiveRoot = await mkdtemp(join(tmpdir(), 'schatphone-archive-target-'))
  await mkdir(join(repoRoot, 'public/images'), { recursive: true })
  await mkdir(join(repoRoot, 'output/imagegen'), { recursive: true })
  await writeFile(join(repoRoot, 'public/images/runtime.png'), 'runtime')
  await writeFile(join(repoRoot, 'output/imagegen/runtime-copy.png'), 'runtime')
  const sha256 = await sha256File(join(repoRoot, 'public/images/runtime.png'))
  const plan = {
    status: 'APPROVED',
    approved: true,
    mode: 'complete-single-copy',
    limits: { maxFiles: 1, maxBytes: 7 },
    entries: [{
      path: 'public/images/runtime.png',
      aliasPaths: ['output/imagegen/runtime-copy.png'],
      action: 'upload',
      access: 'public',
      bytes: 7,
      sha256,
      remoteKey: 'schatphone-assets/images/runtime.png',
      downloadUrl: 'https://img.example/file/schatphone-assets/images/runtime.png',
    }],
  }
  const resultDocument = {
    schemaVersion: 1,
    updatedAt: '2026-08-11T00:00:00.000Z',
    results: [{
      path: plan.entries[0].path,
      remoteKey: plan.entries[0].remoteKey,
      bytes: 7,
      sha256,
      status: 'verified',
    }],
  }
  return { repoRoot, archiveRoot, plan, resultDocument }
}

describe('image-bed migration archive', () => {
  it('treats a destination on another Windows drive as outside the repository', () => {
    expect(isInside(
      'H:\\SchatPhone\\schatphone',
      'I:\\Device-Local-Archive\\masters',
    )).toBe(false)
  })

  it('copies aliases, verifies them, records provenance, and removes only in a second step', async () => {
    const data = await fixture()
    const archived = await createMigrationArchive(data)
    expect(archived.manifest.status).toBe('COPIED_AND_VERIFIED')
    expect(archived.manifest.summary).toMatchObject({ files: 2, bytes: 14 })
    expect(await readFile(join(data.archiveRoot, 'public/images/runtime.png'), 'utf8')).toBe('runtime')
    expect(await readFile(join(data.archiveRoot, 'output/imagegen/runtime-copy.png'), 'utf8')).toBe('runtime')

    await expect(removeVerifiedArchiveSources({
      repoRoot: data.repoRoot,
      manifestPath: archived.manifestPath,
      plan: data.plan,
      resultDocument: data.resultDocument,
      execute: true,
    })).rejects.toThrow('--references-migrated')

    const removed = await removeVerifiedArchiveSources({
      repoRoot: data.repoRoot,
      manifestPath: archived.manifestPath,
      plan: data.plan,
      resultDocument: data.resultDocument,
      execute: true,
      referencesMigrated: true,
    })
    expect(removed).toMatchObject({ status: 'SOURCES_REMOVED', removedFiles: 2 })
    expect(await readFile(join(data.archiveRoot, '_records/archive-manifest.json'), 'utf8'))
      .toContain('SOURCES_REMOVED')
  })

  it('supports a separate manifest for an additional verified batch', async () => {
    const data = await fixture()
    data.plan.schemaVersion = 1
    data.plan.batchId = 'project-brief'
    data.plan.approvalSource = 'approved test batch'
    data.plan.baseUrl = 'https://img.example'
    delete data.plan.mode
    delete data.plan.limits
    const archived = await createMigrationArchive({
      ...data,
      manifestName: 'project-brief-archive-manifest.json',
    })
    expect(archived.manifestPath).toBe(join(
      data.archiveRoot,
      '_records/project-brief-archive-manifest.json',
    ))
  })

  it('stops before copying when source integrity changed', async () => {
    const data = await fixture()
    await writeFile(join(data.repoRoot, 'public/images/runtime.png'), 'changed')
    await expect(createMigrationArchive(data)).rejects.toThrow('Source SHA-256 mismatch')
  })
})
