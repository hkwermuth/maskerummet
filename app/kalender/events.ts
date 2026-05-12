// Kalender-data ekstraheret fra page.tsx så forsiden også kan importere den.
// Ren data — ingen React-afhængigheder.

export const FARVE: Record<string, string> = {
  Festival:       '#61846D',
  Workshop:       '#61846D',
  Liveshow:       '#9B6272',
  Retreat:        '#D9BFC3',
  Internationalt: '#A8C8D8',
}

export type Event = {
  maaned: string
  dato: string
  ugedag: string
  titel: string
  sted: string
  type: string
  farve: string
  beskrivelse: string
  url: string
  billetter: string
  ikon: string
}

export const EVENTS: Event[] = [

  // ── MAJ ──
  {
    maaned: 'Maj 2026',
    dato: '8.–10. maj', ugedag: 'Fre',
    titel: 'Seyfarth Knitting Retreat',
    sted: 'Fanø Krogård · Fanø',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: 'Eksklusivt Fair Isle-retreat med Christel Seyfarth. 6-retters middag, modeopvisning og øtur.',
    url: 'https://www.christel-seyfarth.com/product-page/seyfarth-knitting-retreat-fan%C3%B8-limited-edition',
    billetter: 'Billetter', ikon: 'garn',
  },
  {
    maaned: 'Maj 2026',
    dato: '9.–10. maj', ugedag: 'Lør',
    titel: 'Saltum Ulddage',
    sted: 'Saltum · Nordjylland',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'Garnstande, workshops og foredrag i Saltum. Lokal hyggefestival.',
    url: 'https://www.saltumfestdage.dk/',
    billetter: 'Billetter', ikon: 'faar',
  },
  {
    maaned: 'Maj 2026',
    dato: '30.–31. maj', ugedag: 'Lør',
    titel: 'Garnstafet Aarhus',
    sted: '7 garnbutikker · Aarhus',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'Stafet rundt mellem 7 garnbutikker i Aarhus med konkurrencer, smagsprøver og fællesskab.',
    url: 'https://garnoteket.dk/products/aarhus-garnstafet',
    billetter: 'Billetter', ikon: 'garn',
  },

  // ── JUNI ──
  {
    maaned: 'Juni 2026',
    dato: '5.–7. juni', ugedag: 'Fre',
    titel: 'Iceland Knit Fest',
    sted: 'Blönduós · Island',
    type: 'Internationalt', farve: FARVE.Internationalt,
    beskrivelse: 'Prjónagleði — Islands årlige strikkefestival. Workshops, foredrag og masser af islandsk uld.',
    url: 'https://www.textilmidstod.is/en/store/about-the-iceland-knit-fest',
    billetter: 'Billetter', ikon: 'globus',
  },
  {
    maaned: 'Juni 2026',
    dato: '12.–14. juni', ugedag: 'Fre',
    titel: 'Garn uden Grænser – Sønderborg',
    sted: 'Kaserne · Sønderborg',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'Sønderjyllands store strikkefestival på den gamle kaserne. Tyvstart fredag, hovedfestival lørdag–søndag.',
    url: 'https://www.garnudengraenser.dk/',
    billetter: 'Billetter', ikon: 'garn',
  },
  {
    maaned: 'Juni 2026',
    dato: '13. juni', ugedag: 'Lør',
    titel: 'Strik på Kajen',
    sted: 'Nordatlantens Brygge · Christianshavn, København',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'Udendørs strikkecafé på kajen i Christianshavn. Del af WWKIP. Gratis adgang.',
    url: 'https://www.nordatlantens.dk/da/arrangementer/2026/strik-p%C3%A5-kajen-world-wide-knit-in-public-day/',
    billetter: 'Gratis', ikon: 'bolge',
  },
  {
    maaned: 'Juni 2026',
    dato: '13. juni', ugedag: 'Lør',
    titel: 'Strik i Det Fri – Nibe',
    sted: 'Nibe Midtby · Nordjylland',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'WWKIP-fest med tema "Ta\' vest på". Strikkestafet, strikkecafé, hyggetelte på torvet, restestrik og levende musik fra strikkebandet "De vrangvillige".',
    url: 'https://www.facebook.com/profile.php?id=61566390874362',
    billetter: 'Gratis', ikon: 'faar',
  },
  {
    maaned: 'Juni 2026',
    dato: '13. juni', ugedag: 'Lør',
    titel: 'International Strikkedag (WWKIP)',
    sted: 'Verden over · lokale events i hele Danmark',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'World Wide Knit in Public Day — strikkere mødes lokalt verden over. Tjek din lokale garnbutiks website, Facebook eller Instagram side for mere information.',
    url: 'https://en.wikipedia.org/wiki/World_Wide_Knit_in_Public_Day',
    billetter: 'Gratis', ikon: 'globus',
  },
  {
    maaned: 'Juni 2026',
    dato: '26.–28. juni', ugedag: 'Fre',
    titel: 'Yoga retreat på Samsø',
    sted: 'Samsø',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: 'Wessel Yogas retreat på Samsø — yoga, hav og tid til strik i haven. Strand inden for gåafstand.',
    url: 'https://wesselyoga.dk/shop/yoga-retreat-paa-samsoe-26-28-juni-2026/',
    billetter: 'Billetter', ikon: 'hus',
  },

  // ── JULI ──
  {
    maaned: 'Juli 2026',
    dato: '1.–5. juli', ugedag: 'Ons',
    titel: 'Nordisk Strikkesymposium',
    sted: 'Oslo · Norge',
    type: 'Internationalt', farve: FARVE.Internationalt,
    beskrivelse: 'Stort nordisk strikkesymposium — workshops, foredrag og udstillinger over fem dage.',
    url: 'https://www.nordiskstrikkesymposium.no/',
    billetter: 'Billetter', ikon: 'globus',
  },

  // ── AUGUST ──
  {
    maaned: 'August 2026',
    dato: '15.–16. august', ugedag: 'Lør',
    titel: 'FiberFolk Roskilde',
    sted: 'Musicon · Roskilde',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'Fiber- og strikfest på Musicon. Lokale producenter, designere og masser af garn.',
    url: 'https://www.fiberfolk.dk/',
    billetter: 'Billetter', ikon: 'faar',
  },
  {
    maaned: 'August 2026',
    dato: '28.–30. august', ugedag: 'Fre',
    titel: 'Strik & Yoga – Isager',
    sted: 'Tversted · Bindslev',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: 'Strik med Annette Danielsen og yoga med Ilse Gaardahl. Inkl. undervisning, garn og måltider.',
    url: 'https://isagerstrik.dk/vare/strik-yoga-2026/',
    billetter: 'Billetter', ikon: 'hus',
  },
  {
    maaned: 'August 2026',
    dato: '31. aug.–7. sept.', ugedag: 'Man',
    titel: 'Strikkerejse til Italien',
    sted: 'Pigna, Liguria · Italien',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: 'En uge i den middelalderlige bjergby Pigna med Pust Rejser. Workshops, udflugter og lokale middage.',
    url: 'https://pustrejser.dk/products/strikkerejse-til-italien-september-2026',
    billetter: 'Billetter', ikon: 'globus',
  },

  // ── SEPTEMBER ──
  {
    maaned: 'September 2026',
    dato: '10.–13. september', ugedag: 'Tor',
    titel: 'Fanø Strik Festival',
    sted: 'Fanø · hele øen',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: '7. udgave med 2.000+ strikkere. Workshops, sejltur på M/S Ertholm, naturvandring og vinaftener. Adgang fra 60 kr.',
    url: 'https://www.fanoestrik.dk/',
    billetter: 'Billetter', ikon: 'bolge',
  },
  {
    maaned: 'September 2026',
    dato: '11.–13. september', ugedag: 'Fre',
    titel: 'Pakhusstrik',
    sted: 'Nordatlantens Brygge · Christianshavn, København',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'Nordatlantisk strikkefestival på Christianshavn. Workshops, foredrag, garnmarked.',
    url: 'https://www.nordatlantens.dk/da/arrangementer/2026/pakhusstrik-2026-nordatlantisk-strikkefestival/',
    billetter: 'Billetter', ikon: 'fyrtar',
  },
  {
    maaned: 'September 2026',
    dato: '18.–20. september', ugedag: 'Fre',
    titel: 'Strik Bornholm',
    sted: 'BIK · Allinge, Bornholm',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: '7. udgave af Bornholms strikkefestival. 2.200+ deltagere i 2024. Bornholms Idræts- og Kulturcenter.',
    url: 'https://teambornholm.dk/grupper-events/strik-bornholm/',
    billetter: 'Billetter', ikon: 'fyrtar',
  },
  {
    maaned: 'September 2026',
    dato: '18.–20. september', ugedag: 'Fre',
    titel: 'Wool Days Thy',
    sted: 'Hurup Hallerne · Thy',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'Tidl. Fanø Strikkefestival. Stande og lounges i Hurup Hallerne.',
    url: 'https://wooldays.dk/',
    billetter: 'Billetter', ikon: 'faar',
  },
  {
    maaned: 'September 2026',
    dato: '25. september', ugedag: 'Fre',
    titel: 'Strik & Drik m. Feldthaus & Bagger',
    sted: 'Royal Stage · Hillerød',
    type: 'Liveshow', farve: FARVE.Liveshow,
    beskrivelse: 'Scene-show med Christine Feldthaus og Lærke Bagger. Sjov, vild og uforudsigelig aften med skarp humor og varm energi. Kl. 20:00. Billetter fra 290 kr.',
    url: 'https://royalstage.dk/kalendere/show/strik-drik/',
    billetter: 'Billetter', ikon: 'mikrofon',
  },
  {
    maaned: 'September 2026',
    dato: '25.–27. september', ugedag: 'Fre',
    titel: 'Bergen Strikkefestival',
    sted: 'Tekstilindustrimuseet · Salhus, Bergen, Norge',
    type: 'Internationalt', farve: FARVE.Internationalt,
    beskrivelse: '10-års jubilæum på det gamle textilfabrik i Salhus. Workshops, foredrag og masser af garn.',
    url: 'https://muho.no/tekstilindustrimuseet/bergenstrikkefestival',
    billetter: 'Billetter', ikon: 'globus',
  },
  {
    maaned: 'September 2026',
    dato: '1. september', ugedag: 'Tir',
    titel: 'Mens vi strikker – liveshow',
    sted: 'Bremen Teater · København V',
    type: 'Liveshow', farve: FARVE.Liveshow,
    beskrivelse: 'Strikkepodcasten på scene. Tirsdag kl. 19.00.',
    url: 'https://www.originaltalks.dk/events/trine-gadeberg-ditte-hansen-christiane-gjellerup-koch-mens-vi-strikker-963',
    billetter: 'Billetter', ikon: 'mikrofon',
  },
  {
    maaned: 'September 2026',
    dato: '4. september', ugedag: 'Fre',
    titel: 'Mens vi strikker – liveshow',
    sted: 'Kulturværftet · Helsingør',
    type: 'Liveshow', farve: FARVE.Liveshow,
    beskrivelse: 'Strikkepodcasten på scene. Fredag kl. 19.00.',
    url: 'https://www.originaltalks.dk/events/trine-gadeberg-ditte-hansen-christiane-gjellerup-koch-mens-vi-strikker-963',
    billetter: 'Billetter', ikon: 'mikrofon',
  },
  {
    maaned: 'September 2026',
    dato: '6. september', ugedag: 'Søn',
    titel: 'Mens vi strikker – liveshow',
    sted: 'Magasinet · Odense C',
    type: 'Liveshow', farve: FARVE.Liveshow,
    beskrivelse: 'Strikkepodcasten på scene. Søndag kl. 19.00.',
    url: 'https://www.originaltalks.dk/events/trine-gadeberg-ditte-hansen-christiane-gjellerup-koch-mens-vi-strikker-963',
    billetter: 'Billetter', ikon: 'mikrofon',
  },
  {
    maaned: 'September 2026',
    dato: '19. september', ugedag: 'Lør',
    titel: 'Mens vi strikker – liveshow',
    sted: 'Roskilde Kongrescenter · Roskilde',
    type: 'Liveshow', farve: FARVE.Liveshow,
    beskrivelse: 'Strikkepodcasten på scene. Lørdag kl. 19.00.',
    url: 'https://www.originaltalks.dk/events/trine-gadeberg-ditte-hansen-christiane-gjellerup-koch-mens-vi-strikker-963',
    billetter: 'Billetter', ikon: 'mikrofon',
  },
  {
    maaned: 'September 2026',
    dato: '26. september', ugedag: 'Lør',
    titel: 'Mens vi strikker – liveshow',
    sted: 'Musikhuset Esbjerg',
    type: 'Liveshow', farve: FARVE.Liveshow,
    beskrivelse: 'Strikkepodcasten på scene. Lørdag kl. 19.00.',
    url: 'https://www.originaltalks.dk/events/trine-gadeberg-ditte-hansen-christiane-gjellerup-koch-mens-vi-strikker-963',
    billetter: 'Billetter', ikon: 'mikrofon',
  },
  {
    maaned: 'September 2026',
    dato: '26. september', ugedag: 'Lør',
    titel: 'Strikkefestival i Lørslev',
    sted: 'Lørslev Café & Kulturhus · Nordjylland',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: 'Lille hyggelig strikkefestival på Lørslev Café & Kulturhus.',
    url: 'https://nordsoeposten.dk/strikkefestival-2026-arrangeres-igen-af-loerslev-cafe-kulturhus/',
    billetter: 'Sælger hurtigt ud', ikon: 'garn',
  },

  // ── OKTOBER ──
  {
    maaned: 'Oktober 2026',
    dato: '23.–25. oktober', ugedag: 'Fre',
    titel: 'Masker i Marsken',
    sted: 'Tønder Kommune · Tønder, Højer, Skærbæk m.fl.',
    type: 'Festival', farve: FARVE.Festival,
    beskrivelse: '3.000+ besøgende i Vadehavets marsk. Workshops, foredrag, garnstande, modeopvisning og livemusik i smukke omgivelser.',
    url: 'https://maskerimarsken.dk/',
    billetter: 'Via Ticketmaster', ikon: 'siv',
  },
  {
    maaned: 'Oktober 2026',
    dato: '30. okt.–6. nov.', ugedag: 'Fre',
    titel: 'Önling Strik & Velvære på Playitas (uge 45)',
    sted: 'Playitas Resort · Fuerteventura',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: 'En uges strikke- og velvære-rejse til Fuerteventura med Önling. Strikkeundervisning, træning og 20-25 grader.',
    url: 'https://www.oenling.dk/pages/strik-og-velvaere-med-onling-pa-playitas',
    billetter: 'Billetter', ikon: 'globus',
  },

  // ── NOVEMBER ──
  {
    maaned: 'November 2026',
    dato: '6.–13. november', ugedag: 'Fre',
    titel: 'Önling Strik & Velvære på Playitas (uge 46)',
    sted: 'Playitas Resort · Fuerteventura',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: 'Anden afgang af Önlings strikke- og velværerejse til Fuerteventura. Strikkeundervisning, træning og masser af sol.',
    url: 'https://www.oenling.dk/pages/strik-og-velvaere-med-onling-pa-playitas',
    billetter: 'Billetter', ikon: 'globus',
  },
  // ── 2027-rejser ──────────────────────────────────────────────────────────
  // Strikkerejser med Tid til Ro — udsolgte 2026-afgange vises også (jfr. Hannahs valg)
  {
    maaned: 'September 2026',
    dato: '20.–27. september', ugedag: 'Søn',
    titel: 'Strikkerejse på Kreta (Bodil Munch)',
    sted: 'Enagron Ecotourism Village · Kreta',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: '8-dages strikkerejse med yoga med Tid til Ro. Underviser: Bodil Munch. Afgang fra Billund og Kastrup.',
    url: 'https://www.tidtilro.dk/strikkerejser/strikkerejse-med-yoga-paa-kreta-bodil-munch',
    billetter: 'Udsolgt', ikon: 'globus',
  },
  {
    maaned: 'November 2026',
    dato: '25. nov.–5. dec.', ugedag: 'Ons',
    titel: 'Strikkerejse til Sri Lanka',
    sted: 'Sri Lankas sydkyst',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: '11-dages strikkerejse med yoga til Sri Lanka. Tid til Ro · Rejseleder: Eva Helle Miltersen Sørensen. Få ledige pladser.',
    url: 'https://www.tidtilro.dk/rejsetema/strikkerejser/strikkerejse-til-sri-lanka',
    billetter: 'Få pladser', ikon: 'globus',
  },
  {
    maaned: 'Marts 2027',
    dato: '3.–10. marts', ugedag: 'Ons',
    titel: 'Strikkerejse i Andalusien (Helene Jensen)',
    sted: 'Tolox · Andalusien, Spanien',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: '8-dages strikkerejse med vandring. Tid til Ro · Underviser: Helene Jensen. Afgang fra Kastrup. (Også afgang 10. marts fra Billund.)',
    url: 'https://www.tidtilro.dk/strikkerejser/strikkerejse-med-vandring-i-andalusien',
    billetter: 'Billetter', ikon: 'globus',
  },
  {
    maaned: 'Maj 2027',
    dato: '2.–9. maj', ugedag: 'Søn',
    titel: 'Strikkerejse på Kreta (Bodil Munch)',
    sted: 'Enagron Ecotourism Village · Kreta',
    type: 'Retreat', farve: FARVE.Retreat,
    beskrivelse: '8-dages strikkerejse med yoga med Tid til Ro. Underviser: Bodil Munch. Afgang fra Billund og Kastrup.',
    url: 'https://www.tidtilro.dk/strikkerejser/strikkerejse-med-yoga-paa-kreta-bodil-munch',
    billetter: 'Udsolgt', ikon: 'globus',
  },

]

export const KATEGORIER = ['Alle', 'Festival', 'Liveshow', 'Retreat', 'Workshop', 'Internationalt']

export const MAANED_RAEKKEFOLGE = ['Maj 2026', 'Juni 2026', 'Juli 2026', 'August 2026', 'September 2026', 'Oktober 2026', 'November 2026', 'Marts 2027', 'Maj 2027']

/**
 * Returnerer de første N events fra EVENTS-arrayet (kronologisk ordnet i kilde-dataen).
 * Bruges af forsidens "Det sker i strikke-Danmark"-sektion.
 *
 * Pragmatisk valg: events er allerede ordnede kronologisk i arrayet, så vi
 * tager bare de N første. Hvis Hannah lader fortidsevents stå i arrayet,
 * skal de fjernes manuelt — dato-parsing fra fritekst er ikke værd at bygge nu.
 */
export function naestkommendeEvents(n: number): Event[] {
  return EVENTS.slice(0, n)
}

/**
 * Finder events der sandsynligvis foregår på/i nærheden af en given lokation.
 *
 * Matching er heuristisk (case-insensitive substring) på event.sted og event.titel.
 * Bruges af strikkecafé-kort til "Næste arrangementer her"-sektion.
 *
 * @param needle  fx caféens navn eller by ("Saltum", "Nordatlantens Brygge")
 * @param limit   maks antal events at returnere (default 2)
 */
export function eventsAtLokation(needle: string | null, limit = 2): Event[] {
  if (!needle) return []
  const q = needle.trim().toLowerCase()
  if (q.length < 3) return [] // undgå falske positiver på fx "By"

  return EVENTS.filter(ev => {
    const hay = `${ev.sted} ${ev.titel}`.toLowerCase()
    return hay.includes(q)
  }).slice(0, limit)
}
