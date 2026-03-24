import { Router, Request, Response } from 'express'
import { requireAuth } from '../auth'
import store from '../../main/store'
import { processManager } from '../../main/services/process-manager'

const router = Router()
router.use(requireAuth)

// List all projects
router.get('/', (_req: Request, res: Response) => {
  const projects = store.get('projects', []) as any[]
  res.json(projects)
})

// Get single project
router.get('/:id', (req: Request, res: Response) => {
  const projects = store.get('projects', []) as any[]
  const project = projects.find((p: any) => p.id === req.params.id)
  if (!project) { res.status(404).json({ error: 'Not found' }); return }
  res.json(project)
})

// Start server
router.post('/:id/start', async (req: Request, res: Response) => {
  const projects = store.get('projects', []) as any[]
  const project = projects.find((p: any) => p.id === req.params.id)
  if (!project) { res.status(404).json({ error: 'Not found' }); return }
  try {
    await processManager.start(project.id, req.body.command || project.startCommand, project.path)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Stop server
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    await processManager.stop(req.params.id)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Restart server
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    await processManager.restart(req.params.id)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get process status
router.get('/:id/status', (req: Request, res: Response) => {
  const status = processManager.getStatus(req.params.id)
  res.json(status || { status: 'idle' })
})

export default router
