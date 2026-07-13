import { describe, expect, test } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT_DIR = process.cwd()
const SKILLS_DIR = join(ROOT_DIR, '.agents', 'skills')
const LOCK_PATH = join(ROOT_DIR, 'skills-lock.json')

const ACTIVE_GOVERNANCE_FILES = [
  'AGENTS.md',
  'docs/README.md',
  'docs/process/AI_WORK_MODE.md',
  'docs/process/DEVELOPMENT_TOOLING.md',
  'docs/pm/TASK_PACKAGE_INDEX.md',
]

const REQUIRED_PACKAGE_FILES = [
  'README.md',
  'STATUS_AND_HANDOFF.md',
  'PRODUCT_BOUNDARY.md',
  'IMPLEMENTATION_WORKSTREAMS.md',
]

const RETIRED_SKILLS = ['schatphone-workflow', 'brainstorming', 'writing-plans']

const readProjectFile = (relativePath) =>
  readFileSync(join(ROOT_DIR, relativePath), 'utf8')

describe('workflow governance', () => {
  test('keeps vendored skill contents aligned with external provenance lock entries', () => {
    const lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'))
    const lockedSkills = Object.keys(lock.skills).sort()
    const vendoredSkills = readdirSync(SKILLS_DIR)
      .filter((name) => {
        const skillDirectory = join(SKILLS_DIR, name)
        return statSync(skillDirectory).isDirectory() && existsSync(join(skillDirectory, 'SKILL.md'))
      })
      .sort()

    expect(vendoredSkills).toEqual(lockedSkills)
  })

  test('does not reference retired workflow skills from active governance entry points', () => {
    const hits = []

    ACTIVE_GOVERNANCE_FILES.forEach((relativePath) => {
      const content = readProjectFile(relativePath)
      RETIRED_SKILLS.forEach((skillName) => {
        if (content.includes(skillName)) hits.push(`${relativePath}: ${skillName}`)
      })
    })

    expect(hits).toEqual([])
  })

  test('keeps the root bootstrap independent from skills under review', () => {
    const bootstrap = readProjectFile('AGENTS.md')

    expect(bootstrap).toContain('docs/process/AI_WORK_MODE.md')
    expect(bootstrap).toContain('docs/roadmap/TODO_ROADMAP.md')
    expect(bootstrap).toContain('A skill cannot make its own use mandatory')
    expect(bootstrap.split(/\r?\n/).length).toBeLessThanOrEqual(80)
  })

  test('keeps every current task package structurally complete', () => {
    const packageRoot = join(ROOT_DIR, 'docs', 'pm')
    const incompletePackages = []

    readdirSync(packageRoot).forEach((name) => {
      const packageDirectory = join(packageRoot, name)
      if (!statSync(packageDirectory).isDirectory()) return
      if (!existsSync(join(packageDirectory, 'README.md'))) return

      REQUIRED_PACKAGE_FILES.forEach((fileName) => {
        if (!existsSync(join(packageDirectory, fileName))) {
          incompletePackages.push(`${name}/${fileName}`)
        }
      })
    })

    expect(incompletePackages).toEqual([])
  })
})
