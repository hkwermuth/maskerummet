export function toSlug(producer: string, name: string, series: string | null): string {
  const parts = [producer, name, series ?? ''].filter(Boolean).join(' ')
  return parts
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
