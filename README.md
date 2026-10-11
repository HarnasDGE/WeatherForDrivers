Pogoda dla kierowców, mobile first:
- **Drive**: trasa z wariantami, pogoda w punktach kontrolnych liczona na czas dojazdu, ocena warunków, dzień/noc, godzina wyjazdu. Mapa i oś czasu są powiązane (dotknięcie punktu kontrolnego na liście lub znaku na mapie pokazuje go w drugim miejscu), a przełącznik „Radar” nakłada na mapę radar opadów (RainViewer, bez klucza, także w trybie demo; wymagane uznanie źródła jest na mapie).
- **When**: ta sama trasa sprawdzona dla każdego wyjazdu w najbliższych 24 h, z rekomendacją najlepszej godziny.
- **Sun & wind**: odcinki z nisko stojącym słońcem w oczy i z silnym bocznym wiatrem.
- **Forecast**: prognoza dla miejscowości (teraz, 24 h, 5 dni) z animowanym tłem pogody.

Stack: Astro (SSR, adapter Node lokalnie, Vercel na Vercelu) + React islands + TypeScript + Redux Toolkit, Leaflet, CSS Modules.
Design: `docs/DESIGN.md` (skill `frontend-design` w `.claude/skills/`).

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

Open-Meteo nie wymaga klucza. TomTom: jedno sprawdzenie trasy = 1 zapytanie (czasy dojazdu do punktów liczone z odpowiedzi trasy); darmowy plan to 20 000 zapytań o trasę miesięcznie.

Tryb demo: bez `TOMTOM_API_KEY` / `OPENWEATHER_API_KEY` (albo z `MOCK_API=true`) trasy i pogoda na trasie to dane przykładowe z `src/lib/server/mock/`. W UI widać wtedy znacznik „Demo data”. Wyszukiwarka miejsc i prognoza (Open-Meteo) zawsze działają na żywo. Szczegóły: `docs/API.md`.

## Struktura

- `src/pages/api/` - endpointy serwerowe (kontrakt: `docs/API.md`); frontend nie woła zewnętrznych API
- `src/lib/server/` - serwisy zewnętrznych API i konfiguracja
- `src/lib/shared/` - typy i helpery współdzielone
- `src/lib/client/` - klient `/api`
- `src/lib/server/mock/` - dane demo (tryb bez kluczy)
- `src/store/` - Redux Toolkit (slice'y, thunki, persist w localStorage)
- `src/hooks/` - hooki React (podpowiedzi miejsc, media queries)
- `src/styles/` - tokeny designu i style globalne
- `src/components/` - wyspa React: `app` (szkielet, nawigacja), `drive`, `forecast`, `map`, `ui`, `providers`

Produkcja: `npm run build && npm start` (adapter Node).

Vercel: adapter `@astrojs/vercel` włącza się automatycznie (zmienna `VERCEL`). Klucze ustaw w Project Settings → Environment Variables.
