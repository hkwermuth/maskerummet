-- Auto-beregnede substitutioner med manuel override fra substitutions-tabellen.
-- Kør hele filen i Supabase SQL Editor.

-- 1) Fiber-overlap helper: summen af min(a%, b%) pr. fælles fiber (0-100)
create or replace function yarn_fiber_overlap(a uuid, b uuid)
returns numeric
language sql stable as $$
  select coalesce(sum(least(fa.percentage, fb.percentage)), 0)
  from yarn_fiber_components fa
  join yarn_fiber_components fb
    on fa.fiber = fb.fiber and fb.yarn_id = b
  where fa.yarn_id = a;
$$;

-- 2) Hoved-RPC
create or replace function get_substitutions(
  target_yarn uuid,
  limit_n int default 10
)
returns table (
  yarn_id uuid,
  producer text,
  name text,
  series text,
  score int,
  verdict text,
  is_manual boolean,
  critical_field text,
  notes text
)
language sql stable as $$
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
      + case when abs(coalesce(y.gauge_stitches_10cm,0) - coalesce(t.gauge_stitches_10cm,0)) <= 2 then 15
             when abs(coalesce(y.gauge_stitches_10cm,0) - coalesce(t.gauge_stitches_10cm,0)) <= 4 then 7
             else 0 end
      + case when y.fiber_main = t.fiber_main then 10 else 0 end
      + (yarn_fiber_overlap(t.id, y.id)::int / 5)
      + case when y.wash_care = t.wash_care then 10 else 0 end
      + case when y.needle_min_mm <= t.needle_max_mm
              and y.needle_max_mm >= t.needle_min_mm then 10 else 0 end
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
$$;

grant execute on function yarn_fiber_overlap(uuid, uuid) to anon, authenticated;
grant execute on function get_substitutions(uuid, int) to anon, authenticated;
