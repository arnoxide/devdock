const { Router } = require('express')
const { requireAuth } = require('../auth')
const store = require('../store')
const processManager = require('../process-manager')

const router = Router()
router.use(requireAuth)

router.get('/', (_req, res) => {
  res.json(store.get('projects', []))
})

router.get('/:id', (req, res) => {
  const projects = store.get('projects', [])
  const project = projects.find((p) => p.id === req.params.id)
  if (!project) { res.status(404).json({ error: 'Not found' }); return }
  res.json(project)
})

router.post('/:id/start', async (req, res) => {
  const projects = store.get('projects', [])
  const project = projects.find((p) => p.id === req.params.id)
  if (!project) { res.status(404).json({ error: 'Not found' }); return }
  try {
    await processManager.start(project.id, req.body.cmd || project.startCommand, project.path)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/stop', async (req, res) => {
  try {
    await processManager.stop(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/restart', async (req, res) => {
  try {
    await processManager.restart(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id/status', (req, res) => {
  const status = processManager.getStatus(req.params.id)
  res.json(status || { status: 'idle' })
})

module.exports = router
