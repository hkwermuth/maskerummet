# Prosabeskrivelser

Hver sektion starter med en overskrift i formatet:

    ## Producer | Navn | Serie

Hvor `Serie` er valgfri — udelad feltet helt hvis garnet ikke har en serie:

    ## Producer | Navn

Efter headeren kan du valgfrit angive metadata-linjer i formatet `nøgle: værdi, værdi, værdi`.
Metadata-blokken afsluttes af første tomme linje. Alt efter den tomme linje bliver
`yarns.description` i databasen (tomme linjer bevares som afsnit).

Understøttede metadata-nøgler:

- `velegnet til` → `use_cases` (fx: sommerbluser, babytøj, toppe, hækling)
- `certificeringer` → `certifications` (fx: GOTS, OEKO-TEX)
- `sæson` → `seasonal_suitability` (fx: forår, sommer)

Hvis en nøgle mangler fra en sektion, røres feltet ikke i DB. En nøgle med tom værdi
(`velegnet til:`) rydder arrayet.

Kør import med:

    npm run import:descriptions

Scriptet opdaterer kun rækker hvor (producer, name, series) matcher præcis. Ikke-matchende
sektioner rapporteres som advarsler.

---

## Filcolana | Tilia
velegnet til: sjaler, lette bluser, let overtøj

Tilia er et luksuriøst garn spundet af 70% kidmohair og 30% morbærsilke. Teknisk set er Tilia et tyndt, kamgarnsspundet og børstet garn. Mohair har mange af de gode egenskaber, vi kender fra uld: det er varmt, let og kan absorbere fugt, hvilket gør det behageligt at have på. Mohairfibrene er desuden blanke og en smule stærkere end almindelige uldfibre. Silke har igennem årtusinder været en af de mest eftertragtede tekstilfibre – den er blank, smuk, stærk og utrolig behagelig at have på.

Kombinationen af silke og en let sky af mohair giver et luftigt, blødt og elegant udtryk – og er noget af det mest luksuriøse garn, man kan ønske sig at strikke med, både alene og som følgetråd.

## Permin | Bella
velegnet til: sweatre, kjoler, sjaler, let overtøj

Bella fra Permin er et klassisk kidmohair-garn med 75% kidmohair, 20% uld og 5% polyamid. Kombinationen giver det karakteristiske langhårede, luftige udtryk – garnet er let og varmt, og bevarer sit lette og svævende præg selv i større projekter som store sweatre og kjoler.

Bella er et utrolig fleksibelt garn. Den anbefalede pind er 6 mm, men garnet kan strikkes på alt fra 3½ mm til 15 mm med 1-3 tråde Bella eller i kombination med andre tråde afhængigt af, hvor tæt eller luftigt du ønsker dit strik. Det giver masser af muligheder – fra tætte, bløde bluser til svævende, næsten gennemsigtige sjaler. Løbelængden er ca. 145 meter pr. 50 g, og ved anbefalet pind svarer strikkefastheden til ca. 14 masker x 22 pinde pr. 10 x 10 cm.

Bella håndvaskes ved maks. 30°C med et skånsomt uldvaskemiddel, der passer godt på de fine mohairfibre.

## BC Garn | Luxor | Mercerised Cotton
velegnet til: sommerbluser, babytøj, toppe, hækling

Luxor er et merceriseret bomuldsgarn i fingering-tykkelse (100% bomuld). Merceriseringen giver garnet en smuk glans, stærke og klare farver samt en meget tydelig maskedefinition. Bomulden stammer fra USA, mens garnet spindes og farves i Serbien. Farvestofferne er uden animalske ingredienser, så garnet kan betegnes som vegansk. Luxor kan maskinvaskes (op til 40 °C), men glansen kan aftage en smule over tid.

sæson: forår, sommer