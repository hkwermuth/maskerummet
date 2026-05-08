-- Strikkecaféer + stores Excel-sync (2026-05-08)
--
-- 1. Tilføjer is_strikkecafe + note kolonner til stores
-- 2. Brand-tag-propagation: kopiér de 6 flyttede webshops' store_brands → retailer_brands
-- 3. Opretter de 6 webshops i online_retailers (idempotent, slug-baseret)
-- 4. Sletter 31 'SLETTES'-rækker fra stores (matchet via UUID)
-- 5. Opdaterer 186 eksisterende stores med note, is_strikkecafe, website
--    Website opdateres KUN hvis nuværende DB-værdi er NULL/tom (Hannahs krav)
-- 6. Sletter de 6 webshops fra stores (efter brand-propagation)
-- 7. Indsætter ~36 nye fysiske butikker
-- 8. 11 unmatched eksisterende rækker forsøges matchet via (lower(name), postcode)
--    No-op hvis ikke fundet (idempotent).
--
-- RLS: stores har offentlig SELECT (eksisterende). online_retailers ligeledes.
-- GRANT eksplicit på begge for at imødekomme PostgREST.

begin;


-- ── 1. Skema ──
alter table public.stores
  add column if not exists is_strikkecafe boolean not null default false,
  add column if not exists note text null;

create index if not exists stores_is_strikkecafe_idx
  on public.stores (is_strikkecafe) where is_strikkecafe = true;

grant select on public.stores to anon, authenticated;
grant select on public.online_retailers to anon, authenticated;


-- ── 2. Brand-tag-propagation ──
-- Kopiér de 6 webshops' eksisterende store_brands → retailer_brands.
-- Online-retailers oprettes i step 3, men vi bruger en CTE med slug → online_retailer_id-lookup.
-- For YarnStudio findes ingen stores-række (ny) — den får ingen brand-tags.
--
-- Vi kører dette FØR delete så vi ikke mister koblingen.
-- Idempotent: on conflict do nothing.

with webshop_sources(store_id, retailer_slug) as (
  values
    ('fd7e02db-b293-4b1b-9af7-1434101d6797'::uuid, 'yarn-living'),
    ('d4b95f55-9cbf-4d61-9110-b4c2c1b580ff'::uuid, 'kreamok'),
    ('0322722b-0a62-46e8-9472-65c63d1ca88e'::uuid, 'sysleriget'),
    ('2c70f01c-1720-475d-9766-4b90fd66b798'::uuid, 'just-one-more-row')
), 
to_propagate as (
  select rb_target.id as retailer_id, sb.brand_id
  from webshop_sources ws
  join public.store_brands sb on sb.store_id = ws.store_id
  join public.online_retailers rb_target on rb_target.slug = ws.retailer_slug
)
insert into public.retailer_brands (retailer_id, brand_id)
select retailer_id, brand_id from to_propagate
on conflict (retailer_id, brand_id) do nothing;


-- ── 3. Online retailers (idempotent) ──
insert into public.online_retailers (slug, navn, url, land, leverer_til_dk, beskrivelse, sidst_tjekket) values
  ('yarnstudio', 'YarnStudio', 'https://yarnstudio.dk', 'DK', true, null, '2026-05-08'::date),
  ('yarn-living', 'Yarn Living Aps', 'https://yarnliving.dk', 'DK', true, null, '2026-05-08'::date),
  ('kreamok', 'Kreamok', 'https://kreamok.dk', 'DK', true, null, '2026-05-08'::date),
  ('sysleriget', 'Sysleriget', 'https://sysleriget.com', 'DK', true, null, '2026-05-08'::date),
  ('just-one-more-row', 'Just One More Row (Delphi Trading)', 'https://justonemorerow.dk', 'DK', true, null, '2026-05-08'::date),
  ('unigarn', 'Unigarn', 'https://unigarn.dk', 'DK', true, null, '2026-05-08'::date)

on conflict (slug) do nothing;


-- ── 4. Slet SLETTES-rækker (matchet via UUID fra Excel-sync) ──
delete from public.stores where id = any(array[
'abf0847c-62f3-48f2-be2d-9733bc8241a9'::uuid,
  'fe9134fb-2f2f-45b6-8f8c-0b2ae1767dfa'::uuid,
  '00443f51-e1fa-411d-b3a9-268923db495f'::uuid,
  '5d4dc1bc-b359-4509-9613-794e95bc4199'::uuid,
  '664ae712-e1ef-476e-93c1-22620219987a'::uuid,
  '3be6131f-147e-4f40-a62f-ccecc0495d35'::uuid,
  'e5a0a47d-f8e1-4aa1-9516-12bafc0f0db5'::uuid,
  '398c35e2-fbf6-4b7b-a740-a09da32db0f8'::uuid,
  '146ce75c-b574-4751-a4a3-5adeb57df453'::uuid,
  '99a2d582-a374-48ca-96cf-eda971beff8d'::uuid,
  'a3769493-8e80-4091-9de3-2f3b3647e9d3'::uuid,
  '8e8fde3b-2212-43c6-b493-e305ffab4cef'::uuid,
  '228dec29-24e1-4454-ad20-f149f3198cf1'::uuid,
  '725c8ede-d8d1-4513-bb3e-31a1fe00032c'::uuid,
  '05cc7965-fce5-434d-bd0f-1f7032108265'::uuid,
  '39bdb2d4-1e1f-4f3e-afa0-7d9feebaddaa'::uuid,
  'cbff7e29-6a8e-47d1-920f-c5ecc1c21682'::uuid,
  'cc2dd798-01dd-4d0c-b4b7-6a83f40b4025'::uuid,
  'bd0f5b06-ab56-4443-97d6-0bb00093982f'::uuid,
  '2ba8ea39-cf5a-4977-a3f0-e7b6b015d182'::uuid,
  '93ebd0a4-51d0-42d8-bc74-5a0e545cd251'::uuid,
  '0d77ff47-a2c0-4d43-9a16-7e13f5664098'::uuid,
  '281ed2a9-84f7-4fde-b6ac-501a4d86b3c3'::uuid,
  '76058d37-a7a9-47ff-a4da-22ffcd699ca8'::uuid,
  '9614edf0-e372-4fdd-9d3c-7885994ec152'::uuid,
  'b6072f46-a76b-4dc2-bc49-7e7f47d4b4f7'::uuid,
  '6f378a18-8b3e-43c1-a101-cf86b3f55857'::uuid,
  '88b6a21a-5317-4cf1-a2e7-c00149361558'::uuid,
  'b6b4ee7e-2f26-4ca4-b00f-803681d7f7fb'::uuid,
  '888984c3-0130-4644-8625-b11f6dbf28f1'::uuid,
  'f9dc6b0b-a3f7-4519-b417-f3cc7021f49f'::uuid
]);


-- ── 5. Opdatér 186 eksisterende stores ──
-- note + is_strikkecafe altid; website kun hvis nuværende er NULL/tom (Hannahs krav).
-- Bruger TEMP TABLE for klarhed og review.

update public.stores s set
  note = u.new_note,
  is_strikkecafe = u.new_cafe,
  website = case
    when nullif(trim(coalesce(s.website, '')), '') is null then u.new_website
    else s.website
  end
from (
  values
  ('0b8fec43-8470-4bae-96f3-1f3afaadb261'::uuid, 'Broderi-butik', false, 'https://ullafalk.dk'),
  ('18fb36ee-5175-49f8-a421-457bdd603594'::uuid, 'Garn/broderi', false, 'https://sommerfuglen.dk'),
  ('abf0847c-62f3-48f2-be2d-9733bc8241a9'::uuid, 'Dedikeret craft-café m. kaffe/te', true, 'https://samvaerkcph.com/strikkecafeen'),
  ('2b00e0bd-54b2-484d-a866-e5060bdad8f2'::uuid, 'Strikkecafé som event m. tilmelding', false, 'https://butikflid.dk'),
  ('2f66cdd4-2512-41f7-8d94-9049d2cec45f'::uuid, 'Showroom m. workshops', false, 'https://kitcouture.eu'),
  ('fbd6a5cd-8ef2-4c96-b3f4-52909edce572'::uuid, null, false, 'https://bruunstrik.com'),
  ('0c537c54-1611-4898-b5f2-d8f43d7a667d'::uuid, 'Strik Sammen-events; uklart om dedikeret område', false, 'https://tantegroencph.dk'),
  ('48f3b024-97d2-4bd8-bfec-869933e27c70'::uuid, 'Strikkecafé i butikken om vinteren', true, 'https://garnstuen.dk/strikkecafe'),
  ('861a4835-f010-49a9-a206-3d0e99d930e2'::uuid, 'Strikkeaften som event', false, 'https://ulden.dk'),
  ('1c411b37-12be-463a-89e8-3401b6565ce9'::uuid, 'Dedikeret strikkecafé m. kaffe og kage', true, 'https://woolstock.dk/pages/om-strikkecafeen'),
  ('66af61c0-00f8-47b8-90d4-a8aac416af40'::uuid, null, false, 'https://nicolinegarn.dk'),
  ('bd1a6a2d-5893-4b74-b01a-7423785834ce'::uuid, 'Lille garnbutik', false, 'https://garnkiosken.dk'),
  ('d8376863-c813-4cff-9819-39c8fdd4a8ce'::uuid, 'Aftencafé torsdage 19-21:30', true, 'https://lopapeysa.dk'),
  ('40b9c6a3-9b0e-4034-b0a6-81eebf47a795'::uuid, 'I Amagercentret', false, 'https://stitches.dk'),
  ('84d65c97-bac6-42db-a8cd-4e05fb02fcde'::uuid, 'Garn-café m. kaffe & kage, hyppige events', true, 'https://strikkerietkbh.dk'),
  ('c889ae7c-bec1-4baa-8084-d6dd83600a28'::uuid, 'Lille garnbutik', false, null),
  ('fdc6d7e4-9412-465d-b4b7-47d4f0b095d8'::uuid, 'Strikkecafé som aftenevent 18:30-21', true, 'https://lindbergstrik.dk'),
  ('3174db99-a593-4cb3-b5fe-c6b91c46d525'::uuid, 'Hyggelig butik m. kaffe og strik', true, 'https://amritstrik.dk'),
  ('e7dbfb52-5569-4a96-b901-698279a4288f'::uuid, 'Broderi/strik', false, 'https://glienkedesign.dk'),
  ('60f55caf-5f1b-4aaa-9dec-068507f2fd36'::uuid, 'Strik & Drik events, ikke fast café', false, 'https://taastrupbymidte.dk'),
  ('4c1e9f41-12d8-47ed-9235-da46056a140e'::uuid, 'Værksted m. kurser', false, 'https://kates.dk'),
  ('26cf57ee-f1e2-4521-81a6-a44c96a402f5'::uuid, 'Strikkecafé hver anden tirsdag som event', true, 'https://strikkestedet.dk'),
  ('e5a0a47d-f8e1-4aa1-9516-12bafc0f0db5'::uuid, 'Garncafé-events', false, 'https://cilustrik.dk'),
  ('19911c15-04a1-496b-818e-e2eade4845d9'::uuid, null, false, 'https://anitagarn.dk'),
  ('e1c9dc22-ec00-4dbb-8540-5d6f71bf71f3'::uuid, 'Regelmæssige events, ikke fast siddeområde', false, 'https://noerkleriet.dk'),
  ('0a4c6e81-d4c2-443d-878e-97389a3fe195'::uuid, 'Strikkecaféer holdes off-site', false, 'https://garngalore.dk'),
  ('9e0b8fa3-1c90-4df6-8ec3-6c67c0b424e3'::uuid, 'Strikkefe-hjælp i butikken', false, 'https://uldstedet.dk'),
  ('00790d0a-04dc-4ef5-82eb-4eee0d90430c'::uuid, 'Lidt info', false, 'https://bbc-taarnby.dk'),
  ('021a19ec-0685-49cc-9711-f494c2430781'::uuid, 'Kreativt strikkeværksted og mødested', true, 'https://customknit.dk'),
  ('5f7b016d-b153-4671-8126-104e62eab7e9'::uuid, 'Kaffe og kage hver torsdag i butikken', true, 'https://arendgarn.dk'),
  ('beae9c42-271a-4553-98af-2b677ff427f2'::uuid, 'Strikkecafé lørdage 10:30-13', true, 'https://horsholm-rungsted.dk'),
  ('99aed379-d89c-44b1-b5cd-b1bf52da03b4'::uuid, 'Garn + tilbehør, te, keramik', false, 'https://pausen.dk'),
  ('e17c194d-ae35-480e-97a3-da90a7353a58'::uuid, 'Webshop; besøg kun efter aftale', false, 'https://loveknit.dk'),
  ('5941c1df-5ac4-4a6b-8a19-3f5fbc44ca7f'::uuid, 'Kaffe/te, fast strikkecafé hver anden torsdag, plads til at sidde', true, 'https://nordgarn.dk'),
  ('3106df5e-b463-49d8-81a4-38a96ace418f'::uuid, 'Garncafé som event (sommer)', false, 'https://fruernes.dk'),
  ('146ce75c-b574-4751-a4a3-5adeb57df453'::uuid, 'Hobbybutik m. strik/hækle og hyggecafé', true, null),
  ('66555fd4-10c2-4ae4-974e-57497635454e'::uuid, 'Garn+stof+workshops', false, 'https://strikogsy.dk'),
  ('4cb69fd1-5c13-45dc-bd60-44106e8e4972'::uuid, 'Lille hyggelig café i butikken m. økologisk kaffe/te', true, 'https://uldgalleriet.dk/om-os'),
  ('14ff003f-edff-445f-8a93-ed5dc6b21a47'::uuid, 'Stof/symaskiner m. garn-afdeling', false, 'https://aj-stoffer.dk'),
  ('434021e5-c115-419b-8d4a-74cbf20e28b1'::uuid, 'Stof-/garnbutik', false, 'https://metervarer.info'),
  ('9188aa54-1795-4ef6-91ca-a7b4965ddd43'::uuid, 'Egen kaffebar/deli, langbord; strikkehygge tirs/fre + onsdag', true, 'https://garnvaerk.dk/strikkecafe-2'),
  ('47d23e33-eeed-4035-8ed8-52ffc7c5933a'::uuid, 'Strikkecafé i butikken', true, 'https://facebook/yarnicorn'),
  ('161ac8a1-6b47-4560-b14f-5c57d55785ab'::uuid, 'Plads til at sidde og strikke, kaffe; cafeer 2x/md.', true, 'https://bergastrik.dk/om-os'),
  ('2f2114b5-2610-4279-a50e-f203c06d6503'::uuid, 'Garn-/strikkecafé m. fællesskab, kaffe og hygge', true, 'https://virmo.dk'),
  ('b36465c9-8c63-48fd-be36-bbd071bd8836'::uuid, 'Kombineret garnbutik og café', true, 'https://mosterkenneth.dk'),
  ('47ce8fcf-2953-4176-b30c-73cd704aa466'::uuid, 'Workshops/håndarbejdscaféer som events', false, 'https://heniusknitwear.com'),
  ('c5ad02bb-2284-4e57-82d4-8f35694076d3'::uuid, 'Strikkecafé første onsdag i måneden', false, 'https://garnogglaede.dk'),
  ('ba4dd8a8-9ea0-425f-863b-e860043a8f11'::uuid, null, false, 'https://garnhoekeren.dk'),
  ('07867fa9-3b89-4216-b3b3-638349ad1fb6'::uuid, 'Strikkecafé hver onsdag aften i butikken', false, 'Forside - Louise Harden - Strik & Design'),
  ('ce553d4b-02c0-4282-bc95-be6591894c2d'::uuid, null, false, 'https://tante-andante.dk'),
  ('c7791468-2207-49b7-9df4-41a8b493594a'::uuid, 'Har strikkecafé som tilbud', true, 'https://spgarn.dk'),
  ('a6c7061d-4469-429b-b68a-40731c7be2fe'::uuid, null, false, 'https://genesis.dk'),
  ('d3eccc1a-f19b-4160-b6f5-2fa0b50d86ea'::uuid, 'Strikkecaféer i butikken', true, 'https://strikkenet.dk'),
  ('107971cf-ef92-448c-a531-445f6847bf34'::uuid, 'Duplikat af Strikkenet', true, 'https://strikkenet.dk'),
  ('2c70f01c-1720-475d-9766-4b90fd66b798'::uuid, 'Webshop (Just One More Row)', false, 'https://justonemorerow.dk'),
  ('72472a47-4e0b-4772-b212-55dcc74a63f5'::uuid, 'Sofa-område til nørklecafé m. kaffe', true, 'https://garnbixen.dk/products/norklecafe'),
  ('c4a2ded8-896b-45cc-b924-38165978af49'::uuid, 'Strikkestue i tilstødende lokaer', true, 'https://svinningegarn.dk'),
  ('95027a42-f3c3-42e1-8f1d-596972595af5'::uuid, null, false, 'https://droemmegarn.dk'),
  ('0d81f0b3-fce8-4959-836f-f3d50f32db03'::uuid, 'Sponsorerer strikkeklub men ikke i butik', false, 'https://voreskalundborg.dk'),
  ('f03434ca-14dc-4204-ac72-15a829160296'::uuid, 'Strikkeaften som event', false, 'https://facebook/tibi-garn'),
  ('45874346-6f12-41e8-b3ad-3e366415a674'::uuid, null, false, 'https://enghoffgarn.dk'),
  ('68379a09-4a2d-4216-be44-372c245aa454'::uuid, 'Lille udvalg af garn. Mest broderi', false, 'https://korssting.dk'),
  ('5ebdec26-2fb3-4191-b2a9-24c2dea89541'::uuid, null, false, 'https://garnhusetkoege.dk'),
  ('410f671d-dfe9-496e-ac5b-ccd340cf0b01'::uuid, 'Strikkecafé-aftener m. kaffe og kage', true, 'https://mamasgarn.dk/products/strikkecafe'),
  ('6fc3c5a1-e507-4b0d-9763-934eacc90aba'::uuid, 'Stof- og garnbutik', false, 'https://stofdepotet.dk'),
  ('bf26dff4-56a8-4e8f-93a5-fe8ce58777e2'::uuid, 'Ny butik (2025) efter Pernille Garn', false, 'https://nuetstrik.dk'),
  ('4bdcba3a-07c0-418a-8678-18c6e80d8ca8'::uuid, 'Gårdbutik m. begrænset åbning', false, 'https://knitbybuur.dk'),
  ('aafc3a84-537c-47e1-90b5-a47aded32573'::uuid, 'Strik og drik m. ekstern bar', false, 'https://facebook/syogstrik'),
  ('4533fe34-25b3-416b-93c2-d72ccf829478'::uuid, 'Tøj- og garnbutik', false, 'https://chapelina.dk'),
  ('eedee81b-4a61-404e-b602-1c8b69468799'::uuid, 'Strikkecafé m. kaffe/te/kage og hyggelige siddeområder', true, 'https://godborgsgarn.dk'),
  ('85090c1b-d8c5-4033-9cba-1b4cbefa6d40'::uuid, null, false, 'https://strikketanten.dk'),
  ('1676afe0-4007-4ae2-a9fb-c4c20f0c2805'::uuid, 'Systue og garnbutik', false, 'https://facebook/systuen-evigglad'),
  ('e9fa520d-0ba5-42b8-8423-3ed027fdbdd9'::uuid, 'Strikkecafé to gange om måneden', true, 'https://facebook/broderimagasinet'),
  ('22d7ce48-4710-4afe-8d28-035dc32d86d0'::uuid, 'Garn- og brodeributik', false, 'https://saxby.dk'),
  ('ef6aecb3-dad0-4e0e-80ac-41302b6aa57d'::uuid, 'Hyggelig strikkecafé', true, 'https://migogodense.dk'),
  ('1b513267-2b8d-4a2d-929f-793bd4498aaa'::uuid, null, false, 'https://facebook/butikmeter'),
  ('891bbea8-6efe-40c0-8981-fc2552e9277d'::uuid, 'Lingerie + garn', false, 'https://visitkerteminde.dk'),
  ('a799b754-2d56-42cb-ab1a-733fd9894b47'::uuid, null, false, 'https://strikke-garn.dk'),
  ('be6d15d5-6c24-44d1-870b-ddce2932be3f'::uuid, null, false, 'https://visitnordfyn.dk'),
  ('ce502857-52a9-4c9e-87af-38dd680a1da4'::uuid, 'Ren garnbutik m. kurser', false, 'https://knitsistersstudio.dk'),
  ('95d20468-a077-4540-8fb6-bf3ce9443977'::uuid, 'Café men keramik/perler-fokus', false, 'https://kreavaerk.dk'),
  ('cfc35fae-cb57-4496-a992-68a3487909f2'::uuid, 'Ugentlig strikkecafé hver torsdag kl. 11.15-13.30 + aftenarrangementer ', true, 'https://strikogstil.dk/arrangementer'),
  ('ef329707-6085-4943-b8c1-cfd6a7d3e162'::uuid, null, false, 'https://instagram/filora_garn'),
  ('e37d2acd-7f43-4474-97e1-032d897b8564'::uuid, null, false, 'https://stofmoellen.dk'),
  ('f4d12241-9872-4224-8485-91faa204bdc8'::uuid, 'Strikkekrog m. kaffe altid tilgængelig', true, 'https://butiklotte.dk/garn'),
  ('16b37beb-b3aa-46c3-824a-99736b2389e3'::uuid, 'Dedikeret café-side, månedlig café, hyggelig krog', true, 'https://ckcstrik.dk/cafe'),
  ('086f327a-6d71-46f9-a805-2fe3c6d79698'::uuid, null, false, 'https://garnoteket.dk'),
  ('c1ce7a76-9ba8-41f7-b40b-b0d1a2e93e7c'::uuid, null, false, 'https://facebook/gittegarnogbroderi'),
  ('fcc702c8-c6f7-410d-9a0d-cb80868ad13f'::uuid, 'Hyggelige strikkekroge, må sidde alle åbningstimer, kaffe/te', true, 'https://knittersdelight.dk'),
  ('162eb15a-2380-40a1-b124-65c7e14d3721'::uuid, null, false, 'https://facebook/fynskfiberflid'),
  ('d0fc5372-b9f3-4d99-8fe3-902b247a0e31'::uuid, 'Nørklecafé hver anden mandag + strikkemorgener', true, 'https://aeroepigen.dk'),
  ('2c71b808-8adb-4e0c-9589-ae7182a9e0f0'::uuid, null, false, 'https://facebook/fies-strik'),
  ('919a4089-4ab0-4b4f-a3ad-9bb6ae304fcb'::uuid, null, false, 'https://fabricroad.com'),
  ('79b4dda9-d690-4ce3-8888-9ce3d86048f1'::uuid, 'Strikkecafé i butikken m. kaffe, te og kage', true, 'https://lokalnytkolding.dk'),
  ('6f39dc71-46f5-4fb6-b6d9-49dc5949d650'::uuid, null, false, 'https://patchworkkaelderen.dk'),
  ('94d61606-8e31-48ca-9edf-f9778333dcbc'::uuid, '360 m² butik m. strikkecafé', true, 'https://visitsonderjylland.dk'),
  ('bc5759b0-0ccc-4f86-965f-4852e7f7c97c'::uuid, 'Strikkelounge og hyggetorsdage', true, 'https://garnogglasur.dk'),
  ('5a50da9e-a3b2-4a59-9011-949a605c7f64'::uuid, 'Garn- og brodeributik m. strikkecafé', true, 'https://gavstrikken.dk'),
  ('cf9f25f4-aa9c-4113-bd41-ba9dc03f5107'::uuid, 'Lille strikkecafé m. fokus på stemning', true, 'https://knithappens.dk'),
  ('c4fc9322-c3d0-48f5-a9b5-abc00d361cdd'::uuid, 'Garn- og brodeributik m. strikkecafé', true, 'https://gavstrikken.dk'),
  ('7d8d9311-bf94-48f2-8e87-61ab8a805eed'::uuid, 'Hyggelig café-krog m. kaffe og snak', true, 'https://yarneverywear.dk'),
  ('57deecfe-e38a-4447-86c5-b785b5f14d0a'::uuid, 'Sønderjyllands største garnbutik ', true, 'https://facebook/garnogtoej'),
  ('478c19d1-6360-4dca-ba42-5ffd8ffdf6f6'::uuid, 'Strikkegruppe man-tirs i butikken', true, 'https://garniverset.dk'),
  ('de3eee44-afd6-4ff9-8877-26534a61ffc6'::uuid, null, false, 'https://jettesgarn.dk'),
  ('20a6f46a-29cf-4da4-8aec-3c8f07cfe62b'::uuid, null, false, 'https://kreativgarn.dk'),
  ('da3f11c7-83c5-4bd8-89ca-aa6c79291604'::uuid, null, false, 'https://kunstladen.dk'),
  ('611778de-bb7c-42e1-a601-638c93a2a024'::uuid, null, false, 'https://ribesbroderioggarn.dk'),
  ('a49ea3f6-0343-47f1-b76e-3455ba45621b'::uuid, 'Strikke- og hæklecafé hver torsdag 15-17', true, 'https://cottonwear.dk'),
  ('aefdd65f-0c53-4c55-9fb7-df96b837f22e'::uuid, null, false, 'https://hobby-leg.dk'),
  ('07abd30e-668e-4584-9560-f61e5fffd821'::uuid, null, false, null),
  ('e8524cb4-3340-4123-9c81-79044429432f'::uuid, null, false, 'https://patchwork-oasen.dk'),
  ('6ab015cc-3840-4de0-bf8c-8ce6f7357008'::uuid, 'Hyggekrog til strikning og kaffe', true, 'https://meregarn.dk/pages/om-meregarn-dk'),
  ('e85c2cfe-8f4f-4146-8f89-b8696fcdc492'::uuid, 'Strikkecafé hver 2. torsdag', false, 'https://facebook/strikkeglad'),
  ('98bac915-7071-45db-8720-b694d26f6781'::uuid, 'Garnbutik og strikkecafé m. have ned til fjorden', true, 'https://fjordblinkhvidesande.dk'),
  ('b2bfd625-aa75-4033-aedb-7c9367c4d7cb'::uuid, 'Strikkecafé hos Stillestund Kaffebar', false, 'https://vegagarn.dk'),
  ('f864d7c5-ac11-4941-825b-8fd8a2392d6c'::uuid, null, false, null),
  ('18bc2ae6-54f6-4f43-80f9-438d13679c1d'::uuid, 'Månedlig strikkecafé i efteråret', false, 'https://garniskovhytten.dk'),
  ('f09c5ec3-6f19-49ce-8407-d3b3ff4faca7'::uuid, 'Showroom og strikkecafé', true, 'https://facebook/kraes-og-design'),
  ('12bfbcc6-e9d9-4f32-9150-3262ce7372c6'::uuid, 'Strik-kaffe i butikken', true, 'https://rosasbutik.dk'),
  ('6216e40a-19da-42e1-9f8a-512c30d3a542'::uuid, 'Strikkecafé hver anden tirsdag aften - event', false, 'https://atelier2.dk'),
  ('b623899e-4070-4fa0-9387-8f302089ce9e'::uuid, null, false, 'https://stofkarsten.dk'),
  ('784d6af7-13e1-4313-a44a-b3946d13d52f'::uuid, 'Tag dit projekt med - sæt dig og få kaffe', true, 'https://yarnloving.dk'),
  ('3950879e-5a1b-49d5-b303-82e3a115c278'::uuid, '200 m² garnbutik m. vejledning', false, 'https://vivisbutik.dk'),
  ('6ba56c40-7be5-4932-ae22-e538f872178c'::uuid, 'Tilbyder strikkehjælp | Holstebro Strikker Sammen-events + bookbare arrangementer', true, 'https://butikretogvrang.dk'),
  ('4fdceb31-bbf0-4f64-a814-40d69552dbc4'::uuid, null, false, 'https://facebook/kreadelux'),
  ('6179a9f0-13da-4f3c-9e17-9575cf098241'::uuid, 'Workshops, kurser, strikkecaféer og temadage', true, 'https://gerdagarn.dk'),
  ('5f924ed4-877f-4f3d-8cf9-d8701c7350c4'::uuid, 'Åben onsdage og 1. lørdag', false, null),
  ('e6f8367d-01aa-4973-879d-722b42d64b9d'::uuid, null, false, 'https://limfjordupdate.dk'),
  ('d4b95f55-9cbf-4d61-9110-b4c2c1b580ff'::uuid, 'Primært webshop', false, 'https://kreamok.dk'),
  ('2fca44e7-3af1-48da-aaa8-9a96caad5b72'::uuid, null, false, 'https://1000-ting.dk'),
  ('1c2d30ca-3444-45ce-be69-a0d75056b26d'::uuid, null, false, 'https://haandarbejdshuset.dk'),
  ('eff29c0a-3709-44e6-b27a-76da27ec1489'::uuid, 'Stort showroom', false, 'https://rito.dk'),
  ('2a1275f6-9609-49fd-8850-d000be837f5b'::uuid, null, false, null),
  ('1544983c-13dc-4eec-85d6-823901a6e8bd'::uuid, null, false, 'https://frubroundal.dk'),
  ('1096906e-c39a-4d92-b607-a1f7f73b57ba'::uuid, null, false, 'https://lottesnoerklerier.dk'),
  ('7b86064e-1987-437a-896e-aa5f99d9fc97'::uuid, null, false, 'https://citystoffer.dk'),
  ('ed31e4e0-75dc-4c2e-84e6-dd838d6695b6'::uuid, 'Strikkecafé som event hver 2. tirsdag', false, 'https://denlillegarnbiks.dk/collections/events'),
  ('a24770a6-0d8b-4a59-ba7f-b29b3b7811e2'::uuid, 'Generel hobbybutik', false, 'https://hoffmannhobby.dk'),
  ('fe0391fb-d747-46f8-a47f-3cc2aecb0272'::uuid, 'Strikkecafé onsdag i ulige uger', false, 'https://netgarn.dk/shop/689-strikkecafe'),
  ('f92946f6-2636-49a3-bc5f-549f4bac1294'::uuid, 'Dedikeret strikkecafé m. kaffe/te', true, 'https://strikkepindenogdenlillezebra.dk/strikkecafe'),
  ('6d402603-7573-46ae-ba8f-1f0a9122ec3f'::uuid, null, false, 'https://toenderingstrik.dk'),
  ('88b6a21a-5317-4cf1-a2e7-c00149361558'::uuid, 'Strikkecafé under Festugen', false, 'https://yarnfreak.dk'),
  ('0ce05840-6a0e-4d8e-9711-0d938f7619f4'::uuid, null, false, 'https://paulagarn.dk'),
  ('08704880-b0ac-4722-937a-8853f6613307'::uuid, 'Konceptet er at sidde m. strik og kaffe/te i butikken', true, 'https://genuina.dk'),
  ('b69dfeae-3cae-4b07-bf4b-beac0c41e1ee'::uuid, 'Åbent efter aftale. Primært webshop', false, 'https://instagram/kdp_knit_knot'),
  ('0322722b-0a62-46e8-9472-65c63d1ca88e'::uuid, 'Håndfarvet garn, primært webshop', false, 'https://sysleriget.com'),
  ('fd7e02db-b293-4b1b-9af7-1434101d6797'::uuid, 'Kun webshop. Ikke fysisk butik', false, null),
  ('b694cef7-3bdd-4423-91b7-81c43316c6e1'::uuid, null, false, 'https://vibsereden-shop.dk'),
  ('a211d25c-5675-4295-93bc-4f12e0287b35'::uuid, 'Hyggestrik-events, gårdmarkeder og strikkekurser', true, 'https://friggyarn.dk'),
  ('1fe322c2-2a7d-449b-9960-d92f7e06e40a'::uuid, null, false, 'https://littleyarn.dk'),
  ('3ac983d5-6b04-45c4-b6fd-aef31c1ac24a'::uuid, null, false, 'https://rondestof.dk'),
  ('51e2a414-5eea-4c6a-a1aa-8005bf84ce48'::uuid, 'Strikkehjørne m. kaffe i butikken', true, 'https://ofeig-ko.dk'),
  ('9a237e0a-d74c-4068-bf9c-bace6127af20'::uuid, 'Garncafé som tilkøb/event', false, 'https://maskefabrikken.dk'),
  ('b4ae577c-c1e9-4b86-af60-5891d14cff35'::uuid, 'Strikkecafé fredag i ulige uger - event', false, 'https://lillegade20.dk'),
  ('dfdc3743-24bb-4573-a278-743ea68a32a9'::uuid, 'Regelmæssige strikkecaféer kl. 19-21.30 + workshops ', true, 'https://garnvaerkstedet.dk'),
  ('0f8db263-7ce8-457d-8eeb-991d2eb61e38'::uuid, null, false, 'https://hoermann-hobby.dk'),
  ('94a34305-f229-4aef-8512-26b4d059b17a'::uuid, 'Strikkecafé som event', false, 'https://kjaerknit.dk'),
  ('c9386214-68c5-4e94-9df0-b6e1d6dfa505'::uuid, null, false, 'https://strikkenyheder.dk'),
  ('1065dc0b-d02c-4826-ba33-dec447e1cbdb'::uuid, null, false, 'https://facebook/pindno12'),
  ('b03950ba-9e67-4c40-a1b1-a75716a64df7'::uuid, '425 m² håndarbejdsmekka m.  strikkecafé', true, 'https://stofogsy.dk'),
  ('9597e7eb-8716-42df-9988-84c7f00923ae'::uuid, 'Strikkecafé hver 2. onsdag - event', false, 'https://garnlykke.dk/strikcafe'),
  ('6f181b10-9344-4229-9eb3-d50a80556d3b'::uuid, null, false, 'https://hobbycentret.dk'),
  ('1e359cd3-e6cf-45f6-b6d3-175d7bb16c62'::uuid, null, false, 'https://facebook/bestofhorsens'),
  ('9a4f7833-ef99-4f73-9ff4-23cb5ddc85c5'::uuid, null, false, 'https://facebook/dingarnbutik'),
  ('3b39c286-f2d4-43b2-853b-8401d92afb8b'::uuid, 'Strikkecafé hver 14. dag', true, 'https://kreakrog.dk'),
  ('aef451a2-fd89-4132-bbb8-350a9b40c712'::uuid, 'Sociale strikkecaféer', true, 'https://sikigarn.dk'),
  ('ec1b61b9-ecb6-48fd-866c-680f43a8c72a'::uuid, null, false, null),
  ('49cce984-b6d0-42f7-8e44-a55323c3d238'::uuid, null, false, 'https://stofstedetbjerringbro.dk'),
  ('11b34b16-1b51-4264-b12f-46a1d46d9612'::uuid, null, false, 'https://kreastudiet.dk'),
  ('44256591-6619-4e1c-82b6-49ccee2fecbd'::uuid, 'Strikkecafé to gange om måneden - event', false, 'https://uldfisken.dk/aktivitetskalender'),
  ('b5ce865f-9856-47c6-b4e1-bad516df3068'::uuid, 'Hyggeligt strikke-/hækle-rum m. kaffe/te/vand', true, 'https://garn22.dk'),
  ('db2211d3-c906-4639-a8e0-36de2e50a42c'::uuid, 'Danmarks første strikkecafé - dedikerede stationer', true, 'https://garncafe.dk'),
  ('8cf63e92-8a46-4362-b948-ad6c5d18d9bf'::uuid, 'Strikkecafé mandag i lige uger - event m. tilmelding', true, 'https://wibergstrik.dk/strikkecafe'),
  ('d249f1cf-23b2-432f-ae5d-912dd05d0a8a'::uuid, 'Strikkecafé hvor man frit kan komme og sætte sig i sofaen', true, 'https://fastermette.dk'),
  ('f10ef2eb-79b0-41bb-a49f-df7ddad7c290'::uuid, null, false, 'https://kreativitek.dk'),
  ('488b0252-fcff-4c66-b584-be41f4e2631d'::uuid, 'Café-hjørne m. kaffe-service', true, 'https://garnskab.dk'),
  ('1ad80d4e-5c10-461e-be8b-2acaf1de2230'::uuid, 'Velkommen ved bordet i hele åbningstiden m. kaffe', true, 'https://maskeriet-i-kaas.dk'),
  ('67310b06-02f6-4f12-a69b-fac2e1d8c693'::uuid, 'Strikkecafé én gang om ugen - event', true, 'https://garndamen.dk'),
  ('6dd9a528-eb33-4c21-82b5-12cea111014c'::uuid, 'Primært webshop, månedligt event', false, 'https://bettekun.dk'),
  ('8f95b9b5-0eb0-4c0f-99b0-8dd73c30fac0'::uuid, 'Åbent efter aftale', false, 'https://hedenshrgarn.dk'),
  ('6a3d93cd-4535-4131-a825-b7027034bd8a'::uuid, null, false, 'https://postgaarden.com'),
  ('af9b7081-1a72-453b-8ae7-52b099ca8e84'::uuid, 'Knit-and-drink en gang om måneden - event', true, 'https://thecornershop.dk'),
  ('4015e102-5b5f-4c6e-a586-d9ddf79213fd'::uuid, 'Strikkecafé hver torsdag sept-maj - event', false, 'https://retogvranghirtshals.dk'),
  ('3e9f5275-d078-4988-8312-a6d864aae277'::uuid, 'Lounge-møbler m. kaffe/te', true, 'https://livingbyvanja.dk'),
  ('7b68fa35-8b20-4093-94c6-3fb279f5fdf4'::uuid, 'Strikkecafé på biblioteket, ikke i butikken', false, 'https://strikkefeen.dk'),
  ('09251450-0df3-4be7-ab2d-42cc7329106e'::uuid, 'Hobby-/sycenter', false, 'https://facebook/aalbaek-sycenter')

) as u(store_id, new_note, new_cafe, new_website)
where s.id = u.store_id;


-- ── 6. Match 11 unmatched eksisterende rækker via (lower(name), postcode) ──
-- 5 har note=SLETTES (Stitchhouse 2300, Farmors Broderi 5700, Burslund-duplikat 8600,
-- Lille my strik og sy 3460, Patchworkhuset 2605 — sidstnævnte allerede slettet ovenfor)
-- 6 har konkrete opdateringer.

-- delete unmatched: Stitchhouse (2300)

delete from public.stores where lower(name) = lower('Stitchhouse') and postcode = '2300';

-- update unmatched: Unique Garn ApS (2770)

update public.stores set
  note = 'Strikkecafé som planlagte events',
  is_strikkecafe = false,
  website = case when nullif(trim(coalesce(website, '')), '') is null then 'https://uniquegarn.dk' else website end
where lower(name) = lower('Unique Garn ApS') and postcode = '2770';

-- update unmatched: Butik Kastanja (5320)

update public.stores set
  note = 'Stof/broderi-fokus',
  is_strikkecafe = false,
  website = case when nullif(trim(coalesce(website, '')), '') is null then 'https://instagram.com/butikkastanja' else website end
where lower(name) = lower('Butik Kastanja') and postcode = '5320';

-- update unmatched: ingridmarie (5580)

update public.stores set
  note = null,
  is_strikkecafe = false,
  website = case when nullif(trim(coalesce(website, '')), '') is null then 'https://ingridmarie.dk' else website end
where lower(name) = lower('ingridmarie') and postcode = '5580';

-- delete unmatched: Farmors Broderi (5700)

delete from public.stores where lower(name) = lower('Farmors Broderi') and postcode = '5700';

-- update unmatched: Fru Hyasinth (6100)

update public.stores set
  note = 'fruhyasinth.dk refererer Hedemarksvej 12, 6740 Bramming — by skal verificeres',
  is_strikkecafe = false,
  website = case when nullif(trim(coalesce(website, '')), '') is null then 'https://fruhyasinth.dk' else website end
where lower(name) = lower('Fru Hyasinth') and postcode = '6100';

-- delete unmatched: Unigarn (6900)

delete from public.stores where lower(name) = lower('Unigarn') and postcode = '6900';

-- update unmatched: Hobby Bien (8310)

update public.stores set
  note = 'Generel hobbybutik',
  is_strikkecafe = false,
  website = case when nullif(trim(coalesce(website, '')), '') is null then 'https://hobbybien.dk' else website end
where lower(name) = lower('Hobby Bien') and postcode = '8310';

-- update unmatched: Burslund - café, garn & Gaver (8600)

update public.stores set
  note = 'Strikkecafé i butikken',
  is_strikkecafe = true,
  website = case when nullif(trim(coalesce(website, '')), '') is null then 'https://burslundgarn.dk' else website end
where lower(name) = lower('Burslund - café, garn & Gaver') and postcode = '8600';

-- delete unmatched: Burslund café, garn & Gaver (8600)

delete from public.stores where lower(name) = lower('Burslund café, garn & Gaver') and postcode = '8600';

-- update unmatched: Bedstes Butik (9800)

update public.stores set
  note = 'Strikkecafé tirsdage og torsdage m. tilmelding - event',
  is_strikkecafe = true,
  website = case when nullif(trim(coalesce(website, '')), '') is null then 'https://bedstesbutik.dk' else website end
where lower(name) = lower('Bedstes Butik') and postcode = '9800';


-- ── 7. Flyt 6 webshops: slet fra stores (efter brand-propagation) ──
-- YarnStudio (4600): ikke i CSV-export — forsøger by-name+postnr-match
delete from public.stores where lower(name) = lower('YarnStudio') and postcode = '4600';
delete from public.stores where id = 'fd7e02db-b293-4b1b-9af7-1434101d6797'::uuid; -- Yarn Living Aps (8260)
delete from public.stores where id = 'd4b95f55-9cbf-4d61-9110-b4c2c1b580ff'::uuid; -- Kreamok (7752)
delete from public.stores where id = '0322722b-0a62-46e8-9472-65c63d1ca88e'::uuid; -- Sysleriget (8240)
delete from public.stores where id = '2c70f01c-1720-475d-9766-4b90fd66b798'::uuid; -- Delphi Trading ApS (4220)
-- Unigarn (6900): ikke i CSV-export — forsøger by-name+postnr-match
delete from public.stores where lower(name) = lower('Unigarn') and postcode = '6900';


-- ── 8. Indsæt ~36 nye fysiske butikker ──
-- Alle med approximate lat/lng (postnr-centrum). Hannah kan finjustere via Google Maps senere.

insert into public.stores (name, address, postcode, city, phone, website, is_strikkecafe, note, lat, lng) values
  ('The Fiddlery', 'Ryesgade 113', '2100', 'København Ø', null, 'https://thefiddlery.dk', true, 'Strikkelounge - dedikeret område i 1100 m² kreativt center', 55.7058, 12.579),
  ('Sart Strik', 'Amagerbrogade 18', '2300', 'København S', null, 'https://sartstrik.dk', true, 'Strikkecafé m. plads til 8, kaffe/te', 55.658, 12.601),
  ('Amager Strik', 'Terosevej 4, st.', '2770', 'Kastrup', null, 'https://amagerstrik.dk', false, 'Side hedder ''butikstrikkecafe'', ikke verificeret', 55.636, 12.6485),
  ('STRIKbart', 'Badstuevælen 2B', '2791', 'Dragør', null, 'https://strikbart.dk', false, null, 55.5933, 12.6735),
  ('Strikkeboden', 'Lyngby Torv 4', '2800', 'Kongens Lyngby', null, 'https://strikkeboden.dk', false, null, 55.7704, 12.5046),
  ('Gentofte Modestoffer', 'Gentoftegade 27C', '2820', 'Gentofte', null, 'https://gentoftemodestoffer.dk', false, null, 55.74, 12.55),
  ('Mormorfabrikken', 'Søborg Hovedgade 148', '2860', 'Søborg', null, 'https://mormorfabrikken.dk', true, 'Strikkecafé m. café-hygge, kage, kaffe og te', 55.7305, 12.5126),
  ('Van Hauen Design', 'Callisensvej 12, st.', '2900', 'Hellerup', null, 'https://hellerupstrandvej.dk', false, null, 55.7299, 12.5707),
  ('Bymarianne', 'Humlebæk Center 13', '3050', 'Humlebæk', null, null, true, 'Ugentlig garncafé, dedikeret område ikke verificeret', 55.965, 12.54),
  ('Smykkesten og Fritid', 'Nørregade 28A', '3300', 'Frederiksværk', null, 'https://stenogfritid.dk', false, null, 55.976, 12.022),
  ('Strikkeriet Bornholm', 'Store Torvegade 57', '3700', 'Rønne', null, 'https://strikkerietbornholm.dk', false, 'Inspirationsaftener', 55.095, 14.706),
  ('Ghitas Garn', 'Lindegårdsvej 6', '4070', 'Kirke Hyllinge', null, 'https://ghitasgarn.dk', true, 'Strikkecafé hvor man kan komme og strikke i butikken', 55.68, 11.9),
  ('Masker Med Mere', 'Storgade 18', '4180', 'Sorø', null, 'https://maskermedmere.dk', true, 'Kombineret garnbutik og café', 55.431, 11.556),
  ('Frk Sibbes Garn', 'Sibberupvej 25', '4230', 'Skælskør', null, 'https://frksibbes.dk', true, 'Åben strikkecafé lørdage i gårdbutikken', 55.254, 11.35),
  ('Knitgarden', 'Skullerupvej 18', '4330', 'Hvalsø', null, 'https://knitgarden.dk', false, 'Lejlighedsvis strikkecafé-events', 55.585, 11.865),
  ('Salkavalka', 'Algade 35 tv.', '4500', 'Nykøbing Sj', null, 'https://salkavalka.dk', false, null, 55.929, 11.665),
  ('JM-Shop', 'Jernbanegade 20A', '4690', 'Haslev', null, null, false, 'fysisk butik. Ikke webshop', 55.326, 11.965),
  ('Krea Deluxe (flagship)', 'Houmannsvej 4A', '4690', 'Haslev', null, 'https://kreadeluxe.com', false, 'Webshop.Showroom på udvalgte dage', 55.326, 11.965),
  ('Min Lille Strikkebutik', 'Bakkebøllevej 5, Nyråd', '4760', 'Vordingborg', null, 'https://minlillestrikkebutik.dk', false, null, 55.0083, 11.91),
  ('Bettygarn', 'Skolegade 8', '4800', 'Nykøbing F', null, 'https://bettygarn.dk', true, 'Hyggekrog m. kaffe; månedlig strikkecafé (NB: butik solgt 2025)', 54.77, 11.874),
  ('Garnnøglen', 'Havnegade 37 st', '4900', 'Nakskov', null, 'https://garnnoglen.dk', true, 'Samvær over en kop kaffe og de strikkeprojekter man lige har mellem fingrene. ', 54.833, 11.138),
  ('Hemsø Broderi', 'Vestre Landevej 13', '4930', 'Maribo', null, 'https://hemsoebroderi.dk', false, null, 54.777, 11.506),
  ('Tante Grøn (Odense)', 'Vestergade 7', '5000', 'Odense C', null, 'https://tantegroen.dk', false, 'Strikkecafé-events efter lukketid', 55.4038, 10.4024),
  ('Wonder Wool', 'Gravene 6', '5000', 'Odense C', null, 'https://wonderwool.dk', false, 'Strikkeevents, dedikeret område ikke verificeret', 55.4038, 10.4024),
  ('Bemipa', 'Rugårdsvej 220', '5210', 'Odense NV', null, 'https://bemipa.dk', false, null, 55.417, 10.355),
  ('Ulrikka Garn', 'Gerritsgade 2D', '5700', 'Svendborg', null, 'https://ulrikkagarn.dk', false, null, 55.059, 10.608),
  ('Little Village People', 'Østergade 66', '5900', 'Rudkøbing', null, 'https://littlevillagepeople.dk', false, null, 54.94, 10.71),
  ('Island Living', 'Torvet 11', '5970', 'Ærøskøbing', null, 'https://sologstrand.dk', true, 'Strikke/hækle-hygge events', 54.8865, 10.4145),
  ('Garn og Craft', 'Venøvænget 2', '6000', 'Kolding', null, 'https://garnogcraft.dk', true, 'Tag dit projekt med, kaffe/te, ingen tilmelding', 55.4904, 9.472),
  ('MARISTA Garn', 'Ådalen 3', '6800', 'Varde', null, 'https://marista.dk', false, null, 55.623, 8.483),
  ('Mikkla', 'Roustvej 119', '6818', 'Årre', null, 'https://mikkla.dk', false, null, 55.54, 8.75),
  ('Garniture Give', 'Torvet 2', '7323', 'Give', null, 'https://garnituregive.dk', true, 'Garn-Tilbehør-Strik-Butik-Events-Strikkecafe', 55.848, 9.238),
  ('Design Agger', 'Lodbjergvej 20', '7770', 'Vestervig', null, 'https://designagger.dk', true, 'Butik + lille café m. cappuccino', 56.77, 8.317),
  ('WeLoveWool', 'Tordenskjoldsgade 63', '8200', 'Aarhus N', null, 'https://welovewool.dk', false, 'Strikkesaloner/events, ikke dedikeret café', 56.182, 10.186),
  ('IdeGarn', 'Hjorterodsvej 14', '8500', 'Grenaa', null, 'https://idegarn.dk', false, null, 56.414, 10.883),
  ('Ønskegarn', 'Nygade 12', '8600', 'Silkeborg', null, 'https://onskegarn.dk', false, null, 56.169, 9.55),
  ('MADE by___', 'Ole Lund Kirkegaards Stræde 1, kld.', '8660', 'Skanderborg', null, 'https://madebyshop.dk', true, 'Du er velkommen til at slå dig ned + caféer', 56.039, 9.929),
  ('Knudegarn', 'Nørregade 21', '9480', 'Løkken', null, 'https://knudegarn.dk', true, 'Kælderlokale indrettet til strikkecafé/kurser', 57.368, 9.714),
  ('Garnværk Hadsund', 'Butikstorvet 27', '9560', 'Hadsund', null, 'https://garnvaerk.dk', true, 'Strikkecafé tirsdag morgen og fredag eftermiddag + kurser/workshops', 56.71, 10.13),
  ('Kronborg Uld', 'Søndergade 1', '9690', 'Fjerritslev', null, 'https://kronborguld.dk', false, null, 57.086, 9.264),
  ('Lamashop', 'Skallerupvej 700', '9800', 'Hjørring', null, 'https://lamashop.dk', false, 'Vejbod/familiebutik m. garn', 57.463, 9.992)

on conflict do nothing;
-- Bemærk: stores har ingen unique constraint på (name, postcode) — re-kørsel
-- vil INSERT'e duplikater hvis migrationen køres flere gange. Hannah skal
-- sikre at migrationen kun køres én gang i prod (eller vi tilføjer
-- unique-constraint i en separat migration først).

commit;
