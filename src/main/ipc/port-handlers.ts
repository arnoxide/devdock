import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { portScanner } from '../services/port-scanner'

export function registerPortHandlers(): void {
  ipcMain.handle(IPC.PORT_SCAN, async () => {
    return portScanner.scan()
  })

  ipcMain.handle(IPC.PORT_KILL, async (_event, port: number) => {
    return portScanner.kill(port)
  })
}
