import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, CheckCircle2, ArrowUpCircle, Trash2, Download, Info } from 'lucide-react'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'

type NotifType = 'update' | 'update-ready' | 'update-error' | 'info'

interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  time: Date
  read: boolean
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function NotifIcon({ type }: { type: NotifType }) {
  if (type === 'update') return <ArrowUpCircle size={18} className="text-dock-accent" />
  if (type === 'update-ready') return <Download size={18} className="text-dock-green" />
  if (type === 'update-error') return <AlertTriangle size={18} className="text-dock-red" />
  return <Info size={18} className="text-dock-yellow" />
}

function borderColor(type: NotifType) {
  if (type === 'update') return 'border-dock-accent'
  if (type === 'update-ready') return 'border-dock-green'
  if (type === 'update-error') return 'border-dock-red'
  return 'border-dock-yellow'
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])

  useEffect(() => {
    const offAvailable = window.api.onUpdateAvailable((info: unknown) => {
      const { version } = info as { version: string }
      setNotifs((prev) => [
        {
          id: `update-${version}`,
          type: 'update',
          title: `Update Available — v${version}`,
          message: `DevDock v${version} is available and downloading in the background.`,
          time: new Date(),
          read: false,
        },
        ...prev.filter((n) => n.id !== `update-${version}`),
      ])
    })

    const offDownloaded = window.api.onUpdateDownloaded((info: unknown) => {
      const { version } = info as { version: string }
      setNotifs((prev) => [
        {
          id: `update-ready-${version}`,
          type: 'update-ready',
          title: `Ready to Install — v${version}`,
          message: `DevDock v${version} has been downloaded. Restart the app to apply the update.`,
          time: new Date(),
          read: false,
        },
        ...prev.filter((n) => !n.id.startsWith('update-')),
      ])
    })

    const offError = window.api.onUpdateError((data: unknown) => {
      const { message } = data as { message: string }
      setNotifs((prev) => [
        {
          id: `update-error-${Date.now()}`,
          type: 'update-error',
          title: 'Update Failed',
          message,
          time: new Date(),
          read: false,
        },
        ...prev,
      ])
    })

    return () => { offAvailable(); offDownloaded(); offError() }
  }, [])

  function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function clear() {
    setNotifs([])
  }

  const unread = notifs.filter((n) => !n.read).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dock-text flex items-center gap-2">
            Notifications
            {unread > 0 && (
              <span className="text-sm px-2 py-0.5 rounded-full bg-dock-accent text-white font-semibold">
                {unread}
              </span>
            )}
          </h1>
          <p className="text-sm text-dock-muted mt-1">App updates and system events</p>
        </div>
        {notifs.length > 0 && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all as read</Button>
            <Button variant="ghost" size="sm" className="text-dock-red hover:bg-dock-red/10" onClick={clear}>
              <Trash2 size={14} /> Clear all
            </Button>
          </div>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-dock-muted">
          <Bell size={36} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">No notifications</p>
          <p className="text-xs mt-1">Update alerts and system events will appear here</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => window.api.checkForUpdates()}>
            <CheckCircle2 size={14} /> Check for updates
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => (
            <Card
              key={n.id}
              className={`border-l-4 transition-all ${n.read ? 'border-dock-border opacity-70' : borderColor(n.type)}`}
            >
              <CardBody className="flex gap-4 p-4">
                <div className="mt-0.5 p-2 rounded-lg bg-dock-bg border border-dock-border shrink-0">
                  <NotifIcon type={n.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className={`font-semibold text-sm ${n.read ? 'text-dock-text/70' : 'text-dock-text'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-dock-muted shrink-0">{timeAgo(n.time)}</span>
                  </div>
                  <p className="text-xs text-dock-muted leading-relaxed">{n.message}</p>
                  <div className="mt-2.5 flex gap-2">
                    {n.type === 'update-ready' && (
                      <Button size="sm" onClick={() => window.api.installUpdate()}>
                        <Download size={13} /> Restart & Install
                      </Button>
                    )}
                    {n.type === 'update' && (
                      <Button size="sm" variant="secondary" onClick={() => window.api.checkForUpdates()}>
                        <ArrowUpCircle size={13} /> Check progress
                      </Button>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-[11px] font-medium text-dock-accent hover:underline underline-offset-4"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
