# WeatherForDrivers

Pogoda dla kierowców, mobile first:
- **Drive**: trasa z wariantami, pogoda w punktach kontrolnych liczona na czas dojazdu, ocena warunków (z temperaturą nawierzchni), dzień/noc, godzina wyjazdu, oficjalne ostrzeżenia meteorologiczne IMGW-PIB na odcinkach trasy w Polsce (ważne w chwili przejazdu). Mapa i oś czasu są powiązane (dotknięcie punktu kontrolnego na liście lub znaku na mapie pokazuje go w drugim miejscu), a przełącznik „Radar” nakłada na mapę radar opadów (RainViewer, bez klucza; wymagane uznanie źródła jest na mapie).
- **When**: ta sama trasa sprawdzona dla każdego wyjazdu w najbliższych 24 h, z rekomendacją najlepszej godziny.
- **Sun & wind**: odcinki z nisko stojącym słońcem w oczy i z silnym bocznym wiatrem.
- **Forecast**: prognoza dla miejscowości (teraz, 24 h, 5 dni) z animowanym tłem pogody.
- **Ostatnie miejsca**: planer pamięta 8 ostatnio wybranych miejsc i podpowiada je przy pustym polu.
- **Udostępnianie trasy**: przycisk Share w szczegółach trasy daje link (`/?from=..&fromLat=..&fromLon=..&to=..&toLat=..&toLon=..&leave=..&type=..`); otwarcie linku od razu liczy trasę z pogodą.

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
| `TOMTOM_DAILY_BUDGET` | opcjonalnie: globalny dzienny limit zapytań do TomTom (domyślnie 600 = 20 000 / 30) |

Open-Meteo nie wymaga klucza. Wyszukiwanie miejsc i „Use my location” korzystają z Photon (photon.komoot.io, OpenStreetMap, też bez klucza; publiczna instancja, więc z nagłówkiem `User-Agent`), a gdy Photon zawiedzie, z geokodowania Open-Meteo (`language=pl`). TomTom: jedno sprawdzenie trasy = 1 zapytanie (czasy dojazdu do punktów liczone z odpowiedzi trasy); darmowy plan to 20 000 zapytań o trasę miesięcznie.

Ochrona limitów: odpowiedzi zewnętrznych API są cache'owane w pamięci (prognoza 10 min, geokodowanie 24 h, trasy 2 min), endpointy GET mają `Cache-Control` z `s-maxage` (CDN Vercel), a middleware (`src/middleware.ts`) ogranicza ruch na IP (np. `/api/route`: 15/min i 150/dzień; HTTP 429 `RATE_LIMITED` z `Retry-After`). Uwaga: stan jest w pamięci procesu, więc na Vercel (wiele instancji, restarty) to ochrona „best effort"; docelowo można przenieść liczniki i cache do Upstash Redis / Vercel KV. Szczegóły: `docs/API.md`.

Wykrywanie gołoledzi i szronu opiera się na temperaturze nawierzchni (`soil_temperature_0cm`) i punkcie rosy (`dew_point_2m`) z Open-Meteo, a nie tylko na temperaturze powietrza (`src/lib/shared/road-conditions.ts`).

Open-Meteo i IMGW-PIB (ostrzeżenia) nie wymagają klucza. TomTom: jedno sprawdzenie trasy = 1 zapytanie (czasy dojazdu do punktów liczone z odpowiedzi trasy); darmowy plan to 20 000 zapytań o trasę miesięcznie.

Tryb demo: bez `TOMTOM_API_KEY` / `OPENWEATHER_API_KEY` (albo z `MOCK_API=true`) trasy i pogoda na trasie to dane przykładowe z `src/lib/server/mock/`. W UI widać wtedy znacznik „Demo data”. Wyszukiwarka miejsc, prognoza (Open-Meteo) i ostrzeżenia IMGW zawsze działają na żywo; gdy IMGW nie ma ostrzeżeń dla trasy, tryb demo pokazuje jedno przykładowe (oznaczone jako przykład). Szczegóły: `docs/API.md`.

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
