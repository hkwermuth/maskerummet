// Generic CSV generator — takes array of objects + column mapping, returns Blob with UTF-8 BOM.

type ColumnMapping<T> = {
  header: string
  value: (row: T) => string | number | null | undefined
}

export function generateCsv<T>(rows: T[], columns: ColumnMapping<T>[]): Blob {
  const BOM = '\uFEFF'
  const separator = ';' // Excel-friendly for Danish locale

  const headerLine = columns.map(c => escapeCsvField(c.header)).join(separator)

  const dataLines = rows.map(row =>
    columns.map(c => escapeCsvField(String(c.value(row) ?? ''))).join(separator)
  )

  const csv = BOM + [headerLine, ...dataLines].join('\r\n')
  return new Blob([csv], { type: 'text/csv;charset=utf-8' })
}

function escapeCsvField(field: string): string {
  if (field.includes(';') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return '"' + field.replace(/"/g, '""') + '"'
  }
  return field
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}
