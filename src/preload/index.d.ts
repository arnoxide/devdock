import type { DevDockAPI } from './index'

declare global {
  interface Window {
    api: DevDockAPI
  }
}
