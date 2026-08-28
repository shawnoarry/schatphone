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
  'docs/process/DOCUMENT_GOVERNANCE.md',
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
  'visual-art-direction',
  'frontend-design',
  'frontend-logic-design',
  'redesign-existing-projects',
  'ui-ux-pro-max',
  'gsap-core',
  'gsap-frameworks',
  'gsap-performance',
  'gsap-plugins',
  'gsap-scrolltrigger',
  'gsap-timeline',
  'gsap-utils',
  'image-to-code',
  'gpt-image',
  'gpt-image-2-style-library',
  'game-engine',
  'unit-test-vue-pinia',
]
const PROJECT_OWNED_SKILLS = ['visual-art-direction']

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
  test('keeps external skill contents aligned with provenance and project-owned skills explicit', () => {
    const lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'))
    const lockedSkills = Object.keys(lock.skills).sort()
    const vendoredSkills = readdirSync(SKILLS_DIR)
      .filter((name) => {
        const skillDirectory = join(SKILLS_DIR, name)
        return statSync(skillDirectory).isDirectory() && existsSync(join(skillDirectory, 'SKILL.md'))
      })
      .sort()

    expect(vendoredSkills).toEqual([...lockedSkills, ...PROJECT_OWNED_SKILLS].sort())
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

  test('keeps visual baseline routing explicit and implementation specialists narrow', () => {
    const visualWorkflow = readProjectFile('docs/process/VISUAL_WORKFLOW.md')

    expect(visualWorkflow).toContain(
      'use `visual-art-direction` and `ui-ux-pro-max` as the baseline pair before implementation',
    )
    expect(visualWorkflow).toContain(
      'add at most one implementation-specialist family for the accepted slice',
    )
    expect(visualWorkflow).toContain(
      'skip specialist skills for routine CSS, copy, spacing, or accessibility fixes with clear acceptance',
    )
    expect(visualWorkflow).toContain(
      'do not chain implementation-specialist families by default',
    )
    expect(visualWorkflow).toContain(
      'do not use `ui-ux-pro-max --persist` in the normal visual workflow',
    )
    expect(visualWorkflow).toContain(
      'do not add the `gsap` runtime dependency merely because the skills are installed',
    )
  })

  test('keeps product-grade visual intake and reference adaptation explicit', () => {
    const visualWorkflow = readProjectFile('docs/process/VISUAL_WORKFLOW.md')
    const designSystem = readProjectFile('docs/design/DESIGN.md')

    expect(visualWorkflow).toContain('## 4. Product-Grade UI Gate')
    expect(visualWorkflow).toContain('Information-depth map (L0/L1/L2/L3):')
    expect(visualWorkflow).toContain('### 4.4 Control And Icon Gate')
    expect(visualWorkflow).toContain('### 4.5 Visual Richness Gate')
    expect(visualWorkflow).toContain('### 4.7 Visual Asset And Image-Generation Gate')
    expect(visualWorkflow).toContain('## 5. Work Path And Reference Discovery')
    expect(visualWorkflow).toContain('视觉专项：原型检索')
    expect(visualWorkflow).toContain('three to five current examples')
    expect(designSystem).toContain('A functional scaffold is not a visually complete first implementation')
    expect(designSystem).toContain('User experience is not construction narration')
    expect(designSystem).toContain('Templates are scaffolds, not identities')
  })

  test('keeps visual work adaptive without turning vague requests into user homework', () => {
    const visualWorkflow = readProjectFile('docs/process/VISUAL_WORKFLOW.md')
    const briefTemplate = readProjectFile('docs/templates/VISUAL_REDESIGN_BRIEF_TEMPLATE.md')

    expect(visualWorkflow).toContain('That is valid intake')
    expect(visualWorkflow).toContain('This is an assistant-owned reasoning artifact')
    expect(visualWorkflow).toContain('Match expressive complexity to the product role')
    expect(visualWorkflow).toContain('### 5.1 Direct Product Path')
    expect(visualWorkflow).toContain('### 5.2 Direction Exploration Path')
    expect(visualWorkflow).toContain('### 5.3 Experience Prototype Path')
    expect(visualWorkflow).toContain('does not require Figma or Pencil')
    expect(visualWorkflow).toContain('it is not automatically the best example')
    expect(briefTemplate).toContain('optional communication aid, not required user homework')
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

  test('keeps routine worktree integration lightweight and risk-proportionate', () => {
    const protocol = readProjectFile('docs/process/WORKTREE_INTEGRATION_PROTOCOL.md')

    expect(protocol).toContain('The standard lane is the default.')
    expect(protocol).toContain(
      'create one local commit without a second controller round trip',
    )
    expect(protocol).toContain(
      'Clean committed work does not require a duplicate patch, archive, pre-commit approval round',
    )
    expect(protocol).toContain(
      'Do not rerun the same full lint/test/build/E2E suite in both source and target without a specific reason.',
    )
    expect(protocol).toContain(
      'Close omission review with commit/tree/file comparison when the reviewed commit lands unchanged.',
    )
    expect(protocol).toContain('cross-worktree path reservation')
    expect(protocol).toContain('Known Baseline Failure')
    expect(protocol).toContain(
      'remote push requires explicit authorization for that push',
    )
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
      expect(uploadStep).toContain('        uses: actions/upload-artifact@v6')
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

  test('keeps external model assessments subordinate and explicitly archived', () => {
    const docsMap = readProjectFile('docs/README.md')
    const archiveIndex = readProjectFile(
      'docs/archive/2026-08-26-external-model-assessments/README.md',
    )
    const archivedAssessments = [
      'docs/archive/2026-08-26-external-model-assessments/PRODUCT_NEXT_STEP_FEATURE_PLAN.md',
      'docs/archive/2026-08-26-external-model-assessments/IMMERSIVE_GAMEPLAY_GOVERNANCE_GATE.md',
      'docs/archive/2026-08-26-external-model-assessments/UI_BEAUTIFICATION_STATIC_SIGNAL_AUDIT.md',
    ]

    expect(docsMap).toContain('## 8. External Assessment Intake')
    expect(docsMap).toContain(
      'Model-generated diagnoses, audits, priority proposals, maturity rankings, and governance checklists are review inputs, not project authorities.',
    )
    expect(docsMap).toContain(
      'Do not keep a second P0/P1 list, Sprint plan, quality gate, or package-independent checklist.',
    )
    expect(archiveIndex).toContain('No new product priority was promoted from this batch.')

    archivedAssessments.forEach((relativePath) => {
      const content = readProjectFile(relativePath)
      expect(content).toContain('# 封存声明 / Archived External Assessment')
      expect(content).toContain('封存日期：2026-08-26')
      expect(content).toContain('替代权威：')
      expect(content).toContain('使用限制：')
    })
  })

  test('keeps whole-project rollups baseline-scoped and package detail protected', () => {
    const documentGovernance = readProjectFile('docs/process/DOCUMENT_GOVERNANCE.md')
    const packageIndex = readProjectFile('docs/pm/TASK_PACKAGE_INDEX.md')
    const rollups = [
      'README.md',
      'docs/roadmap/TODO_ROADMAP.md',
      'docs/overview/PROJECT_MASTER_GUIDE.md',
      'docs/pm/TODO_PM_STATUS_REPORT.md',
      'docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md',
      'docs/strategy/PROJECT_ITERATION_PLAN.md',
    ]

    expect(documentGovernance).toContain('## 4. Preserve Small Progress')
    expect(documentGovernance).toContain(
      "A larger document may summarize a smaller document, but it must not replace, shorten, or rewrite the smaller document's completion evidence.",
    )
    expect(packageIndex).toContain(
      "A whole-project report may link to these statuses, but it must not replace a child task's ID, commit, validation, exclusions, or remaining stage.",
    )

    rollups.forEach((relativePath) => {
      expect(readProjectFile(relativePath)).toContain('Integrated baseline')
    })
  })

  test('keeps current roadmap measurements and completed repair status aligned', () => {
    const roadmap = readProjectFile('docs/roadmap/TODO_ROADMAP.md')
    const architectureHandoff = readProjectFile(
      'docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md',
    )

    expect(roadmap).toContain('58 route-view files')
    expect(roadmap).toContain('24 Pinia store files')
    expect(roadmap).not.toContain('42 route-view files, 19 Pinia stores')
    expect(architectureHandoff).toContain(
      '`CMG-00` through `CMG-10` and `DCF-01` through `DCF-06` are complete',
    )
    expect(architectureHandoff).not.toContain(
      '`CMG-08`, `DCF-04`, and `DCF-06` require their own exact non-overlapping reservations',
    )
  })

  test('keeps superseded module audits explicitly archived and the active pool non-executable', () => {
    const candidatePool = readProjectFile('docs/roadmap/PROJECT_MODULE_AUDIT.md')
    const archivedAudit = readProjectFile(
      'docs/archive/2026-08-26-document-alignment/PROJECT_MODULE_AUDIT_2026-08-20.md',
    )
    const archiveIndex = readProjectFile(
      'docs/archive/2026-08-26-document-alignment/README.md',
    )

    expect(candidatePool).toContain('Document state: `CANDIDATE_POOL / NON_EXECUTABLE`')
    expect(candidatePool).toContain('It does not assign P0/P1, `IN_PROGRESS`, or `DONE`.')
    expect(candidatePool).not.toContain('Relationship Runtime silently retains only 500 rows')
    expect(archivedAudit).toContain('Status: `ARCHIVED / HISTORICAL_CANDIDATE_SNAPSHOT`')
    expect(archivedAudit).toContain('Use restriction:')
    expect(archiveIndex).toContain('PROJECT_MODULE_AUDIT_2026-08-20.md')
  })

  test('keeps the PM module catalog aligned with current integrated routes and S1 scope', () => {
    const catalogFiles = [
      'docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md',
      'docs/pm/MODULE_NAME_GLOSSARY.md',
      'docs/pm/product-module-feature-catalog/SHELL_AND_SYSTEM.md',
      'docs/pm/product-module-feature-catalog/ROLE_CHAT_AND_WORLD.md',
      'docs/pm/product-module-feature-catalog/MAP_CALENDAR_AND_REMINDERS.md',
      'docs/pm/product-module-feature-catalog/COMMERCE_ASSETS_AND_SUPPORT.md',
      'docs/pm/product-module-feature-catalog/MEDIA_AND_APP_SHELLS.md',
    ]
    const catalog = catalogFiles.map(readProjectFile).join('\n')
    const currentRoutes = [
      '/widgets',
      '/camera',
      '/music',
      '/weather',
      '/agenda-journey',
      '/mail',
      '/browser',
      '/community',
      '/healthcare',
      '/housing',
      '/workplace',
      '/fandom',
      '/tickets',
      '/travel',
      '/intercity',
      '/creator-rights',
      '/parcel',
      '/career',
    ]

    currentRoutes.forEach((route) => expect(catalog).toContain(route))
    expect(catalog).toContain(
      'S1 completion does not mean the App has an S2 canonical owner Store',
    )
    expect(catalog).not.toContain(
      'Agenda Journey | not frozen | future app id not frozen | future Home app',
    )
  })
})
