-- get_substitutions v2: bedre vægtning af pind+strikkefasthed.
--
-- Forrige version sammenlignede kun gauge_stitches_10cm som et flat tal og
-- straffede ikke at to garner havde forskellig "primær pind". Det gav fx
-- "god"-verdict for Edy Angola Mohair Edition Recy (23m@3.5) som erstatning
-- for Edy Angola Alpaca Merino (~20m@4) — de er meget forskellige garner.
--
-- Ny logik:
--   * Hvis begge har samme primær-pind (±0,25 mm tolerance), sammenlignes
--     strikkefastheden direkte (op til 20 point ved nøjagtigt match).
--   * Hvis primær-pinde er forskellige, kan tal-gauge stadig give max 6 point
--     (de er æbler/pærer — selv om begge står "20 m" er det på forskellige pinde).
--   * Pind-interval-overlap erstattes af en vægtet score: jo større overlap,
--     desto flere point (op til 10).
--
-- Returtype må IKKE ændres — lib/types.ts → SubstitutionCandidate binder
-- på det. Bevarer kolonner: yarn_id, producer, name, series, score, verdict,
-- is_manual, critical_field, notes.

begin;

drop function if exists public.get_substitutions(uuid, integer);

create or replace function public.get_substitutions(target_yarn uuid, limit_n integer default 10)
returns table (
  yarn_id uuid,
  producer text,
  name text,
  series text,
  score integer,
  verdict text,
  is_manual boolean,
  critical_field text,
  notes text
)
language sql
stable
as $function$
  with target as (
    select * from yarns where id = target_yarn
  ),
  scored as (
    select
      y.id,
      y.producer,
      y.name,
      y.series,
      (
        case when y.thickness_category = t.thickness_category then 20 else 0 end
      + case when abs(coalesce(y.length_per_100g_m,0) - coalesce(t.length_per_100g_m,0))
             <= 0.10 * coalesce(t.length_per_100g_m, 1) then 15 else 0 end
      -- Gauge-led: vægter "samme primær-pind" højere end blot samme tal-gauge
      + case
          when y.gauge_needle_mm is not null and t.gauge_needle_mm is not null
           and abs(y.gauge_needle_mm - t.gauge_needle_mm) <= 0.25 then
            case
              when abs(coalesce(y.gauge_stitches_10cm,0) - coalesce(t.gauge_stitches_10cm,0)) <= 1 then 20
              when abs(coalesce(y.gauge_stitches_10cm,0) - coalesce(t.gauge_stitches_10cm,0)) <= 2 then 12
              when abs(coalesce(y.gauge_stitches_10cm,0) - coalesce(t.gauge_stitches_10cm,0)) <= 4 then 4
              else 0
            end
          else
            case
              when abs(coalesce(y.gauge_stitches_10cm,0) - coalesce(t.gauge_stitches_10cm,0)) <= 2 then 6
              else 0
            end
        end
      + case when y.fiber_main = t.fiber_main then 10 else 0 end
      + (yarn_fiber_overlap(t.id, y.id)::int / 5)
      + case when y.wash_care = t.wash_care then 10 else 0 end
      -- Pind-interval-overlap: vægtet efter mm-overlap, op til 10 point
      + case
          when y.needle_min_mm is not null and y.needle_max_mm is not null
           and t.needle_min_mm is not null and t.needle_max_mm is not null
           and y.needle_min_mm <= t.needle_max_mm
           and y.needle_max_mm >= t.needle_min_mm then
            least(
              10,
              5 + (
                (least(y.needle_max_mm, t.needle_max_mm)
                 - greatest(y.needle_min_mm, t.needle_min_mm))::numeric * 2
              )::int
            )
          else 0
        end
      )::int as score
    from yarns y, target t
    where y.id <> t.id
  ),
  with_verdict as (
    select
      s.*,
      case
        when s.score >= 85 then 'perfekt'
        when s.score >= 65 then 'god'
        when s.score >= 45 then 'forbehold'
        else 'virker_ikke'
      end as auto_verdict
    from scored s
  ),
  merged as (
    select
      w.id as yarn_id,
      w.producer, w.name, w.series, w.score,
      coalesce(sub.verdict::text, w.auto_verdict) as verdict,
      (sub.id is not null) as is_manual,
      sub.critical_field,
      sub.notes
    from with_verdict w
    left join substitutions sub
      on (
        least(sub.yarn_a_id, sub.yarn_b_id) = least(target_yarn, w.id)
        and greatest(sub.yarn_a_id, sub.yarn_b_id) = greatest(target_yarn, w.id)
      )
  )
  select * from merged
  where verdict <> 'virker_ikke'
  order by
    is_manual desc,
    score desc
  limit limit_n;
$function$;

-- Tildel execute-rettigheder (matcher tidligere version)
grant execute on function public.get_substitutions(uuid, integer) to anon, authenticated;

commit;
