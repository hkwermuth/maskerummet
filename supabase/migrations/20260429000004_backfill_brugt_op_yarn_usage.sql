-- F15 backfill: opret yarn_usage-rækker for eksisterende yarn_items.status='Brugt op'
-- hvor brugt_til_projekt entydigt matcher en projekt-titel for samme bruger.
--
-- Inden denne feature gemte BrugtOpFoldeUd kun fri tekst i yarn_items.brugt_til_projekt,
-- så projektet vidste ikke at garnet var brugt der. Denne migration retter det
-- retroaktivt — kun hvor matchen er entydig (count=1).
--
-- quantity_used = NULL (vi kender ikke historisk forbrug — yarn_items.quantity er
-- allerede 0 for "Brugt op").
-- Auto-oprettede yarn_usage-rækker fra denne migration har ikke catalog_yarn_id
-- eller catalog_color_id da yarn_items ikke nødvendigvis har dem sat.
--
-- Idempotent: NOT EXISTS-guard sikrer at gen-kørsel rammer 0 rækker.

begin;

insert into public.yarn_usage (
  user_id, project_id, yarn_item_id, yarn_name, yarn_brand,
  color_name, color_code, hex_color, catalog_yarn_id, catalog_color_id,
  quantity_used, used_at
)
select
  yi.user_id, p.id, yi.id, yi.name, yi.brand,
  yi.color_name, yi.color_code, yi.hex_color, yi.catalog_yarn_id, yi.catalog_color_id,
  null, coalesce(yi.brugt_op_dato, current_date)
from public.yarn_items yi
join lateral (
  select pp.id
    from public.projects pp
   where pp.user_id = yi.user_id
     and lower(trim(pp.title)) = lower(trim(yi.brugt_til_projekt))
) p on true
where yi.status = 'Brugt op'
  and yi.brugt_til_projekt is not null
  and length(trim(yi.brugt_til_projekt)) > 0
  -- Kun entydige matches: præcis ét projekt med samme titel hos samme bruger.
  and (
    select count(*) from public.projects p2
     where p2.user_id = yi.user_id
       and lower(trim(p2.title)) = lower(trim(yi.brugt_til_projekt))
  ) = 1
  -- Idempotens: spring over hvis vi allerede har koblingen.
  and not exists (
    select 1 from public.yarn_usage u
     where u.yarn_item_id = yi.id and u.project_id = p.id
  );

commit;
