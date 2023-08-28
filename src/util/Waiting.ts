import { exec } from 'child_process'
import { Result } from '../lib/Result'
import { execCommand } from './IO'
import { drop } from '../lib/listUtils'

const intervals = (timeout: number, fn: () => void) => setInterval(fn, timeout)

async function checkIfProcessExists(processName: string): Promise<boolean> {
  const str = (await execCommand('taskList.exe')).unwrap()

  const lines = str.split('\n')
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]
    const split = line.split('   ')

    /* TODO: In atlauncher, the name is javaw and in regular minecraft its minecraft.exe, recitfy this */
    if (split && split[0].toLowerCase().includes(processName)) return true
  }

  return false
}

const SEARCH_INTERVAL = 10 * 1000
export function waitForMinecraftOpen(): Promise<void> {
  return new Promise((resolve) => {
    const interval = intervals(SEARCH_INTERVAL, () => {
      checkIfProcessExists('minecraft').then((result) => {
        if (!result) return

        clearInterval(interval as any)
        resolve()
      })
    })
  })
}

const CLOSE_INTERVAL = 10 * 1000
export function waitForMinecraftClose(): Promise<void> {
  return new Promise((resolve) => {
    const interval = intervals(CLOSE_INTERVAL, () => {
      checkIfProcessExists('minecraft').then((result) => {
        if (result) return

        clearInterval(interval as any)
        resolve()
      })
    })
  })
}
