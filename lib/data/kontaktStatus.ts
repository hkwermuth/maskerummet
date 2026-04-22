export type KontaktStatus = 'ikke_kontaktet' | 'afventer' | 'positiv' | 'aftale' | 'afvist'

export type KontaktPost = {
  navn: string
  kontakt: string
  website?: string
  status: KontaktStatus
  sidstKontaktet?: string
  opfolgning?: string
  noter?: string
  prioritet: 1 | 2 | 3 | 4
}

export const STATUS_LABEL: Record<KontaktStatus, string> = {
  ikke_kontaktet: 'Ikke kontaktet',
  afventer: 'Afventer svar',
  positiv: 'Positiv dialog',
  aftale: 'Aftale på plads',
  afvist: 'Afvist / ingen respons',
}

export const STATUS_FARVER: Record<KontaktStatus, { bg: string; txt: string; dot: string }> = {
  ikke_kontaktet: { bg: '#F2EBE4', txt: '#8C7E74', dot: '#C8BFB6' },
  afventer:       { bg: '#FBF0DC', txt: '#6A4010', dot: '#D49840' },
  positiv:        { bg: '#E4F0E8', txt: '#2E6040', dot: '#61846D' },
  aftale:         { bg: '#D8EBDD', txt: '#1F4028', dot: '#3A6A4A' },
  afvist:         { bg: '#F5E4E4', txt: '#7A2020', dot: '#A04040' },
}

export const FABRIKANTER: KontaktPost[] = [
  { navn: 'Drops / Garnstudio', kontakt: 'media@garnstudio.com', website: 'garnstudio.com', status: 'afventer', sidstKontaktet: '2026-04-21', opfolgning: '2026-05-05', noter: 'Presse-mail. Alt. EU-kontor: export@garnstudio.com', prioritet: 1 },
  { navn: 'Filcolana', kontakt: 'Anne Holt Kirkegaard (salgsansvarlig)', website: 'filcolana.dk', status: 'afventer', sidstKontaktet: '2026-04-22', opfolgning: '2026-05-06', noter: 'Sendt direkte til navngiven person. Delvist allerede i katalog (Tilia)', prioritet: 1 },
  { navn: 'Sandnes Garn', kontakt: 'sandnesgarn.no/kundeservice', website: 'sandnesgarn.no', status: 'ikke_kontaktet', noter: 'Sunday og Alpakka Silke populære', prioritet: 1 },
  { navn: 'Hobbii', kontakt: 'hobbii.dk/kontakt', website: 'hobbii.dk', status: 'ikke_kontaktet', noter: 'Flere husmærker — én aftale dækker mange produkter', prioritet: 1 },
  { navn: 'Knitting for Olive', kontakt: 'knittingforolive.com/kontakt', website: 'knittingforolive.com', status: 'ikke_kontaktet', noter: 'Meget populært dansk brand', prioritet: 1 },
  { navn: 'Permin', kontakt: 'permin@permin.dk', website: 'permin.dk', status: 'afventer', sidstKontaktet: '2026-04-22', opfolgning: '2026-05-06', noter: 'Tilgivelses-vinkel (Bella, Bella Color, Hannah allerede i katalog). B2B-distributør', prioritet: 2 },
  { navn: 'Isager', kontakt: 'isagerstrik.dk/kontakt', website: 'isagerstrik.dk', status: 'ikke_kontaktet', noter: 'Premium. Stor designer-stald', prioritet: 2 },
  { navn: 'CaMaRose', kontakt: 'camarose.dk/kontakt', website: 'camarose.dk', status: 'ikke_kontaktet', noter: 'Eget garn + opskrifter', prioritet: 2 },
  { navn: 'Novita', kontakt: 'novitaknits.com/kontakt', website: 'novitaknits.com', status: 'ikke_kontaktet', noter: 'Finlands største', prioritet: 2 },
  { navn: 'Mayflower', kontakt: 'via hobbii.com', website: 'mayflower.dk', status: 'ikke_kontaktet', noter: 'Ejet af Hobbii — kan evt. dækkes af Hobbii-aftale', prioritet: 2 },
  { navn: 'Holst Garn', kontakt: 'holstgarn.dk/kontakt', website: 'holstgarn.dk', status: 'ikke_kontaktet', noter: 'Små partier, håndfarvet', prioritet: 3 },
  { navn: 'Hjertegarn', kontakt: 'hjertegarn.dk/kontakt', website: 'hjertegarn.dk', status: 'ikke_kontaktet', noter: 'Bred distribution i DK', prioritet: 3 },
  { navn: 'BC Garn', kontakt: 'bc-garn.de/kontakt', website: 'bc-garn.de', status: 'ikke_kontaktet', noter: 'Dansk-tysk', prioritet: 3 },
  { navn: 'Önling', kontakt: 'onling.dk/kontakt', website: 'onling.dk', status: 'ikke_kontaktet', noter: 'Egne kollektioner', prioritet: 3 },
  { navn: 'Dale Garn', kontakt: 'dalegarn.com/kontakt', website: 'dalegarn.com', status: 'ikke_kontaktet', noter: 'Klassisk norsk uld', prioritet: 3 },
  { navn: 'Järbo Garn', kontakt: 'jarbo.se/kontakt', website: 'jarbo.se', status: 'ikke_kontaktet', noter: 'Ejer Marks & Kattens', prioritet: 3 },
  { navn: 'Ístex', kontakt: 'istex.is/kontakt', website: 'istex.is', status: 'ikke_kontaktet', noter: 'Léttlopi, Álafosslopi', prioritet: 3 },
]

export const DESIGNERE: KontaktPost[] = [
  { navn: 'PetiteKnit', kontakt: 'Mette Wendelboe Okkels · petiteknit.com', website: 'petiteknit.com', status: 'ikke_kontaktet', noter: 'Mest solgte designer i DK. Verificér kontakt-email', prioritet: 1 },
  { navn: 'Lærke Bagger', kontakt: 'laerkebagger.com', website: 'laerkebagger.com', status: 'ikke_kontaktet', noter: 'Bestseller. Kendt fra Strik & Drik-live', prioritet: 1 },
  { navn: 'Anne Ventzel / Ankestrik', kontakt: 'anneventzel.com', website: 'anneventzel.com', status: 'ikke_kontaktet', noter: 'Elegante, feminine designs', prioritet: 1 },
  { navn: 'Knitting for Olive (designer)', kontakt: 'Pernille Larsen · knittingforolive.com', website: 'knittingforolive.com', status: 'ikke_kontaktet', noter: 'Koordinér med fabrikant-mail', prioritet: 1 },
  { navn: 'Isager Strik (designere)', kontakt: 'Marianne + Helga Isager', website: 'isagerstrik.dk', status: 'ikke_kontaktet', noter: 'Koordinér med fabrikant-mail', prioritet: 1 },
  { navn: 'Christel Seyfarth', kontakt: 'christel-seyfarth.com', website: 'christel-seyfarth.com', status: 'ikke_kontaktet', noter: 'Fair Isle, farverige sjaler', prioritet: 2 },
  { navn: 'Hanne Falkenberg', kontakt: 'hannefalkenberg.dk', website: 'hannefalkenberg.dk', status: 'ikke_kontaktet', noter: 'Stor katalog — modulær strik', prioritet: 2 },
  { navn: 'Le Knit', kontakt: 'Helga Isager + Line Sjoerup Leed · leknit.com', website: 'leknit.com', status: 'ikke_kontaktet', noter: 'Moderne skandinavisk', prioritet: 2 },
  { navn: 'Sanne Fjalland', kontakt: 'sannefjalland.dk', website: 'sannefjalland.dk', status: 'ikke_kontaktet', noter: 'Fokus på kvalitet, mange kits', prioritet: 2 },
  { navn: 'Sara Diez', kontakt: 'saradiez.com', website: 'saradiez.com', status: 'ikke_kontaktet', noter: 'Stor på Ravelry blandt danske strikkere', prioritet: 2 },
  { navn: 'Hanne Rimmen', kontakt: 'hannerimmen.dk', website: 'hannerimmen.dk', status: 'ikke_kontaktet', noter: 'Ny nordisk strikdesign', prioritet: 2 },
  { navn: 'Lene Holme Samsøe', kontakt: 'via forlag', status: 'ikke_kontaktet', noter: 'Etableret, ofte i bogform', prioritet: 2 },
  { navn: 'Katrine Hannibal (Önling)', kontakt: 'onling.dk', website: 'onling.dk', status: 'ikke_kontaktet', noter: 'Koordinér med fabrikant-mail', prioritet: 2 },
  { navn: 'Ruth Sørensen', kontakt: 'ruthsorensen.com', website: 'ruthsorensen.com', status: 'ikke_kontaktet', noter: 'Tidløse danske designs', prioritet: 3 },
  { navn: 'VesterbyCrea', kontakt: 'Thea Vesterby · vesterbycrea.dk', website: 'vesterbycrea.dk', status: 'ikke_kontaktet', noter: 'Retreat-vært på Ærø. Feminine designs', prioritet: 3 },
  { navn: 'Spektakelstrik', kontakt: 'Beate Blome · spektakelstrik.dk', website: 'spektakelstrik.dk', status: 'ikke_kontaktet', noter: 'Sjove, innovative mønstre', prioritet: 3 },
  { navn: 'Créadia Studio', kontakt: 'Nabita Jouret · creadia-studio.com', website: 'creadia-studio.com', status: 'ikke_kontaktet', noter: 'Moderne mode-strik', prioritet: 3 },
  { navn: 'Woolstock ★', kontakt: 'Louise · info@woolstock.dk', website: 'woolstock.dk', status: 'ikke_kontaktet', noter: 'Jagtvej 183 København. Foretrækker mail', prioritet: 3 },
  { navn: 'Mens vi strikker ★', kontakt: 'Ditte, Christiane, Trine · via Politikens Forlag', status: 'ikke_kontaktet', noter: 'Podcast-trio. Bog med 20 opskrifter. Skriv til forlaget', prioritet: 3 },
  { navn: 'Kan You Vest ★', kontakt: 'Katrine, Lærke, Astrid · kanyouvest.com', website: 'kanyouvest.com', status: 'ikke_kontaktet', noter: 'Upcycling-kollektiv. Bæredygtigheds-vinkel', prioritet: 3 },
]

export type Opfolgning = { dato: string; navn: string; handling: string }

export const KOMMENDE_OPFOLGNINGER: Opfolgning[] = [
  { dato: '2026-05-05', navn: 'Drops / Garnstudio', handling: 'Opfølgnings-mail hvis intet svar. Alt. export@garnstudio.com' },
  { dato: '2026-05-06', navn: 'Permin', handling: 'Opfølgnings-mail hvis intet svar' },
  { dato: '2026-05-06', navn: 'Filcolana (Anne Holt Kirkegaard)', handling: 'Opfølgnings-mail hvis intet svar' },
  { dato: '2026-05-12', navn: 'Alle 3 hvis tavse', handling: 'Vurder "sidste forsøg"-mail' },
]
