import { describe, expect, it } from 'vitest'
import { paginate } from './pagination'

describe('paginate', () => {
  const items = Array.from({ length: 45 }, (_, i) => i + 1)

  it('returns the requested page with its bounds', () => {
    const p = paginate(items, 2, 20)
    expect(p.items).toEqual(items.slice(20, 40))
    expect(p).toMatchObject({ page: 2, pageCount: 3, from: 21, to: 40, total: 45 })
  })
  it('has a shorter last page', () => {
    const p = paginate(items, 3, 20)
    expect(p.items).toEqual([41, 42, 43, 44, 45])
    expect(p).toMatchObject({ from: 41, to: 45 })
  })
  it('clamps a page that no longer exists, for instance after a filter or a delete', () => {
    expect(paginate(items, 9, 20).page).toBe(3)
    expect(paginate(items, 0, 20).page).toBe(1)
    expect(paginate(items, -4, 20).page).toBe(1)
  })
  it('handles an empty list as a single empty page', () => {
    expect(paginate([], 1, 20)).toEqual({ items: [], page: 1, pageCount: 1, from: 0, to: 0, total: 0 })
  })
  it('fits exactly one page when the size equals the count', () => {
    expect(paginate([1, 2, 3], 1, 3)).toMatchObject({ pageCount: 1, from: 1, to: 3 })
  })
})
