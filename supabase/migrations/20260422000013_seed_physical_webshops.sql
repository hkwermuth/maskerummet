-- Seed: opret online_retailers fra domain-crawl af 211 fysiske butikker.
--
-- Kandidater fundet via scripts/find-webshops.mjs (HTTP GET + webshop-signal-
-- detektion i HTML). Tre false positives er filtreret fra (begravelses-,
-- fest- og soul-wool-matches). 88 verificerede webshops.
--
-- For hver: upsert online_retailer, link stores, propagér brand-tags.
-- Hvis slug kolliderer med eksisterende online_retailer (fx gavstrikken)
-- ignoreres insert og stores linkes til eksisterende række.
--
-- Rydder også "garn-kompagniet" fra online_retailers — bruger-rapporteret
-- at det kun er en fysisk butik uden webshop.

begin;

-- Fjern garn-kompagniet (kun fysisk, ikke webshop)
delete from public.online_retailers where slug = 'garn-kompagniet';

-- Upsert webshop-kandidater
insert into public.online_retailers (slug, navn, url, land, leverer_til_dk, sidst_tjekket) values
  ('aeroepigen', 'Ærøpigen', 'https://aeroepigen.dk', 'DK', true, current_date),
  ('amrit-strik', 'Amrit Strik', 'https://www.amritstrik.dk', 'DK', true, current_date),
  ('arend-garn', 'Arend Garn', 'https://arendgarn.dk', 'DK', true, current_date),
  ('atelier2', 'Atelier2', 'https://atelier2.dk', 'DK', true, current_date),
  ('bettekun-garn', 'Bettekun Garn', 'https://bettekun.dk', 'DK', true, current_date),
  ('broderi-moderne', 'Broderi Moderne', 'https://broderi-moderne.dk', 'DK', true, current_date),
  ('butik-nille', 'Butik Nille', 'https://butiknille.dk', 'DK', true, current_date),
  ('cilu-strik', 'Cilu Strik', 'https://cilustrik.dk', 'DK', true, current_date),
  ('cotton-wear', 'Cotton Wear', 'https://cottonwear.dk', 'DK', true, current_date),
  ('customknit-aps', 'CustomKnit', 'https://customknit.dk', 'DK', true, current_date),
  ('den-lille-garnbiks', 'Den lille Garnbiks', 'https://www.denlillegarnbiks.dk', 'DK', true, current_date),
  ('dorthes-hobbystue', 'Dorthes Hobbystue', 'https://dorthes-hobby.dk', 'DK', true, current_date),
  ('enghoff-garn', 'Enghoff Garn', 'https://enghoffgarn.dk', 'DK', true, current_date),
  ('fabricroad', 'FabricRoad', 'https://fabricroad.com', 'DK', true, current_date),
  ('faster-mette', 'Faster Mette', 'https://fastermette.dk', 'DK', true, current_date),
  ('fox-og-jane', 'Fox og Jane', 'https://foxogjane.dk', 'DK', true, current_date),
  ('frigg-yarn', 'Frigg Yarn', 'https://www.friggyarn.dk', 'DK', true, current_date),
  ('fru-hyasinth', 'Fru Hyasinth', 'https://fruhyasinth.dk', 'DK', true, current_date),
  ('garn-glaede', 'Garn & Glæde', 'https://garnglaede.dk', 'DK', true, current_date),
  ('garn-galore', 'Garn Galore', 'https://garngalore.dk', 'DK', true, current_date),
  ('garn-i-skovhytten', 'Garn i Skovhytten', 'https://garniskovhytten.dk', 'DK', true, current_date),
  ('garn-og-glasur', 'Garn og Glasur', 'https://garnogglasur.dk', 'DK', true, current_date),
  ('garnbixen', 'Garnbixen', 'https://garnbixen.dk', 'DK', true, current_date),
  ('garncafe-madsine', 'Garncafé Madsine', 'https://garncafe.dk', 'DK', true, current_date),
  ('garniverset', 'Garniverset', 'https://garniverset.dk', 'DK', true, current_date),
  ('garnkiosken', 'Garnkiosken', 'https://garnkiosken.dk', 'DK', true, current_date),
  ('garnoteket', 'Garnoteket', 'https://garnoteket.dk', 'DK', true, current_date),
  ('gavstrikken', 'Gav''strikken', 'https://gavstrikken.dk', 'DK', true, current_date),
  ('genesis-sy-og-strik', 'Genesis Sy og Strik', 'https://genesis.dk', 'DK', true, current_date),
  ('gerda-garn', 'Gerda Garn', 'https://gerdagarn.dk', 'DK', true, current_date),
  ('godborgs-garn', 'Godborgs Garn', 'https://godborgsgarn.dk', 'DK', true, current_date),
  ('henius-knitwear', 'Henius Knitwear', 'https://heniusknitwear.com', 'DK', true, current_date),
  ('hobby-bien', 'Hobby Bien', 'https://hobbybien.dk', 'DK', true, current_date),
  ('hobbycentret', 'Hobbycentret', 'https://hobbycentret.dk', 'DK', true, current_date),
  ('hoffmann-hobby', 'Hoffmann Hobby', 'https://www.hoffmannhobby.dk', 'DK', true, current_date),
  ('ingridmarie', 'ingridmarie', 'https://ingridmarie.dk', 'DK', true, current_date),
  ('kjaerknit', 'Kjærknit', 'https://kjaerknit.dk', 'DK', true, current_date),
  ('kleopatras-naal', 'Kleopatras Nål', 'https://kleopatrasnaal.dk', 'DK', true, current_date),
  ('kniplestedet-aps', 'KnipleStedet', 'https://kniplestedet.dk', 'DK', true, current_date),
  ('knit-by-buur', 'Knit By Buur', 'https://knitbybuur.dk', 'DK', true, current_date),
  ('knit-sisters-studio', 'Knit Sisters Studio', 'https://knitsistersstudio.dk', 'DK', true, current_date),
  ('knitters-delight', 'Knitter''s Delight', 'https://knittersdelight.dk', 'DK', true, current_date),
  ('kraes-og-design', 'Kræs og Design', 'https://kraesogdesign.dk', 'DK', true, current_date),
  ('kreakrog', 'Kreakrog', 'https://kreakrog.dk', 'DK', true, current_date),
  ('kreastudiet', 'Kreastudiet', 'https://kreastudiet.dk', 'DK', true, current_date),
  ('kreativgarn', 'Kreativgarn', 'https://kreativgarn.dk', 'DK', true, current_date),
  ('krestoffer', 'KreStoffer', 'https://krestoffer.dk', 'DK', true, current_date),
  ('lindberg-strik', 'Lindberg Strik', 'https://www.lindbergstrik.dk', 'DK', true, current_date),
  ('lopapeysa', 'Lopapeysa', 'https://lopapeysa.dk', 'DK', true, current_date),
  ('loveknit', 'Loveknit', 'https://loveknit.dk', 'DK', true, current_date),
  ('mamas-garn', 'Mamas Garn', 'https://mamasgarn.dk', 'DK', true, current_date),
  ('meregarn-aps', 'Meregarn', 'https://meregarn.dk', 'DK', true, current_date),
  ('metervarer', 'Metervarer', 'https://metervarer.dk', 'DK', true, current_date),
  ('nordgarn', 'Nordgarn', 'https://nordgarn.dk', 'DK', true, current_date),
  ('noerkleriet-aps', 'Nørkleriet', 'https://www.noerkleriet.dk', 'DK', true, current_date),
  ('nuet-strik', 'Nuet Strik', 'https://nuetstrik.dk', 'DK', true, current_date),
  ('ofeig-ko', 'Ofeig & Ko', 'https://www.ofeig-ko.dk', 'DK', true, current_date),
  ('olgas-uld', 'Olgas Uld', 'https://olgasuld.dk', 'DK', true, current_date),
  ('patchwork-stalden', 'Patchwork Stalden', 'https://patchworkstalden.dk', 'DK', true, current_date),
  ('patchwork-oasen', 'Patchwork-Oasen', 'https://patchwork-oasen.dk', 'DK', true, current_date),
  ('paula-garn', 'Paula Garn', 'https://paulagarn.dk', 'DK', true, current_date),
  ('rila-stof-og-design', 'Rila Stof og Design', 'https://rila.dk', 'DK', true, current_date),
  ('rosas-butik', 'Rosa''s Butik', 'https://www.rosasbutik.dk', 'DK', true, current_date),
  ('si-ki-garn', 'Si-Ki Garn', 'https://sikigarn.dk', 'DK', true, current_date),
  ('stofmoellen-aps', 'Stofmøllen', 'https://stofmoellen.dk', 'DK', true, current_date),
  ('stofstedet', 'Stofstedet', 'https://stofstedet.dk', 'DK', true, current_date),
  ('strik-design', 'Strik & Design', 'https://strik-design.dk', 'DK', true, current_date),
  ('strik-og-stil', 'Strik og Stil', 'https://strikogstil.dk', 'DK', true, current_date),
  ('strikkefeen', 'Strikkefeen', 'https://strikkefeen.dk', 'DK', true, current_date),
  ('strikkeglad-altid-glad', 'Strikkeglad Altid Glad', 'https://strikkeglad.dk', 'DK', true, current_date),
  ('strikkenyheder', 'Strikkenyheder', 'https://strikkenyheder.dk', 'DK', true, current_date),
  ('strikkeriet-kbh', 'Strikkeriet KBH', 'https://www.strikkeriet.dk', 'DK', true, current_date),
  ('sysleriget', 'Sysleriget', 'https://sysleriget.dk', 'DK', true, current_date),
  ('tante-andante', 'Tante Andante', 'https://tante-andante.dk', 'DK', true, current_date),
  ('tante-groen-cph', 'Tante Grøn CPH', 'https://tantegroencph.dk', 'DK', true, current_date),
  ('tekstilmagi', 'Tekstilmagi', 'https://tekstilmagi.dk', 'DK', true, current_date),
  ('toendering-strik', 'Tøndering Strik', 'https://toenderingstrik.dk', 'DK', true, current_date),
  ('ulden', 'Ulden', 'https://ulden.dk', 'DK', true, current_date),
  ('uldstedet', 'Uldstedet', 'https://uldstedet.dk', 'DK', true, current_date),
  ('ulla-falk', 'Ulla Falk', 'https://ullafalk.dk', 'DK', true, current_date),
  ('vega-garn', 'Vega Garn', 'https://vegagarn.dk', 'DK', true, current_date),
  ('vibsereden', 'Vibsereden', 'https://vibsereden-shop.dk', 'DK', true, current_date),
  ('vivis-butik', 'Vivi''s Butik', 'https://vivisbutik.dk', 'DK', true, current_date),
  ('yarn-every-wear', 'Yarn Every Wear', 'https://yarneverywear.dk', 'DK', true, current_date),
  ('yarnfreak', 'Yarnfreak', 'https://yarnfreak.dk', 'DK', true, current_date),
  ('yarnloving', 'Yarnloving', 'https://yarnloving.dk', 'DK', true, current_date)
on conflict (slug) do nothing;

-- Link stores til online_retailers (exact navn-match)
-- Først via eksakt match af online_retailers.navn = stores.name eller stores.name like "navn%"
update public.stores s
set online_retailer_id = orl.id
from public.online_retailers orl
where s.online_retailer_id is null
  and (lower(s.name) = lower(orl.navn)
       or lower(s.name) = lower(orl.navn) || ' aps'
       or lower(s.name) = lower(orl.navn) || ' i/s'
  );

-- Specifikke mappings for navne der ikke matcher direkte
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'aeroepigen') where id = 'd0fc5372-b9f3-4d99-8fe3-902b247a0e31' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'amrit-strik') where id = '3174db99-a593-4cb3-b5fe-c6b91c46d525' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'arend-garn') where id = '5f7b016d-b153-4671-8126-104e62eab7e9' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'atelier2') where id = '6216e40a-19da-42e1-9f8a-512c30d3a542' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'bettekun-garn') where id = '6dd9a528-eb33-4c21-82b5-12cea111014c' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'broderi-moderne') where id = '9614edf0-e372-4fdd-9d3c-7885994ec152' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'butik-nille') where id = '891bbea8-6efe-40c0-8981-fc2552e9277d' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'cilu-strik') where id = 'e5a0a47d-f8e1-4aa1-9516-12bafc0f0db5' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'cotton-wear') where id = 'a49ea3f6-0343-47f1-b76e-3455ba45621b' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'customknit-aps') where id = '021a19ec-0685-49cc-9711-f494c2430781' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'den-lille-garnbiks') where id = 'ed31e4e0-75dc-4c2e-84e6-dd838d6695b6' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'dorthes-hobbystue') where id = 'a3769493-8e80-4091-9de3-2f3b3647e9d3' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'enghoff-garn') where id = '45874346-6f12-41e8-b3ad-3e366415a674' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'fabricroad') where id = '919a4089-4ab0-4b4f-a3ad-9bb6ae304fcb' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'faster-mette') where id = 'd249f1cf-23b2-432f-ae5d-912dd05d0a8a' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'fox-og-jane') where id = '60f55caf-5f1b-4aaa-9dec-068507f2fd36' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'frigg-yarn') where id = 'a211d25c-5675-4295-93bc-4f12e0287b35' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'fru-hyasinth') where id = 'a7f5996c-dc55-4e43-ad3a-2c472a24a24e' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garn-glaede') where id = 'c5ad02bb-2284-4e57-82d4-8f35694076d3' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garn-galore') where id = '0a4c6e81-d4c2-443d-878e-97389a3fe195' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garn-i-skovhytten') where id = '18bc2ae6-54f6-4f43-80f9-438d13679c1d' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garn-og-glasur') where id = 'bc5759b0-0ccc-4f86-965f-4852e7f7c97c' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garnbixen') where id = '72472a47-4e0b-4772-b212-55dcc74a63f5' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garncafe-madsine') where id = 'db2211d3-c906-4639-a8e0-36de2e50a42c' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garniverset') where id = '478c19d1-6360-4dca-ba42-5ffd8ffdf6f6' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garnkiosken') where id = 'bd1a6a2d-5893-4b74-b01a-7423785834ce' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'garnoteket') where id = '086f327a-6d71-46f9-a805-2fe3c6d79698' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'gavstrikken') where id = 'c4fc9322-c3d0-48f5-a9b5-abc00d361cdd' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'gavstrikken') where id = '5a50da9e-a3b2-4a59-9011-949a605c7f64' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'genesis-sy-og-strik') where id = 'a6c7061d-4469-429b-b68a-40731c7be2fe' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'gerda-garn') where id = '6179a9f0-13da-4f3c-9e17-9575cf098241' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'godborgs-garn') where id = 'eedee81b-4a61-404e-b602-1c8b69468799' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'henius-knitwear') where id = '47ce8fcf-2953-4176-b30c-73cd704aa466' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'hobby-bien') where id = '42a30f00-911d-40e3-82a1-fb0aa43e4ac7' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'hobbycentret') where id = '6f181b10-9344-4229-9eb3-d50a80556d3b' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'hoffmann-hobby') where id = 'a24770a6-0d8b-4a59-ba7f-b29b3b7811e2' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'ingridmarie') where id = 'ebb7be71-a8cc-43a0-a930-e7cf06bb87b3' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'kjaerknit') where id = '94a34305-f229-4aef-8512-26b4d059b17a' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'kleopatras-naal') where id = 'f9dc6b0b-a3f7-4519-b417-f3cc7021f49f' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'kniplestedet-aps') where id = '3be6131f-147e-4f40-a62f-ccecc0495d35' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'knit-by-buur') where id = '4bdcba3a-07c0-418a-8678-18c6e80d8ca8' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'knit-sisters-studio') where id = 'ce502857-52a9-4c9e-87af-38dd680a1da4' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'knitters-delight') where id = 'fcc702c8-c6f7-410d-9a0d-cb80868ad13f' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'kraes-og-design') where id = 'f09c5ec3-6f19-49ce-8407-d3b3ff4faca7' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'kreakrog') where id = '3b39c286-f2d4-43b2-853b-8401d92afb8b' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'kreastudiet') where id = '11b34b16-1b51-4264-b12f-46a1d46d9612' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'kreativgarn') where id = '20a6f46a-29cf-4da4-8aec-3c8f07cfe62b' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'krestoffer') where id = 'ef6aecb3-dad0-4e0e-80ac-41302b6aa57d' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'lindberg-strik') where id = 'fdc6d7e4-9412-465d-b4b7-47d4f0b095d8' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'lopapeysa') where id = 'd8376863-c813-4cff-9819-39c8fdd4a8ce' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'loveknit') where id = 'e17c194d-ae35-480e-97a3-da90a7353a58' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'mamas-garn') where id = '410f671d-dfe9-496e-ac5b-ccd340cf0b01' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'meregarn-aps') where id = '6ab015cc-3840-4de0-bf8c-8ce6f7357008' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'metervarer') where id = '434021e5-c115-419b-8d4a-74cbf20e28b1' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'nordgarn') where id = '5941c1df-5ac4-4a6b-8a19-3f5fbc44ca7f' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'noerkleriet-aps') where id = 'e1c9dc22-ec00-4dbb-8540-5d6f71bf71f3' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'nuet-strik') where id = 'bf26dff4-56a8-4e8f-93a5-fe8ce58777e2' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'ofeig-ko') where id = '51e2a414-5eea-4c6a-a1aa-8005bf84ce48' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'olgas-uld') where id = '93ebd0a4-51d0-42d8-bc74-5a0e545cd251' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'patchwork-stalden') where id = '05cc7965-fce5-434d-bd0f-1f7032108265' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'patchwork-oasen') where id = 'e8524cb4-3340-4123-9c81-79044429432f' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'paula-garn') where id = '0ce05840-6a0e-4d8e-9711-0d938f7619f4' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'rila-stof-og-design') where id = '228dec29-24e1-4454-ad20-f149f3198cf1' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'rosas-butik') where id = '12bfbcc6-e9d9-4f32-9150-3262ce7372c6' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'si-ki-garn') where id = 'aef451a2-fd89-4132-bbb8-350a9b40c712' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'stofmoellen-aps') where id = 'e37d2acd-7f43-4474-97e1-032d897b8564' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'stofstedet') where id = '49cce984-b6d0-42f7-8e44-a55323c3d238' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'strik-design') where id = '07867fa9-3b89-4216-b3b3-638349ad1fb6' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'strik-og-stil') where id = 'cfc35fae-cb57-4496-a992-68a3487909f2' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'strikkefeen') where id = '7b68fa35-8b20-4093-94c6-3fb279f5fdf4' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'strikkeglad-altid-glad') where id = 'e85c2cfe-8f4f-4146-8f89-b8696fcdc492' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'strikkenyheder') where id = 'c9386214-68c5-4e94-9df0-b6e1d6dfa505' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'strikkeriet-kbh') where id = '84d65c97-bac6-42db-a8cd-4e05fb02fcde' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'sysleriget') where id = '0322722b-0a62-46e8-9472-65c63d1ca88e' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'tante-andante') where id = 'ce553d4b-02c0-4282-bc95-be6591894c2d' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'tante-groen-cph') where id = '0c537c54-1611-4898-b5f2-d8f43d7a667d' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'tekstilmagi') where id = '2ba8ea39-cf5a-4977-a3f0-e7b6b015d182' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'toendering-strik') where id = '6d402603-7573-46ae-ba8f-1f0a9122ec3f' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'ulden') where id = '861a4835-f010-49a9-a206-3d0e99d930e2' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'uldstedet') where id = '9e0b8fa3-1c90-4df6-8ec3-6c67c0b424e3' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'ulla-falk') where id = '0b8fec43-8470-4bae-96f3-1f3afaadb261' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'vega-garn') where id = 'b2bfd625-aa75-4033-aedb-7c9367c4d7cb' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'vibsereden') where id = 'b694cef7-3bdd-4423-91b7-81c43316c6e1' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'vivis-butik') where id = '3950879e-5a1b-49d5-b303-82e3a115c278' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'yarn-every-wear') where id = '7d8d9311-bf94-48f2-8e87-61ab8a805eed' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'yarnfreak') where id = '88b6a21a-5317-4cf1-a2e7-c00149361558' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'yarnfreak') where id = '84586a3d-94f0-48be-a27f-c29e00f7254f' and online_retailer_id is null;
update public.stores set online_retailer_id = (select id from public.online_retailers where slug = 'yarnloving') where id = '784d6af7-13e1-4313-a44a-b3946d13d52f' and online_retailer_id is null;

-- Propagér brand-tags fra store_brands til retailer_brands
insert into public.retailer_brands (retailer_id, brand_id)
select distinct s.online_retailer_id, sb.brand_id
from public.stores s
join public.store_brands sb on sb.store_id = s.id
where s.online_retailer_id is not null
on conflict (retailer_id, brand_id) do nothing;

commit;
