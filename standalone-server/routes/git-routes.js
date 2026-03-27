const { Router } = require('express')
const { requireAuth } = require('../auth')
const { execFile } = require('child_process')
const { promisify } = require('util')
const store = require('../store')

const execFileAsync = promisify(execFile)
const router = Router()
router.use(requireAuth)

function projectPath(projectId) {
  const projects = store.get('projects', [])
  return projects.find((p) => p.id === projectId)?.path || null
}

async function git(cwd, ...args) {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd })
    return stdout.trimEnd()
  } catch (err) {
    throw new Error(err.stderr?.trim() || err.stdout?.trim() || err.message)
  }
}

router.get('/:id/status', async (req, res) => {
  const cwd = projectPath(req.params.id)
  if (!cwd) { res.status(404).json({ error: 'Not found' }); return }
  try {
    const [status, branch, log] = await Promise.all([
      git(cwd, 'status', '--porcelain'),
      git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD'),
      git(cwd, 'log', '--oneline', '-10')
    ])
    res.json({
      branch,
      changes: status.split('\n').filter(Boolean).map((l) => ({
        status: l.slice(0, 2).trim(),
        path: l.slice(3).trim()
      })),
      commits: log.split('\n').filter(Boolean).map((l) => ({
        hash: l.slice(0, 7),
        message: l.slice(8)
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id/diff', async (req, res) => {
  const cwd = projectPath(req.params.id)
  if (!cwd) { res.status(404).json({ error: 'Not found' }); return }
  const file = req.query.file
  try {
    const diff = await git(cwd, ...(file ? ['diff', 'HEAD', '--', file] : ['diff', 'HEAD']))
    res.json({ diff })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/stage', async (req, res) => {
  const cwd = projectPath(req.params.id)
  if (!cwd) { res.status(404).json({ error: 'Not found' }); return }
  const { files } = req.body
  try {
    const args = files?.length ? ['add', '--', ...files] : ['add', '-A']
    await git(cwd, ...args)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/commit', async (req, res) => {
  const cwd = projectPath(req.params.id)
  if (!cwd) { res.status(404).json({ error: 'Not found' }); return }
  const { message } = req.body
  if (!message) { res.status(400).json({ error: 'Commit message required' }); return }
  try {
    const staged = await git(cwd, 'diff', '--cached', '--name-only')
    if (!staged) {
      res.status(400).json({ error: 'Nothing staged. Select files and click commit.' })
      return
    }
    await git(cwd, 'commit', '-m', message)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/push', async (req, res) => {
  const cwd = projectPath(req.params.id)
  if (!cwd) { res.status(404).json({ error: 'Not found' }); return }
  try {
    const result = await git(cwd, 'push')
    res.json({ ok: true, output: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/pull', async (req, res) => {
  const cwd = projectPath(req.params.id)
  if (!cwd) { res.status(404).json({ error: 'Not found' }); return }
  try {
    const result = await git(cwd, 'pull')
    res.json({ ok: true, output: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
