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
  'docs/process/WORKTREE_INTEGRATION_PROTOCOL.md',
  'docs/process/DEVELOPMENT_TOOLING.md',
  'docs/pm/TASK_PACKAGE_INDEX.md',
]

const ACTIVE_VISUAL_GOVERNANCE_FILES = [
  'docs/process/AI_WORK_MODE.md',
  'docs/process/VISUAL_WORKFLOW.md',
  'docs/pm/visual-and-ia-governance/README.md',
  'docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md',
]

const REQUIRED_PACKAGE_FILES = [
  'README.md',
  'STATUS_AND_HANDOFF.md',
  'PRODUCT_BOUNDARY.md',
  'IMPLEMENTATION_WORKSTREAMS.md',
]

const RETIRED_SKILLS = ['schatphone-workflow', 'brainstorming', 'writing-plans']
const RETIRED_VISUAL_MECHANISMS = [
  ...RETIRED_SKILLS,
  'impeccable',
  'web-design-guidelines',
]
const SPECIALIST_SKILLS = [
  'frontend-design',
  'frontend-logic-design',
  'image-to-code',
  'game-engine',
  'unit-test-vue-pinia',
]

const readProjectFile = (relativePath) =>
  readFileSync(join(ROOT_DIR, relativePath), 'utf8')

const getNamedWorkflowStep = (content, stepName) => {
  const lines = content.split(/\r?\n/)
  const stepStart = lines.findIndex((line) => line === `      - name: ${stepName}`)
  if (stepStart === -1) return []

  const stepEnd = lines.findIndex(
    (line, index) => index > stepStart && line.startsWith('      - name:'),
  )
  return lines.slice(stepStart, stepEnd === -1 ? undefined : stepEnd)
}

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

  test('does not reference retired mechanisms from active visual governance files', () => {
    const hits = []

    ACTIVE_VISUAL_GOVERNANCE_FILES.forEach((relativePath) => {
      const content = readProjectFile(relativePath)
      RETIRED_VISUAL_MECHANISMS.forEach((mechanism) => {
        if (content.includes(mechanism)) hits.push(`${relativePath}: ${mechanism}`)
      })
    })

    expect(hits).toEqual([])
  })

  test('keeps visual specialist routing narrow and optional for routine fixes', () => {
    const visualWorkflow = readProjectFile('docs/process/VISUAL_WORKFLOW.md')

    expect(visualWorkflow).toContain(
      'choose at most one specialist skill for a visual work round',
    )
    expect(visualWorkflow).toContain(
      'skip specialist skills for routine CSS, copy, spacing, or accessibility fixes with clear acceptance',
    )
    expect(visualWorkflow).toContain('do not chain visual specialist skills by default')
  })

  test('keeps the cross-task execution contract thin and task-agnostic', () => {
    const aiWorkMode = readProjectFile('docs/process/AI_WORK_MODE.md')

    expect(aiWorkMode).toContain('This file is a project execution contract, not a universal implementation workflow')
    expect(aiWorkMode).toContain('Each task package owns:')
    expect(aiWorkMode).toContain('docs/pm/TASK_PACKAGE_INDEX.md')
    expect(aiWorkMode.split(/\r?\n/).length).toBeLessThanOrEqual(180)
    expect(aiWorkMode).not.toContain('Task-Type Reading Order')
    expect(aiWorkMode).not.toContain('Installed Skill Routing Map')
    expect(aiWorkMode).not.toContain('End-Of-Round Documentation Sync Matrix')

    SPECIALIST_SKILLS.forEach((skillName) => {
      expect(aiWorkMode).not.toContain(skillName)
    })
  })

  test('keeps cross-worktree integration user-gated and controller-owned', () => {
    const protocol = readProjectFile('docs/process/WORKTREE_INTEGRATION_PROTOCOL.md')
    const aiWorkMode = readProjectFile('docs/process/AI_WORK_MODE.md')

    expect(aiWorkMode).toContain('docs/process/WORKTREE_INTEGRATION_PROTOCOL.md')
    expect(protocol).toContain('Silence is not approval.')
    expect(protocol).toContain('USER_DECISION_REQUIRED')
    expect(protocol).toContain('No business approval can be inferred from technical validation.')
    expect(protocol).toContain(
      'Workgroups must not merge, rebase, push, delete worktrees, or synchronize other branches.',
    )
    expect(protocol).toContain(
      'The user may reject, pause, or reopen a decision at any stage before or after integration.',
    )
    expect(protocol).toContain('Remote push is a separate action.')
  })

  test('keeps focused visual testing local while CI runs the full E2E gate once', () => {
    const packageJson = JSON.parse(readProjectFile('package.json'))
    const ciWorkflow = readProjectFile('.github/workflows/ci.yml')
    const fullE2EStep = getNamedWorkflowStep(ciWorkflow, 'Full product E2E')

    expect(packageJson.scripts['test:visual']).toBe(
      'playwright test e2e/visual-quality.spec.js',
    )
    expect(ciWorkflow).not.toContain('        run: npm run test:visual')
    expect(ciWorkflow.match(/npm run test:e2e/g)).toHaveLength(1)
    expect(fullE2EStep).toContain('        id: full-e2e')
    expect(fullE2EStep).toContain(
      '          PLAYWRIGHT_BASE_URL: http://127.0.0.1:5181',
    )
    expect(fullE2EStep).toContain(
      '          PLAYWRIGHT_JSON_OUTPUT_FILE: test-results/playwright-results.json',
    )
    expect(fullE2EStep).toContain(
      '        run: npm run test:e2e -- --fail-on-flaky-tests --reporter=line,html,json',
    )
  })

  test('keeps CI and Pages verification fail-closed with Playwright diagnostics', () => {
    const ciWorkflow = readProjectFile('.github/workflows/ci.yml')
    const deployWorkflow = readProjectFile('.github/workflows/deploy.yml')

    ;[
      [ciWorkflow, 'http://127.0.0.1:5181'],
      [deployWorkflow, 'http://127.0.0.1:5182'],
    ].forEach(([workflow, baseURL]) => {
      const productionAuditStep = getNamedWorkflowStep(
        workflow,
        'Audit production dependencies',
      )
      const fullAuditStep = getNamedWorkflowStep(workflow, 'Audit all dependencies')
      const fullE2EStep = getNamedWorkflowStep(workflow, 'Full product E2E')
      const summaryStep = getNamedWorkflowStep(workflow, 'Verify Playwright summary')
      const uploadStep = getNamedWorkflowStep(workflow, 'Upload Playwright report')

      expect(productionAuditStep).toContain(
        '        run: npm audit --omit=dev --registry=https://registry.npmjs.org/',
      )
      expect(fullAuditStep).toContain(
        '        run: npm audit --registry=https://registry.npmjs.org/',
      )
      expect(workflow.match(/npm run test:e2e/g)).toHaveLength(1)
      expect(workflow).not.toContain('        run: npm run test:visual')
      expect(fullE2EStep).toContain(`          PLAYWRIGHT_BASE_URL: ${baseURL}`)
      expect(fullE2EStep).toContain(
        '          PLAYWRIGHT_JSON_OUTPUT_FILE: test-results/playwright-results.json',
      )
      expect(fullE2EStep).toContain('        id: full-e2e')
      expect(fullE2EStep).toContain(
        '        run: npm run test:e2e -- --fail-on-flaky-tests --reporter=line,html,json',
      )
      expect(summaryStep).toContain('        id: playwright-summary')
      expect(summaryStep.join('\n')).toContain('skipped > 4')
      expect(summaryStep.join('\n')).toContain('unexpected !== 0')
      expect(summaryStep.join('\n')).toContain('flaky !== 0')
      expect(uploadStep).toContain(
        "        if: ${{ failure() && (steps.full-e2e.outcome == 'failure' || steps.playwright-summary.outcome == 'failure') }}",
      )
      expect(uploadStep).toContain('        uses: actions/upload-artifact@v4')
      expect(uploadStep).toContain('            playwright-report/')
      expect(uploadStep).toContain('            test-results/')
      expect(uploadStep).toContain('            test-results/playwright-results.json')
      expect(uploadStep).toContain('          if-no-files-found: ignore')
      expect(uploadStep).toContain('          retention-days: 7')
    })

    const manualGuardStep = getNamedWorkflowStep(
      deployWorkflow,
      'Require main for manual deploy',
    )
    expect(manualGuardStep.join('\n')).toContain("github.ref != 'refs/heads/main'")
    expect(manualGuardStep).toContain('          exit 1')
    const deployLines = deployWorkflow.split(/\r?\n/)
    const deployJobIndex = deployLines.indexOf('  deploy:')
    expect(deployJobIndex).toBeGreaterThan(-1)
    expect(deployLines[deployJobIndex + 1]).toBe('    needs: build')
    expect(deployWorkflow.indexOf('      - name: Configure Pages')).toBeGreaterThan(
      deployWorkflow.indexOf('      - name: Verify Playwright summary'),
    )
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

      const statusPath = join(packageDirectory, 'STATUS_AND_HANDOFF.md')
      if (existsSync(statusPath)) {
        const status = readFileSync(statusPath, 'utf8')
        ;['Recommended Next Slice', 'Do Not Do', 'Must Sync'].forEach((section) => {
          if (!status.includes(section)) incompletePackages.push(`${name}: ${section}`)
        })
      }
    })

    expect(incompletePackages).toEqual([])
  })
})
