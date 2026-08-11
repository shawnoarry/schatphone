import { spawnSync } from 'node:child_process'
import { chmodSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
chmodSync(resolve(repoRoot, '.githooks/pre-commit'), 0o755)
const insideWorkTree = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
  cwd: repoRoot,
  encoding: 'utf8',
})

if (insideWorkTree.status !== 0 || insideWorkTree.stdout.trim() !== 'true') {
  console.log('Git hooks were not installed because this is not a Git worktree.')
  process.exit(0)
}

const configured = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], {
  cwd: repoRoot,
  encoding: 'utf8',
})

if (configured.status !== 0) {
  console.error(configured.stderr.trim() || 'Failed to configure shared Git hooks.')
  process.exit(1)
}

console.log('Shared Git hooks are active from .githooks.')
