import { Bell, Info, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const mockNotifications = [
    {
        id: 1,
        type: 'update',
        title: 'New Version Available',
        message: 'DevDock v1.2.4 is ready to install. Check out the new production monitoring features.',
        time: '2 hours ago',
        read: false,
        icon: Bell,
        color: 'text-dock-accent'
    },
    {
        id: 2,
        type: 'critical',
        title: 'Database Connection Lost',
        message: 'Connection to production-db failed at 03:45 AM. Auto-reconnect failed.',
        time: '5 hours ago',
        read: true,
        icon: AlertTriangle,
        color: 'text-dock-red'
    },
    {
        id: 3,
        type: 'success',
        title: 'Backup Completed',
        message: 'Nightly backup for "localization-project" was successful.',
        time: '12 hours ago',
        read: true,
        icon: CheckCircle2,
        color: 'text-dock-green'
    },
    {
        id: 4,
        type: 'info',
        title: 'GitHub Integration',
        message: 'Your personal access token is expiring in 3 days.',
        time: '1 day ago',
        read: false,
        icon: Info,
        color: 'text-dock-yellow'
    }
]

export default function NotificationsPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dock-text">Notifications</h1>
                    <p className="text-sm text-dock-muted mt-1">Stay updated with your system and projects</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm">Mark all as read</Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 size={16} className="mr-2" />
                        Clear all
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {mockNotifications.map((notification) => (
                    <Card key={notification.id} className={`transition-all border-l-4 ${notification.read ? 'border-dock-border opacity-80' : 'border-dock-accent shadow-lg shadow-dock-accent/5'}`}>
                        <CardBody className="flex gap-4 p-5">
                            <div className={`mt-1 p-2 rounded-lg bg-dock-bg border border-dock-border ${notification.color}`}>
                                <notification.icon size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className={`font-semibold ${notification.read ? 'text-dock-text/80' : 'text-dock-text'}`}>
                                        {notification.title}
                                    </h3>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-dock-muted">{notification.time}</span>
                                </div>
                                <p className="text-sm text-dock-muted leading-relaxed">
                                    {notification.message}
                                </p>
                                <div className="mt-3 flex gap-2">
                                    {notification.type === 'update' && (
                                        <Button size="sm" className="px-3 py-1 h-auto text-[11px]">Install Update</Button>
                                    )}
                                    {!notification.read && (
                                        <button className="text-[11px] font-medium text-dock-accent hover:underline decoration-2 underline-offset-4">
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </div>
    )
}
