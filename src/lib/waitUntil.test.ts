import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { waitUntil } from './waitUntil'

describe('waitUntil', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves true immediately when already satisfied', async () => {
    await expect(waitUntil(() => true, 1000)).resolves.toBe(true)
  })

  it('resolves true once the predicate becomes true', async () => {
    let ready = false
    const result = waitUntil(() => ready, 1000, 50)
    await vi.advanceTimersByTimeAsync(120)
    ready = true
    await vi.advanceTimersByTimeAsync(60)
    await expect(result).resolves.toBe(true)
  })

  it('resolves false on timeout so a stuck load cannot hang', async () => {
    const result = waitUntil(() => false, 300, 50)
    await vi.advanceTimersByTimeAsync(400)
    await expect(result).resolves.toBe(false)
  })
})
