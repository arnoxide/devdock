import { Router, Request, Response } from 'express'
import { requireAuth } from '../auth'
import fs from 'fs'
import path from 'path'
import store from '../../main/store'

const router = Router()
router.use(requireAuth)

function safeProjectPath(projectId: string): string | null {
  const projects = store.get('projects', []) as any[]
  const project = projects.find((p: any) => p.id === projectId)
  return project?.path || null
}

function guardPath(base: string, target: string): boolean {
  const resolved = path.resolve(target)
  return resolved.startsWith(path.resolve(base))
}

// List directory contents
router.get('/:projectId/tree', (req: Request, res: Response) => {
  const base = safeProjectPath(req.params.projectId)
  if (!base) { res.status(404).json({ error: 'Project not found' }); return }

  const rel = (req.query.path as string) || ''
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
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    res.json(entries)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Read file
router.get('/:projectId/file', (req: Request, res: Response) => {
  const base = safeProjectPath(req.params.projectId)
  if (!base) { res.status(404).json({ error: 'Project not found' }); return }

  const rel = (req.query.path as string) || ''
  const target = path.join(base, rel)

  if (!guardPath(base, target)) { res.status(403).json({ error: 'Forbidden' }); return }

  try {
    const stat = fs.statSync(target)
    if (stat.isDirectory()) {
      res.status(400).json({ error: 'Path is a directory, not a file' })
      return
    }
    const content = fs.readFileSync(target, 'utf-8')
    const ext = path.extname(target).slice(1)
    res.json({ content, ext, path: rel })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Write file
router.put('/:projectId/file', (req: Request, res: Response) => {
  const base = safeProjectPath(req.params.projectId)
  if (!base) { res.status(404).json({ error: 'Project not found' }); return }

  const rel = (req.query.path as string) || ''
  const target = path.join(base, rel)

  if (!guardPath(base, target)) { res.status(403).json({ error: 'Forbidden' }); return }

  try {
    fs.writeFileSync(target, req.body.content ?? '', 'utf-8')
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
