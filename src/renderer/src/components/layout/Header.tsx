import { Bell, User, ArrowUpCircle, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'

export default function Header() {
    return (
        <header className="h-14 border-b border-dock-border bg-dock-surface/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
            {/* Search / Context area (Optional but looks premium) */}
            <div className="flex-1 max-w-md relative group hidden md:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dock-muted group-focus-within:text-dock-accent transition-colors" />
                <input
                    type="text"
                    placeholder="Quick search (Ctrl+K)"
                    className="w-full bg-dock-bg/50 border border-dock-border rounded-lg pl-10 pr-4 py-1.5 text-sm text-dock-text placeholder:text-dock-muted focus:outline-none focus:ring-1 focus:ring-dock-accent focus:border-dock-accent transition-all"
                />
            </div>

            <div className="flex-1 md:hidden" />

            {/* Action items */}
            <div className="flex items-center gap-2">
                {/* Update Notification */}
                <Link to="/notifications" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-all group">
                    <ArrowUpCircle size={16} className="group-hover:animate-bounce" />
                    <span className="text-xs font-medium">Update available</span>
                </Link>

                <div className="w-px h-6 bg-dock-border mx-2" />

                {/* Notifications */}
                <Link to="/notifications" className="p-2 text-dock-muted hover:text-dock-text hover:bg-dock-card rounded-lg transition-all relative group">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-dock-accent rounded-full border-2 border-dock-surface ring-2 ring-transparent group-hover:ring-dock-accent/20 transition-all"></span>
                </Link>

                {/* Account Profile */}
                <Link to="/profile" className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-full hover:bg-dock-card transition-all border border-transparent hover:border-dock-border">
                    <div className="w-8 h-8 rounded-full bg-dock-accent/20 flex items-center justify-center text-dock-accent font-bold text-xs ring-1 ring-dock-accent/30">
                        JD
                    </div>
                    <div className="hidden sm:block text-left mr-1">
                        <p className="text-xs font-semibold text-dock-text leading-tight">Arnold J.</p>
                        <p className="text-[10px] text-dock-muted leading-tight">Pro Plan</p>
                    </div>
                </Link>
            </div>
        </header>
    )
}
