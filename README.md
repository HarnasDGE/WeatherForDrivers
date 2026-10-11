# WeatherForDrivers

Aplikacja pogodowa: pogoda dla miejsca (aktualna + prognoza 5 dni, wykres, ulubione miejsca) oraz pogoda na trasie przejazdu (trasy alternatywne, pogoda w punktach kontrolnych wg czasu dojazdu).

Stack: Astro (SSR, adapter Node) + React islands + TypeScript + Redux Toolkit, Leaflet, D3.

## Uruchomienie

```bash
cp .env.example .env   # uzupełnij klucze
npm install
npm run dev
```

Zmienne środowiskowe (`.env`, tylko po stronie serwera):

| Zmienna | Źródło |
| --- | --- |
| `OPENWEATHER_API_KEY` | openweathermap.org |
| `UNSPLASH_ACCESS_KEY` | unsplash.com/developers |
| `TOMTOM_API_KEY` | developer.tomtom.com |

Open-Meteo nie wymaga klucza.

## Struktura

- `src/pages/api/` - endpointy serwerowe (kontrakt: `docs/API.md`); frontend nie woła zewnętrznych API
- `src/lib/server/` - serwisy zewnętrznych API i konfiguracja
- `src/lib/shared/` - typy i helpery współdzielone
- `src/lib/client/` - klient `/api`
- `src/store/` - Redux Toolkit (slice'y, thunki, persist w localStorage)
- `src/components/` - wyspy React (`app`, `weather`, `route`, `maps`, `ui`, `layout`)

Produkcja: `npm run build && npm start` (adapter Node).

Vercel: adapter `@astrojs/vercel` włącza się automatycznie (zmienna `VERCEL`). Klucze ustaw w Project Settings → Environment Variables.
