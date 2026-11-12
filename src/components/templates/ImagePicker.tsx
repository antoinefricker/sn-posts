import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { FormMessage } from '@/components/FormMessage'
import { useStorageImage } from '@/components/slides/useStorageImage'
import { buttonVariants } from '@/components/ui/button'
import { toMessage } from '@/data/errors'
import { listTemplateImages, uploadTemplateImage, validateImageFile } from '@/data/templateImages'
import type { StoredImage } from '@/data/templateImages'

type ImagePickerProps = {
  value: string | null
  onChange: (path: string | null) => void
  disabled?: boolean
}

/** Grid of the club's stored images with upload; "None" clears the selection. */
export function ImagePicker({ value, onChange, disabled }: ImagePickerProps) {
  const [images, setImages] = useState<StoredImage[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listTemplateImages()
      .then((list) => {
        if (!cancelled) setImages(list)
      })
      .catch((e) => {
        if (!cancelled) {
          setImages([])
          setError(toMessage(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    setError(null)
    const invalid = validateImageFile(file)
    if (invalid) {
      setError(invalid)
      input.value = ''
      return
    }
    setUploading(true)
    try {
      const path = await uploadTemplateImage(file)
      const name = path.slice(path.lastIndexOf('/') + 1)
      setImages((prev) => [{ path, name, created_at: new Date().toISOString() }, ...(prev ?? [])])
      onChange(path)
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  const locked = disabled || uploading
  // A selected path may be missing from the list (e.g. list capped at 100); still show it.
  const shown =
    value && images && !images.some((i) => i.path === value)
      ? [{ path: value, name: value, created_at: '' }, ...images]
      : images

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Images">
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          disabled={locked}
          onClick={() => onChange(null)}
          className={`flex aspect-square items-center justify-center rounded-lg border text-sm disabled:opacity-50 ${
            value === null ? 'border-primary ring-2 ring-primary/50' : 'border-input'
          }`}
        >
          None
        </button>
        {shown?.map((image) => (
          <Thumbnail
            key={image.path}
            image={image}
            selected={image.path === value}
            disabled={locked}
            onSelect={() => onChange(image.path)}
          />
        ))}
      </div>
      {images === null && <p className="text-sm text-muted-foreground">Loading images…</p>}
      <div className="flex items-center gap-2">
        <label
          className={`${buttonVariants({ variant: 'outline', size: 'sm' })} ${
            locked ? 'pointer-events-none opacity-50' : 'cursor-pointer'
          } focus-within:ring-3 focus-within:ring-ring/50`}
        >
          {uploading ? 'Uploading…' : 'Upload image'}
          <input type="file" accept="image/*" className="sr-only" disabled={locked} onChange={handleFile} />
        </label>
      </div>
      <FormMessage message={error ? { ok: false, text: error } : null} />
    </div>
  )
}

function Thumbnail({
  image,
  selected,
  disabled,
  onSelect,
}: {
  image: StoredImage
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const { url, status } = useStorageImage(image.path)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={image.name}
      disabled={disabled}
      onClick={onSelect}
      className={`aspect-square overflow-hidden rounded-lg border bg-muted text-xs disabled:opacity-50 ${
        selected ? 'border-primary ring-2 ring-primary/50' : 'border-input'
      }`}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-muted-foreground">{status === 'missing' ? 'Missing' : '…'}</span>
      )}
    </button>
  )
}
