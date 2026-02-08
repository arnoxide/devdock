/// <reference types="vite/client" />

import type { DevDockAPI } from '../../preload/index'

declare global {
  interface Window {
    api: DevDockAPI
  }
}
