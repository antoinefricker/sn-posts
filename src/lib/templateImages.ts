export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'File must be a PNG, JPEG or WebP image'
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 5 MB or smaller'
  return null
}
