import { PlatformProvider } from '../../../../shared/types'

const providerConfig: Record<
  PlatformProvider,
  { label: string; letter: string; color: string }
> = {
  render: { label: 'Render', letter: 'R', color: 'bg-dock-cyan text-white' },
  railway: { label: 'Railway', letter: 'Rw', color: 'bg-dock-purple text-white' },
  vercel: { label: 'Vercel', letter: 'V', color: 'bg-dock-text text-dock-bg' },
  aws: { label: 'AWS', letter: 'A', color: 'bg-dock-orange text-white' }
}

interface ProviderIconProps {
  provider: PlatformProvider
  size?: 'sm' | 'md' | 'lg'
}

export default function ProviderIcon({ provider, size = 'md' }: ProviderIconProps) {
  const config = providerConfig[provider]
  const sizeClasses = {
    sm: 'w-5 h-5 text-[9px]',
    md: 'w-7 h-7 text-[10px]',
    lg: 'w-9 h-9 text-xs'
  }

  return (
    <div
      className={`${sizeClasses[size]} ${config.color} rounded-md flex items-center justify-center font-bold flex-shrink-0`}
      title={config.label}
    >
      {config.letter}
    </div>
  )
}

export function getProviderLabel(provider: PlatformProvider): string {
  return providerConfig[provider]?.label || provider
}
