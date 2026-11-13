/** Resolves true once `predicate` returns true, or false when `timeoutMs` elapses first. Polls every `intervalMs`. */
export function waitUntil(predicate: () => boolean, timeoutMs: number, intervalMs = 50): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs
    const check = () => {
      if (predicate()) return resolve(true)
      if (Date.now() >= deadline) return resolve(false)
      setTimeout(check, intervalMs)
    }
    check()
  })
}
