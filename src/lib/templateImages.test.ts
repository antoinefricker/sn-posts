import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, validateImageFile } from './templateImages'

function file(type: string, size: number): File {
  return new File([new Uint8Array(size)], 'x', { type })
}

describe('validateImageFile', () => {
  it('accepts a small png', () => {
    expect(validateImageFile(file('image/png', 1024))).toBeNull()
  })
  it('rejects non-image types', () => {
    expect(validateImageFile(file('application/pdf', 1024))).toBe(
      'File must be a PNG, JPEG or WebP image',
    )
  })
  it('rejects a 6 MB jpeg', () => {
    expect(validateImageFile(file('image/jpeg', 6 * 1024 * 1024))).toBe(
      'Image must be 5 MB or smaller',
    )
  })
  it('accepts exactly 5 MiB and rejects one byte more', () => {
    expect(validateImageFile(file('image/webp', MAX_IMAGE_BYTES))).toBeNull()
    expect(validateImageFile(file('image/webp', MAX_IMAGE_BYTES + 1))).toBe(
      'Image must be 5 MB or smaller',
    )
  })
})
