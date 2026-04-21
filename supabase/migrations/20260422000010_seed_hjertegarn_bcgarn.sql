-- Seed: kobl butikker til Hjertegarn og BC Garn.
--
-- Hjertegarn: scrape af hjertegarn.dk/forhandlere2/ (145 forhandlere).
--   53 matchede mod vores stores-tabel via navn + postnummer.
-- BC Garn: scrape af bcgarn.com/where_to_buy.php (4 DK-forhandlere).
--   Kun 2 har fysisk tilstedeværelse i vores stores-tabel. Resten er
--   webshops der ligger i online_retailers.
--
-- Idempotent.

begin;

-- Hjertegarn
with hjertegarn_stores(store_id) as (values
  ('0322722b-0a62-46e8-9472-65c63d1ca88e'::uuid),
  ('0ce05840-6a0e-4d8e-9711-0d938f7619f4'::uuid),
  ('0d77ff47-a2c0-4d43-9a16-7e13f5664098'::uuid),
  ('0d81f0b3-fce8-4959-836f-f3d50f32db03'::uuid),
  ('1065dc0b-d02c-4826-ba33-dec447e1cbdb'::uuid),
  ('11b34b16-1b51-4264-b12f-46a1d46d9612'::uuid),
  ('161ac8a1-6b47-4560-b14f-5c57d55785ab'::uuid),
  ('19911c15-04a1-496b-818e-e2eade4845d9'::uuid),
  ('1ad80d4e-5c10-461e-be8b-2acaf1de2230'::uuid),
  ('1e359cd3-e6cf-45f6-b6d3-175d7bb16c62'::uuid),
  ('1fe322c2-2a7d-449b-9960-d92f7e06e40a'::uuid),
  ('20a6f46a-29cf-4da4-8aec-3c8f07cfe62b'::uuid),
  ('22d7ce48-4710-4afe-8d28-035dc32d86d0'::uuid),
  ('26cf57ee-f1e2-4521-81a6-a44c96a402f5'::uuid),
  ('2fca44e7-3af1-48da-aaa8-9a96caad5b72'::uuid),
  ('3b39c286-f2d4-43b2-853b-8401d92afb8b'::uuid),
  ('4015e102-5b5f-4c6e-a586-d9ddf79213fd'::uuid),
  ('40b9c6a3-9b0e-4034-b0a6-81eebf47a795'::uuid),
  ('42a30f00-911d-40e3-82a1-fb0aa43e4ac7'::uuid),
  ('45874346-6f12-41e8-b3ad-3e366415a674'::uuid),
  ('48f3b024-97d2-4bd8-bfec-869933e27c70'::uuid),
  ('49cce984-b6d0-42f7-8e44-a55323c3d238'::uuid),
  ('51e2a414-5eea-4c6a-a1aa-8005bf84ce48'::uuid),
  ('5ebdec26-2fb3-4191-b2a9-24c2dea89541'::uuid),
  ('611778de-bb7c-42e1-a601-638c93a2a024'::uuid),
  ('6179a9f0-13da-4f3c-9e17-9575cf098241'::uuid),
  ('66af61c0-00f8-47b8-90d4-a8aac416af40'::uuid),
  ('67310b06-02f6-4f12-a69b-fac2e1d8c693'::uuid),
  ('725c8ede-d8d1-4513-bb3e-31a1fe00032c'::uuid),
  ('7b68fa35-8b20-4093-94c6-3fb279f5fdf4'::uuid),
  ('7d8d9311-bf94-48f2-8e87-61ab8a805eed'::uuid),
  ('8cf63e92-8a46-4362-b948-ad6c5d18d9bf'::uuid),
  ('98bac915-7071-45db-8720-b694d26f6781'::uuid),
  ('99a2d582-a374-48ca-96cf-eda971beff8d'::uuid),
  ('99aed379-d89c-44b1-b5cd-b1bf52da03b4'::uuid),
  ('9a237e0a-d74c-4068-bf9c-bace6127af20'::uuid),
  ('a49ea3f6-0343-47f1-b76e-3455ba45621b'::uuid),
  ('a799b754-2d56-42cb-ab1a-733fd9894b47'::uuid),
  ('aafc3a84-537c-47e1-90b5-a47aded32573'::uuid),
  ('aefdd65f-0c53-4c55-9fb7-df96b837f22e'::uuid),
  ('b03950ba-9e67-4c40-a1b1-a75716a64df7'::uuid),
  ('b5ce865f-9856-47c6-b4e1-bad516df3068'::uuid),
  ('b694cef7-3bdd-4423-91b7-81c43316c6e1'::uuid),
  ('beae9c42-271a-4553-98af-2b677ff427f2'::uuid),
  ('bf26dff4-56a8-4e8f-93a5-fe8ce58777e2'::uuid),
  ('c1ce7a76-9ba8-41f7-b40b-b0d1a2e93e7c'::uuid),
  ('cbff7e29-6a8e-47d1-920f-c5ecc1c21682'::uuid),
  ('db2211d3-c906-4639-a8e0-36de2e50a42c'::uuid),
  ('e9fa520d-0ba5-42b8-8423-3ed027fdbdd9'::uuid),
  ('f10ef2eb-79b0-41bb-a49f-df7ddad7c290'::uuid),
  ('f4d12241-9872-4224-8485-91faa204bdc8'::uuid),
  ('fbd6a5cd-8ef2-4c96-b3f4-52909edce572'::uuid),
  ('fe0391fb-d747-46f8-a47f-3cc2aecb0272'::uuid)
)
insert into public.store_brands (store_id, brand_id)
select hs.store_id, b.id from hjertegarn_stores hs cross join brands b where b.slug = 'hjertegarn'
on conflict (store_id, brand_id) do nothing;

-- BC Garn
with bc_stores(store_id) as (values
  ('ed31e4e0-75dc-4c2e-84e6-dd838d6695b6'::uuid),
  ('eedee81b-4a61-404e-b602-1c8b69468799'::uuid)
)
insert into public.store_brands (store_id, brand_id)
select bs.store_id, b.id from bc_stores bs cross join brands b where b.slug = 'bc-garn'
on conflict (store_id, brand_id) do nothing;

commit;
