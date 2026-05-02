import type { FiberComponent } from '@/lib/types'
import { labelFiber } from '@/lib/labels'

const COLORS: Record<string, string> = {
  merinould: '#C8A982',
  uld: '#A88B6A',
  islandsk_uld: '#8B7355',
  shetland_uld: '#9C8266',
  silke: '#E8C8A0',
  tussah_silke: '#D8B888',
  kid_mohair: '#F0D8B8',
  mohair: '#E8C8A0',
  alpaka: '#B89878',
  baby_alpaka: '#C8A888',
  kashmir: '#D8B898',
  bomuld: '#F0E8D8',
  merceriseret_bomuld: '#F0E0C8',
  oekologisk_bomuld: '#E8E0C8',
  hør: '#C8C0A8',
  hamp: '#A8A088',
  viskose: '#B8B098',
  tencel: '#A8B0B8',
  nylon_polyamid: '#888888',
  polyester: '#787878',
  acryl: '#989898',
  courtelle: '#A8A8A8',
}

export function FiberBar({ fibers }: { fibers: FiberComponent[] | null | undefined }) {
  if (!fibers || fibers.length === 0) return null
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden border border-striq-border">
        {fibers.map((f) => (
          <div
            key={f.fiber}
            style={{ width: `${f.percentage}%`, background: COLORS[f.fiber] ?? '#B8A888' }}
            title={`${labelFiber(f.fiber)} ${f.percentage}%`}
          />
        ))}
      </div>
      <ul className="mt-2 text-xs text-striq-muted flex flex-wrap gap-x-3 gap-y-1">
        {fibers.map((f) => (
          <li key={f.fiber}>
            <span
              className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
              style={{ background: COLORS[f.fiber] ?? '#B8A888' }}
            />
            {labelFiber(f.fiber)} {f.percentage}%
          </li>
        ))}
      </ul>
    </div>
  )
}
