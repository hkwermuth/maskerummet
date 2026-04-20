export function KeyFact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <dt className="font-semibold text-striq-sage min-w-[130px]">{label}:</dt>
      <dd className="text-striq-muted">{value}</dd>
    </div>
  )
}
