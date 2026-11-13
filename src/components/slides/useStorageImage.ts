import { useEffect, useState } from 'react'
import { downloadTemplateImage } from '@/data/templateImages'

type StorageImage = { url: string | null; status: 'idle' | 'loading' | 'ready' | 'missing' }

type Loaded = StorageImage & { path: string }

/** Downloads a template image and exposes it as an object URL, revoked when the path changes or on unmount. */
export function useStorageImage(path: string | null): StorageImage {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    let objectUrl: string | null = null
    downloadTemplateImage(path)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setLoaded({ path, url: objectUrl, status: 'ready' })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ path, url: null, status: 'missing' })
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  if (!path) return { url: null, status: 'idle' }
  if (!loaded || loaded.path !== path) return { url: null, status: 'loading' }
  return { url: loaded.url, status: loaded.status }
}
