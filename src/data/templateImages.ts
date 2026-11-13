import { supabase } from '@/supabase'
import { validateImageFile } from '@/lib/templateImages'

export { validateImageFile } from '@/lib/templateImages'

const BUCKET = 'template-images'

export type StoredImage = { path: string; name: string; created_at: string }

async function getClubFolder(): Promise<string> {
  const { data, error } = await supabase.rpc('current_club_id')
  if (error) throw error
  if (!data) throw new Error('No club found for the current user')
  // The storage policy compares against club_id::text, which is lowercase.
  return String(data).toLowerCase()
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .slice(-80)
  return cleaned || 'image'
}

export async function uploadTemplateImage(file: File): Promise<string> {
  const invalid = validateImageFile(file)
  if (invalid) throw new Error(invalid)
  const folder = await getClubFolder()
  const path = `${folder}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

export async function listTemplateImages(): Promise<StoredImage[]> {
  const folder = await getClubFolder()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw error
  return data
    .filter((o) => o.id !== null)
    .map((o) => ({ path: `${folder}/${o.name}`, name: o.name, created_at: o.created_at ?? '' }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function downloadTemplateImage(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw error
  return data
}
