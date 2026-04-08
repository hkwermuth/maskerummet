-- Auto-genereret af scripts/import-descriptions.mjs
-- Indsæt i Supabase SQL Editor og kør.

begin;

-- Filcolana / Tilia
update yarns set
  description = 'Tilia er et luksuriøst garn spundet af 70% kidmohair og 30% morbærsilke. Teknisk set er Tilia et tyndt, kamgarnsspundet og børstet garn. Mohair har mange af de gode egenskaber, vi kender fra uld: det er varmt, let og kan absorbere fugt, hvilket gør det behageligt at have på. Mohairfibrene er desuden blanke og en smule stærkere end almindelige uldfibre. Silke har igennem årtusinder været en af de mest eftertragtede tekstilfibre – den er blank, smuk, stærk og utrolig behagelig at have på.

Kombinationen af silke og en let sky af mohair giver et luftigt, blødt og elegant udtryk – og er noget af det mest luksuriøse garn, man kan ønske sig at strikke med, både alene og som følgetråd.',
  use_cases = array['sjaler', 'lette bluser', 'let overtøj']::text[]
where producer = 'Filcolana' and name = 'Tilia' and series is null;

-- Permin / Bella
update yarns set
  description = 'Bella fra Permin er et klassisk kidmohair-garn med 75% kidmohair, 20% uld og 5% polyamid. Kombinationen giver det karakteristiske langhårede, luftige udtryk – garnet er let og varmt, og bevarer sit lette og svævende præg selv i større projekter som store sweatre og kjoler.

Bella er et utrolig fleksibelt garn. Den anbefalede pind er 6 mm, men garnet kan strikkes på alt fra 3½ mm til 15 mm afhængigt af, hvor tæt eller luftigt du ønsker dit strik. Det giver masser af muligheder – fra tætte, bløde bluser til svævende, næsten gennemsigtige sjaler. Løbelængden er ca. 145 meter pr. 50 g, og ved anbefalet pind svarer strikkefastheden til ca. 14 masker x 22 pinde pr. 10 x 10 cm.

Bella håndvaskes ved maks. 30°C med et skånsomt uldvaskemiddel, der passer godt på de fine mohairfibre.',
  use_cases = array['sweatre', 'kjoler', 'sjaler', 'let overtøj']::text[]
where producer = 'Permin' and name = 'Bella' and series is null;

-- BC Garn / Luxor / Mercerised Cotton
update yarns set
  description = 'Luxor er et merceriseret bomuldsgarn i fingering-tykkelse (100% bomuld). Merceriseringen giver garnet en smuk glans, stærke og klare farver samt en meget tydelig maskedefinition. hBomulden stammer fra USA, mens garnet spindes og farves i Serbien. Farvestofferne er uden animalske ingredienser, så garnet kan betegnes som vegansk. Luxor kan maskinvaskes (op til 40 °C), men glansen kan aftage en smule over tid.',
  use_cases = array['sommerbluser', 'babytøj', 'toppe', 'hækling']::text[]
where producer = 'BC Garn' and name = 'Luxor' and series = 'Mercerised Cotton';

commit;