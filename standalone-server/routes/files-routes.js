const { Router } = require('express')
const { requireAuth } = require('../auth')
const fs = require('fs')
const path = require('path')
const store = require('../store')

const router = Router()
router.use(requireAuth)

function safeProjectPath(projectId) {
  const projects = store.get('projects', [])
  return projects.find((p) => p.id === projectId)?.path || null
}

function guardPath(base, target) {
  return path.resolve(target).startsWith(path.resolve(base))
}

router.get('/:projectId/tree', (req, res) => {
  const base = safeProjectPath(req.params.projectId)
  if (!base) { res.status(404).json({ error: 'Project not found' }); return }

  const rel = (req.query.path) || ''
  const target = path.join(base, rel)
  if (!guardPath(base, target)) { res.status(403).json({ error: 'Forbidden' }); return }

  try {
    const entries = fs.readdirSync(target, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== '.git')
      .map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        path: path.join(rel, e.name)
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:projectId/file', (req, res) => {
  const base = safeProjectPath(req.params.projectId)
  if (!base) { res.status(404).json({ error: 'Project not found' }); return }

  const rel = (req.query.path) || ''
  const target = path.join(base, rel)
  if (!guardPath(base, target)) { res.status(403).json({ error: 'Forbidden' }); return }

  try {
    const stat = fs.statSync(target)
    if (stat.isDirectory()) { res.status(400).json({ error: 'Path is a directory' }); return }
    const content = fs.readFileSync(target, 'utf-8')
    const ext = path.extname(target).slice(1)
    res.json({ content, ext, path: rel })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:projectId/file', (req, res) => {
  const base = safeProjectPath(req.params.projectId)
  if (!base) { res.status(404).json({ error: 'Project not found' }); return }

  const rel = (req.query.path) || ''
  const target = path.join(base, rel)
  if (!guardPath(base, target)) { res.status(403).json({ error: 'Forbidden' }); return }

  try {
    fs.writeFileSync(target, req.body.content ?? '', 'utf-8')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
