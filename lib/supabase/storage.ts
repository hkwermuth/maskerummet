import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Upload en fil til et Supabase Storage bucket og returnér en signed URL
 * (365 dage) for private buckets, eller public URL som fallback.
 */
export async function uploadFile(
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { error } = await client.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error

  const { data: { publicUrl } } = client.storage.from(bucket).getPublicUrl(path)
  const { data: signed } = await client.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  return signed?.signedUrl ?? publicUrl
}

/** Slet en fil fra et Supabase Storage bucket. */
export async function deleteFile(
  client: SupabaseClient,
  bucket: string,
  path: string
): Promise<void> {
  await client.storage.from(bucket).remove([path])
}
