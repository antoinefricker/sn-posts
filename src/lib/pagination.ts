export type Page<T> = {
  items: T[]
  /** The page actually returned: the requested one, kept within 1..pageCount. */
  page: number
  pageCount: number
  /** 1-based position of the first and last item shown (0 and 0 when empty). */
  from: number
  to: number
  total: number
}

/** One page of a list. `page` is 1-based and clamped, so a shrinking list never shows an empty page. */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * pageSize
  const slice = items.slice(start, start + pageSize)
  return {
    items: slice,
    page: current,
    pageCount,
    from: slice.length === 0 ? 0 : start + 1,
    to: start + slice.length,
    total: items.length,
  }
}
