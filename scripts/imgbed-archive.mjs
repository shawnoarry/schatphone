import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import {
  createMigrationArchive,
  removeVerifiedArchiveSources,
} from './imgbed-archive-lib.mjs'

const repoRoot = resolve(import.meta.dirname, '..')

function parseArguments(values) {
  const [command = 'help', ...rest] = values
  const options = {}
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = rest[index + 1]
    options[key] = next && !next.startsWith('--') ? next : true
    if (options[key] !== true) index += 1
  }
  return { command, options }
}

async function runArchive(options) {
  if (options.execute !== true) throw new Error('Archiving requires the explicit --execute flag')
  if (!options.plan || !options.results || !options.destination) {
    throw new Error('Archiving requires --plan, --results, and --destination')
  }
  const planPath = resolve(repoRoot, options.plan)
  const resultPath = resolve(repoRoot, options.results)
  if (!existsSync(planPath) || !existsSync(resultPath)) {
    throw new Error('Migration plan or result file is missing')
  }
  const recordPaths = [
    planPath,
    resultPath,
    resolve(repoRoot, '.imgbed-migration/upload.stdout.log'),
    resolve(repoRoot, '.imgbed-migration/upload.stderr.log'),
  ]
  const archived = await createMigrationArchive({
    repoRoot,
    archiveRoot: resolve(options.destination),
    plan: JSON.parse(await readFile(planPath, 'utf8')),
    resultDocument: JSON.parse(await readFile(resultPath, 'utf8')),
    recordPaths,
    manifestName: options['manifest-name'] || 'archive-manifest.json',
  })
  console.log(JSON.stringify({
    manifest: archived.manifestPath,
    ...archived.manifest.summary,
    status: archived.manifest.status,
  }))
}

async function runRemove(options) {
  if (!options.manifest || !options.plan || !options.results) {
    throw new Error('Removal requires --manifest, --plan, and --results')
  }
  const result = await removeVerifiedArchiveSources({
    repoRoot,
    manifestPath: resolve(options.manifest),
    plan: JSON.parse(await readFile(resolve(repoRoot, options.plan), 'utf8')),
    resultDocument: JSON.parse(await readFile(resolve(repoRoot, options.results), 'utf8')),
    execute: options.execute === true,
    referencesMigrated: options['references-migrated'] === true,
  })
  console.log(JSON.stringify({ status: result.status, removedFiles: result.removedFiles }))
}

function printHelp() {
  console.log(`SchatPhone image-bed archive tooling

Commands:
  archive --plan <path> --results <path> --destination <path> [--manifest-name <file.json>] --execute
  remove --manifest <path> --plan <path> --results <path> --references-migrated --execute

Archive copies and verifies every planned source before writing its manifest. Removal is a separate,
explicit operation and re-verifies all archive and source bytes before deleting planned files.`)
}

const { command, options } = parseArguments(process.argv.slice(2))
try {
  if (command === 'archive') await runArchive(options)
  else if (command === 'remove') await runRemove(options)
  else printHelp()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
