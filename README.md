# Maskerummet

Lokal prototype til Garnlager-modulet.

## Kom i gang

```bash
npm install
npm run dev
```

Åbn `http://localhost:5173` i browseren.

## Test på mobil (samme WiFi)

```bash
npm run dev -- --host
```

Terminalen viser en adresse som `http://192.168.x.x:5173` — åbn den på din telefon.

## Struktur

```
maskerummet/
├── src/
│   ├── components/
│   │   └── Garnlager.jsx   ← hovedkomponenten
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## Data

Data gemmes i `localStorage` i browseren — dvs. det forbliver på din maskine og overlever genindlæsninger. 
Næste skridt: koble på Supabase for synkronisering på tværs af enheder.
