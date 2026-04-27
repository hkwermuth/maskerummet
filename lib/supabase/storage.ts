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

/** Slet flere filer fra et Supabase Storage bucket på én gang. */
export async function deleteFiles(
  client: SupabaseClient,
  bucket: string,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return
  await client.storage.from(bucket).remove(paths)
}

/**
 * Validér en fil før upload. Kaster Error med dansk besked hvis filen er for
 * stor eller har en uventet MIME-type.
 */
export function validateUploadFile(
  file: File,
  opts: { maxBytes: number; allowedMimes: readonly string[] }
): void {
  if (file.size > opts.maxBytes) {
    const mb = Math.round(opts.maxBytes / (1024 * 1024))
    throw new Error(`Filen er for stor — maks. ${mb} MB.`)
  }
  // Nogle browsere/oses giver tom MIME for valide filer; vær mild her.
  if (file.type && !opts.allowedMimes.includes(file.type)) {
    throw new Error(`Filtypen "${file.type}" er ikke understøttet.`)
  }
}

/**
 * Upload flere filer parallelt til samme bucket. Returnerer URL'erne i samme
 * rækkefølge som input. Hvis nogen fil fejler, kastes fejlen — kald-stedet er
 * ansvarligt for at rydde op (slet allerede uploadede filer).
 */
export async function uploadFilesParallel(
  client: SupabaseClient,
  bucket: string,
  items: { path: string; file: File }[]
): Promise<string[]> {
  return Promise.all(items.map(({ path, file }) => uploadFile(client, bucket, path, file)))
}
