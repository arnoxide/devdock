import { useState } from 'react'
import {
  ShieldCheck,
  KeyRound,
  FileKey2,
  Lock,
  Hash,
  Fingerprint,
  Binary,
  Key
} from 'lucide-react'
import PasswordGenerator from '../components/vault/PasswordGenerator'
import JWTTool from '../components/vault/JWTTool'
import EnvVault from '../components/vault/EnvVault'
import HashGenerator from '../components/vault/HashGenerator'
import UUIDGenerator from '../components/vault/UUIDGenerator'
import Base64Tool from '../components/vault/Base64Tool'
import SecretKeyGenerator from '../components/vault/SecretKeyGenerator'

const tabs = [
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: 'jwt', label: 'JWT', icon: FileKey2 },
  { id: 'env', label: 'Env Vault', icon: Lock },
  { id: 'hash', label: 'Hash', icon: Hash },
  { id: 'uuid', label: 'UUID', icon: Fingerprint },
  { id: 'base64', label: 'Base64', icon: Binary },
  { id: 'keys', label: 'Secret Keys', icon: Key }
] as const

type TabId = (typeof tabs)[number]['id']

export default function SecurityVaultPage() {
  const [activeTab, setActiveTab] = useState<TabId>('password')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-dock-border">
        <div className="w-10 h-10 rounded-xl bg-dock-accent/10 flex items-center justify-center">
          <ShieldCheck size={22} className="text-dock-accent" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-dock-text">Security Vault</h1>
          <p className="text-xs text-dock-muted">Developer security toolkit — all crypto runs locally</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-dock-accent text-white'
                : 'text-dock-muted hover:text-dock-text hover:bg-dock-card'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl">
          {activeTab === 'password' && <PasswordGenerator />}
          {activeTab === 'jwt' && <JWTTool />}
          {activeTab === 'env' && <EnvVault />}
          {activeTab === 'hash' && <HashGenerator />}
          {activeTab === 'uuid' && <UUIDGenerator />}
          {activeTab === 'base64' && <Base64Tool />}
          {activeTab === 'keys' && <SecretKeyGenerator />}
        </div>
      </div>
    </div>
  )
}
