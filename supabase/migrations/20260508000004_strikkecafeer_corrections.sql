-- Korrekturer fra Hannah's revideret Excel (8. maj 2026).
--
-- 11 specifikke ændringer:
--  - 2 sletninger: Rikke M (6100), Island Living (5970)
--  - 1 omdøbning: Englestof → Englestof & Garn (2970)
--  - 8 URL-rettelser (force-overwrite, dvs. uanset nuværende værdi)
--
-- Match via lower(name) + postcode for sikker identifikation.
-- Idempotent: gentaget kørsel no-op'er.

begin;

-- Slet: Rikke M (6100)
delete from public.stores where lower(name) = lower('Rikke M') and postcode = '6100';

-- Slet: Island Living (5970)
delete from public.stores where lower(name) = lower('Island Living') and postcode = '5970';

-- Omdøb: Englestof → Englestof & Garn (2970)
update public.stores set name = 'Englestof & Garn' where lower(name) = lower('Englestof') and postcode = '2970';

-- URL: Sart Strik (2300) → https://sartstrik.dk
update public.stores set website = 'https://sartstrik.dk' where lower(name) = lower('Sart Strik') and postcode = '2300';

-- URL: Woolstock (2100) → https://woolstock.dk
update public.stores set website = 'https://woolstock.dk' where lower(name) = lower('Woolstock') and postcode = '2100';

-- URL: Garnstuen (2100) → https://garnstuen.dk
update public.stores set website = 'https://garnstuen.dk' where lower(name) = lower('Garnstuen') and postcode = '2100';

-- URL: The Fiddlery (2100) → https://thefiddlery.dk
update public.stores set website = 'https://thefiddlery.dk' where lower(name) = lower('The Fiddlery') and postcode = '2100';

-- URL: Strik og Stil (5560) → https://strikogstil.dk
update public.stores set website = 'https://strikogstil.dk' where lower(name) = lower('Strik og Stil') and postcode = '5560';

-- URL: Samværk (1650) → https://samvaerkcph.com/
update public.stores set website = 'https://samvaerkcph.com/' where lower(name) = lower('Samværk') and postcode = '1650';

-- URL: Noget fra Hånden (3230) → tom
update public.stores set website = null where lower(name) = lower('Noget fra Hånden') and postcode = '3230';

-- URL: Martha (6000) → http://www.martha-garn.dk
update public.stores set website = 'http://www.martha-garn.dk' where lower(name) = lower('Martha') and postcode = '6000';

commit;
