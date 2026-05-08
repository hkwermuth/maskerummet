-- Ret stavefejl: Garnisionen → Garnisonen (3600 Frederikssund)
-- + opdater website til officiel Facebook-side.
--
-- Match via lower(name) + postcode for sikker identifikation.
-- Idempotent: gentaget kørsel no-op'er.

begin;

-- Stavefejl: Garnisionen → Garnisonen
update public.stores
  set name = 'Garnisonen'
  where lower(name) = lower('Garnisionen') and postcode = '3600';

-- URL: Garnisonen (3600) → Facebook
update public.stores
  set website = 'https://www.facebook.com/people/GARNisonen/100092432731989/'
  where lower(name) = lower('Garnisonen') and postcode = '3600';

commit;
