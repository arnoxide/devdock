import { User, Mail, Shield, Zap, Globe, Github, LogOut, Key } from 'lucide-react'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function ProfilePage() {
    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center gap-6">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-dock-accent to-dock-purple flex items-center justify-center text-white text-3xl font-bold border-4 border-dock-surface shadow-xl">
                        AJ
                    </div>
                    <button className="absolute -bottom-2 -right-2 p-2 bg-dock-card border border-dock-border rounded-lg text-dock-muted hover:text-dock-text transition-all shadow-lg">
                        <User size={14} />
                    </button>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-dock-text">Arnold J.</h1>
                    <p className="text-dock-muted flex items-center gap-2 mt-1">
                        <Mail size={14} />
                        arnold@thebox.dev
                    </p>
                    <div className="flex gap-2 mt-3">
                        <span className="px-2 py-0.5 rounded-full bg-dock-accent/10 text-dock-accent text-[10px] font-bold uppercase border border-dock-accent/20 flex items-center gap-1">
                            <Zap size={10} /> Pro Plan
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-dock-green/10 text-dock-green text-[10px] font-bold uppercase border border-dock-green/20 flex items-center gap-1">
                            <Shield size={10} /> Verified
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <h2 className="text-sm font-semibold flex items-center gap-2">
                                <User size={16} className="text-dock-accent" />
                                Personal Information
                            </h2>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-dock-muted ml-1">Full Name</label>
                                    <Input defaultValue="Arnold J." />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-dock-muted ml-1">Username</label>
                                    <Input defaultValue="arnold_thebox" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-dock-muted ml-1">Email Address</label>
                                <Input defaultValue="arnold@thebox.dev" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-dock-muted ml-1">Bio</label>
                                <textarea
                                    className="w-full bg-dock-bg border border-dock-border rounded-lg p-3 text-sm text-dock-text focus:outline-none focus:ring-1 focus:ring-dock-accent transition-all min-h-[100px]"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button>Save Changes</Button>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <h2 className="text-sm font-semibold flex items-center gap-2">
                                <Github size={16} className="text-dock-accent" />
                                Connected Accounts
                            </h2>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-dock-bg border border-dock-border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-dock-card rounded-lg border border-dock-border">
                                        <Github size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-dock-text">GitHub</p>
                                        <p className="text-xs text-dock-muted">Connected as @arnold-github</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">Modify</Button>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-dock-bg border border-dock-border opacity-60 grayscale">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-dock-card rounded-lg border border-dock-border">
                                        <Globe size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-dock-text">Vercel</p>
                                        <p className="text-xs text-dock-muted">Not connected</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">Connect</Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-dock-accent/10 to-dock-purple/10 border-dock-accent/20">
                        <CardBody className="p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center mx-auto text-dock-accent">
                                <Key size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-dock-text">Pro Member</h3>
                                <p className="text-xs text-dock-muted mt-1">Your pro subscription expires in <span className="text-dock-accent font-semibold">234 days</span></p>
                            </div>
                            <Button className="w-full bg-dock-accent hover:bg-dock-accent/90">Manage Billing</Button>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody className="p-4 space-y-2">
                            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-dock-card text-dock-muted hover:text-dock-text transition-all text-sm font-medium">
                                <Shield size={18} />
                                Security Settings
                            </button>
                            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-dock-card text-dock-muted hover:text-dock-text transition-all text-sm font-medium">
                                <Zap size={18} />
                                Billing History
                            </button>
                            <div className="h-px bg-dock-border my-2" />
                            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-dock-red/10 text-dock-red transition-all text-sm font-medium">
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    )
}
