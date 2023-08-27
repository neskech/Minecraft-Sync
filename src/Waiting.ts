
const intervals = (timeout: number, fn: () => void) =>
  setInterval(fn, timeout)

async function checkIfProcessExists(processName: string): Promise<boolean> {
  const list = require('ps-list').psList()
  console.log(list)
  for (const descriptor of list) {
    if (descriptor.name.includes(processName)) return true
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