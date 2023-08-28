import { execCommand } from './IO'

const intervals = (timeout: number, fn: () => void) => setInterval(fn, timeout)

async function checkIfProcessExists(processName: string): Promise<boolean> {
  const str = (await execCommand('taskList.exe')).unwrap()

  const lines = str.split('\n')
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]
    const split = line.split('   ')

    if (split && split[0].toLowerCase().includes(processName)) return true
  }

  return false
}

const SEARCH_INTERVAL = 10 * 1000
export function waitForMinecraftOpen(mcProcess: string): Promise<void> {
  return new Promise((resolve) => {
    const interval = intervals(SEARCH_INTERVAL, () => {
      checkIfProcessExists(mcProcess).then((result) => {
        if (!result) return

        clearInterval(interval as any)
        resolve()
      })
    })
  })
}

const CLOSE_INTERVAL = 10 * 1000
export function waitForMinecraftClose(mcProcess: string): Promise<void> {
  return new Promise((resolve) => {
    const interval = intervals(CLOSE_INTERVAL, () => {
      checkIfProcessExists(mcProcess).then((result) => {
        if (result) return

        clearInterval(interval as any)
        resolve()
      })
    })
  })
}
