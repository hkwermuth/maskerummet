-- Seed: brands + online-forhandlere + retailer_brands.
--
-- Initial seed med de mest udbredte garn-mærker i DK/Norden og de
-- online-forhandlere der forhandler dem. Data indsamlet april 2026 fra
-- officielle forhandlerlister:
--   - Drops: garnstudio.com/findastore.php (DK, filtreret på Webshop)
--   - Permin: permin.dk/find-forhandlere + google-søgning
--   - Filcolana: drupal.filcolana.dk/da/forhandlere
--   - Generelt: google-søgning på "forhandler [mærke] danmark online"
--
-- Kun forhandlere med aktiv webshop er medtaget. Fysiske butikker uden
-- webshop ligger fortsat kun i public.stores.
--
-- Brands-tabellen eksisterede fra tidligere opsætning med kolonnerne
-- (slug, name, origin, website) — vi beholder dét skema. Eksisterende
-- brand-slugs (camarose, drops, filcolana, holst, isager, kfo, permin,
-- sandnes) genbruges; nye mærker tilføjes.
--
-- Alle INSERT er idempotente (on conflict do nothing) så migrationen kan køres
-- gentagne gange uden fejl.

begin;

-- ── Brands (nye tilføjes, eksisterende ignoreres) ───────────────────────────

insert into public.brands (slug, name, origin, website) values
  ('hjertegarn',  'Hjertegarn',          'Danmark',  'https://hjertegarn.dk'),
  ('onling',      'Önling',              'Danmark',  'https://onling.dk'),
  ('bc-garn',     'BC Garn',             'Danmark',  'https://bcgarn.dk'),
  ('mayflower',   'Mayflower',           'Danmark',  'https://mayflower-garn.dk'),
  ('istex',       'Ístex',               'Island',   'https://www.istex.is'),
  ('rauma',       'Rauma',               'Norge',    'https://raumaull.no'),
  ('hillesvag',   'Hillesvåg',           'Norge',    'https://www.hillesvag.no'),
  ('novita',      'Novita',              'Finland',  'https://www.novitaknits.com'),
  ('hobbii',      'Hobbii',              'Danmark',  'https://hobbii.dk')
on conflict (slug) do nothing;

-- ── Online-forhandlere ──────────────────────────────────────────────────────

insert into public.online_retailers (slug, navn, url, land, leverer_til_dk, sidst_tjekket, beskrivelse) values
  ('allerupstrik',      'Allerup Strik',       'https://allerupstrik.dk',      'DK', true, current_date, null),
  ('citystoffer',       'Citystoffer',         'https://citystoffer.dk',       'DK', true, current_date, null),
  ('fiksefingre',       'Fiksefingre',         'https://fiksefingre.dk',       'DK', true, current_date, 'Webshop markeret af Garnstudio'),
  ('garn-og-traad',     'Garn & Tråd',         'https://garn-og-traad.dk',     'DK', true, current_date, 'Webshop markeret af Garnstudio'),
  ('garn-kompagniet',   'Garnkompagniet',      'https://garnkompagniet.dk',    'DK', true, current_date, null),
  ('garnkisten',        'Garnkisten',          'https://garnkisten.dk',        'DK', true, current_date, null),
  ('garnstudio-dk',     'Garnstudio (officiel DK-shop)', 'https://www.garnstudio.dk', 'DK', true, current_date, 'Officiel Drops-webshop til DK'),
  ('garnvaerkstedet',   'Garnværkstedet',      'https://garnvaerkstedet.dk',   'DK', true, current_date, null),
  ('gavstrikken',       'Gavstrikken',         'https://gavstrikken.dk',       'DK', true, current_date, null),
  ('hobbii',            'Hobbii',              'https://hobbii.dk',            'DK', true, current_date, 'Stor webshop med egne mærker + mange andre'),
  ('hobbygarn',         'Hobbygarn',           'https://hobbygarn.dk',         'DK', true, current_date, null),
  ('jomr',              'Jomr',                'https://jomr.dk',              'DK', true, current_date, 'Webshop markeret af Garnstudio'),
  ('kreamok',           'Kreamok',             'https://kreamok.dk',           'DK', true, current_date, 'Webshop markeret af Garnstudio'),
  ('little-yarn',       'Little Yarn',         'https://littleyarn.dk',        'DK', true, current_date, null),
  ('maskefabrikken',    'Maskefabrikken',      'https://maskefabrikken.dk',    'DK', true, current_date, null),
  ('netgarn',           'Netgarn',             'https://netgarn.dk',           'DK', true, current_date, null),
  ('nordisk-garn',      'Nordisk Garn',        'https://nordiskgarn.dk',       'DK', true, current_date, 'Specialiseret i nordiske mærker (Ístex, Rauma, Hillesvåg)'),
  ('rito',              'Rito',                'https://rito.com',             'DK', true, current_date, 'Stort udvalg af flere mærker'),
  ('rundpinden',        'Rundpinden',          'https://rundpinden.dk',        'DK', true, current_date, null),
  ('strikkenet',        'Strikkenet',          'https://www.strikkenet.dk',    'DK', true, current_date, null),
  ('strikkeriet',       'Strikkeriet',         'https://strikkeriet.dk',       'DK', true, current_date, 'Webshop markeret af Garnstudio'),
  ('strikkestedet',     'Strikkestedet',       'https://www.strikkestedet.dk', 'DK', true, current_date, null),
  ('svinninge-garn',    'Svinninge Garn',      'https://svinninge-garn.dk',    'DK', true, current_date, 'Webshop markeret af Garnstudio'),
  ('uldfisken',         'Uldfisken',           'https://www.uldfisken.dk',     'DK', true, current_date, null),
  ('uldgalleriet',      'Uldgalleriet',        'https://www.uldgalleriet.dk',  'DK', true, current_date, null),
  ('unigarn',           'Unigarn',             'https://www.unigarn.dk',       'DK', true, current_date, null),
  ('vegagarn',          'VegaGarn',            'https://vegagarn.dk',          'DK', true, current_date, null),
  ('yarnliving',        'YarnLiving',          'https://yarnliving.com',       'DK', true, current_date, 'Webshop markeret af Garnstudio, fører flere mærker')
on conflict (slug) do nothing;

-- ── Forhandler ↔ Mærke ──────────────────────────────────────────────────────
-- Bruger eksisterende brand-slugs: camarose, drops, filcolana, holst, isager,
-- kfo, permin, sandnes — samt nye fra oven.

with mappings(retailer_slug, brand_slug) as (values
  -- Drops
  ('yarnliving',        'drops'),
  ('rito',              'drops'),
  ('hobbygarn',         'drops'),
  ('netgarn',           'drops'),
  ('garnstudio-dk',     'drops'),
  ('garn-og-traad',     'drops'),
  ('jomr',              'drops'),
  ('svinninge-garn',    'drops'),
  ('fiksefingre',       'drops'),
  ('kreamok',           'drops'),
  ('strikkeriet',       'drops'),
  ('rundpinden',        'drops'),
  ('strikkenet',        'drops'),
  ('garn-kompagniet',   'drops'),
  ('hobbii',            'drops'),

  -- Permin
  ('citystoffer',       'permin'),
  ('allerupstrik',      'permin'),
  ('gavstrikken',       'permin'),
  ('vegagarn',          'permin'),
  ('unigarn',           'permin'),
  ('yarnliving',        'permin'),
  ('rito',              'permin'),
  ('hobbii',            'permin'),
  ('hobbygarn',         'permin'),

  -- Filcolana
  ('strikkestedet',     'filcolana'),
  ('maskefabrikken',    'filcolana'),
  ('garnkisten',        'filcolana'),
  ('uldfisken',         'filcolana'),
  ('little-yarn',       'filcolana'),
  ('garnvaerkstedet',   'filcolana'),
  ('uldgalleriet',      'filcolana'),
  ('strikkenet',        'filcolana'),
  ('rito',              'filcolana'),
  ('yarnliving',        'filcolana'),
  ('hobbii',            'filcolana'),

  -- Nordiske mærker via Nordisk Garn
  ('nordisk-garn',      'istex'),
  ('nordisk-garn',      'rauma'),
  ('nordisk-garn',      'hillesvag'),

  -- Hobbii: egne mærker
  ('hobbii',            'hobbii'),
  ('hobbii',            'mayflower'),

  -- Generelle shops, flere mærker
  ('rito',              'sandnes'),
  ('rito',              'camarose'),
  ('rito',              'hjertegarn'),
  ('rito',              'mayflower'),
  ('rito',              'bc-garn'),
  ('rito',              'holst'),
  ('yarnliving',        'sandnes'),
  ('yarnliving',        'camarose'),
  ('yarnliving',        'hjertegarn'),
  ('yarnliving',        'mayflower'),
  ('garn-kompagniet',   'hjertegarn'),
  ('garn-kompagniet',   'mayflower'),
  ('garn-kompagniet',   'camarose'),
  ('garn-kompagniet',   'bc-garn'),
  ('uldgalleriet',      'isager'),
  ('uldgalleriet',      'kfo'),
  ('uldgalleriet',      'onling'),
  ('strikkestedet',     'isager'),
  ('strikkestedet',     'kfo'),
  ('strikkestedet',     'onling'),
  ('strikkestedet',     'camarose'),
  ('garnvaerkstedet',   'isager'),
  ('garnvaerkstedet',   'kfo'),
  ('garnvaerkstedet',   'camarose'),
  ('little-yarn',       'isager'),
  ('little-yarn',       'kfo'),
  ('little-yarn',       'camarose'),
  ('little-yarn',       'onling')
)
insert into public.retailer_brands (retailer_id, brand_id)
select r.id, b.id
from mappings m
join public.online_retailers r on r.slug = m.retailer_slug
join public.brands b on b.slug = m.brand_slug
on conflict (retailer_id, brand_id) do nothing;

commit;
