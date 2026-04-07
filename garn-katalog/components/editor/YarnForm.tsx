'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Yarn, FiberComponent } from '@/lib/types'
import { toSlug } from '@/lib/slug'

type Props = { initial?: Partial<Yarn> & { fibers?: FiberComponent[] | null } }

const FIBER_OPTIONS = [
  'merinould', 'uld', 'islandsk_uld', 'shetland_uld', 'kid_mohair', 'mohair',
  'alpaka', 'baby_alpaka', 'kashmir', 'silke', 'tussah_silke',
  'bomuld', 'merceriseret_bomuld', 'lin', 'hamp', 'viskose', 'tencel',
  'nylon_polyamid', 'polyester', 'acryl', 'courtelle', 'andet',
]

const THICKNESS = ['lace','fingering','sport','dk','worsted','aran','bulky','super_bulky','jumbo','unspun']

export function YarnForm({ initial }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [producer, setProducer] = useState(initial?.producer ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [series, setSeries] = useState(initial?.series ?? '')
  const [fiberMain, setFiberMain] = useState(initial?.fiber_main ?? '')
  const [thickness, setThickness] = useState(initial?.thickness_category ?? '')
  const [ballWeight, setBallWeight] = useState(initial?.ball_weight_g?.toString() ?? '')
  const [length, setLength] = useState(initial?.length_per_100g_m?.toString() ?? '')
  const [needleMin, setNeedleMin] = useState(initial?.needle_min_mm?.toString() ?? '')
  const [needleMax, setNeedleMax] = useState(initial?.needle_max_mm?.toString() ?? '')
  const [gaugeSt, setGaugeSt] = useState(initial?.gauge_stitches_10cm?.toString() ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [fibers, setFibers] = useState<FiberComponent[]>(initial?.fibers ?? [])

  function setFiber(i: number, key: 'fiber' | 'percentage', v: string) {
    setFibers((arr) => {
      const next = [...arr]
      if (key === 'fiber') next[i] = { ...next[i], fiber: v }
      else next[i] = { ...next[i], percentage: parseFloat(v) || 0 }
      return next
    })
  }
  function addFiber() {
    setFibers((arr) => [...arr, { fiber: 'uld', percentage: 0 }])
  }
  function removeFiber(i: number) {
    setFibers((arr) => arr.filter((_, idx) => idx !== i))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const supabase = createSupabaseBrowserClient()

    const payload: Record<string, unknown> = {
      producer, name,
      series: series || null,
      fiber_main: fiberMain || null,
      thickness_category: thickness || null,
      ball_weight_g: ballWeight ? parseFloat(ballWeight) : null,
      length_per_100g_m: length ? parseFloat(length) : null,
      needle_min_mm: needleMin ? parseFloat(needleMin) : null,
      needle_max_mm: needleMax ? parseFloat(needleMax) : null,
      gauge_stitches_10cm: gaugeSt ? parseFloat(gaugeSt) : null,
      description: description || null,
    }

    let yarnId = initial?.id
    if (yarnId) {
      const { error } = await supabase.from('yarns').update(payload).eq('id', yarnId)
      if (error) { setErr(error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('yarns').insert(payload).select('id').single()
      if (error) { setErr(error.message); setSaving(false); return }
      yarnId = data.id
    }

    // Replace fibers
    if (yarnId) {
      await supabase.from('yarn_fiber_components').delete().eq('yarn_id', yarnId)
      if (fibers.length > 0) {
        const { error } = await supabase.from('yarn_fiber_components').insert(
          fibers.map((f, i) => ({ yarn_id: yarnId, fiber: f.fiber, percentage: f.percentage, sort_order: i }))
        )
        if (error) { setErr(error.message); setSaving(false); return }
      }
    }

    // On-demand revalidate
    const slug = toSlug(producer, name, series || null)
    try {
      await fetch(`/garn/api/revalidate?path=/&path=/${slug}`, { method: 'POST' })
    } catch {}

    setSaving(false)
    router.push('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-5 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Producent *"><input required value={producer} onChange={(e) => setProducer(e.target.value)} className={inputCls} /></Field>
        <Field label="Navn *"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
        <Field label="Serie"><input value={series ?? ''} onChange={(e) => setSeries(e.target.value)} className={inputCls} /></Field>
        <Field label="Fiber-hovedkategori"><input value={fiberMain ?? ''} onChange={(e) => setFiberMain(e.target.value)} className={inputCls} /></Field>
        <Field label="Tykkelse">
          <select value={thickness ?? ''} onChange={(e) => setThickness(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {THICKNESS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Nøglevægt (g)"><input value={ballWeight} onChange={(e) => setBallWeight(e.target.value)} className={inputCls} /></Field>
        <Field label="Løbelængde (m/100g)"><input value={length} onChange={(e) => setLength(e.target.value)} className={inputCls} /></Field>
        <Field label="Pind min (mm)"><input value={needleMin} onChange={(e) => setNeedleMin(e.target.value)} className={inputCls} /></Field>
        <Field label="Pind max (mm)"><input value={needleMax} onChange={(e) => setNeedleMax(e.target.value)} className={inputCls} /></Field>
        <Field label="Strikkefasthed (m/10cm)"><input value={gaugeSt} onChange={(e) => setGaugeSt(e.target.value)} className={inputCls} /></Field>
      </div>

      <Field label="Beskrivelse">
        <textarea value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-forest font-medium">Fibre</label>
          <button type="button" onClick={addFiber} className="text-xs bg-stone px-2 py-1 rounded">+ Tilføj fiber</button>
        </div>
        <div className="space-y-2">
          {fibers.map((f, i) => (
            <div key={i} className="flex gap-2">
              <select value={f.fiber} onChange={(e) => setFiber(i, 'fiber', e.target.value)} className={inputCls + ' flex-1'}>
                {FIBER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input
                type="number" step="0.01" min="0" max="100"
                value={f.percentage}
                onChange={(e) => setFiber(i, 'percentage', e.target.value)}
                className={inputCls + ' w-24'}
              />
              <button type="button" onClick={() => removeFiber(i)} className="text-terracotta px-2">×</button>
            </div>
          ))}
        </div>
        <div className="text-xs text-bark mt-1">
          Sum: {fibers.reduce((s, f) => s + (f.percentage || 0), 0)}%
        </div>
      </div>

      {err && <p className="text-terracotta text-sm">{err}</p>}
      <button disabled={saving} className="bg-forest text-cream px-5 py-2 rounded-lg disabled:opacity-50">
        {saving ? 'Gemmer…' : 'Gem garn'}
      </button>
    </form>
  )
}

const inputCls = 'px-3 py-2 rounded-lg border border-stone bg-cream w-full'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-terracotta mb-1">{label}</div>
      {children}
    </label>
  )
}
