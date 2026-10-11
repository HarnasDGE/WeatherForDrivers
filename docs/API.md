# WeatherApp – server API contract

All external services (OpenWeatherMap, Open-Meteo, Unsplash, TomTom) are called **only on the server**
(`src/lib/server/**`). The frontend talks exclusively to the endpoints below (same origin, relative URLs).
TypeScript types live in [`src/lib/shared/types.ts`](../src/lib/shared/types.ts) – import them with
`import type { … } from '@/lib/shared/types'`.

## Conventions

- Success: HTTP 2xx, body `{ "data": T }` (`ApiSuccessResponse<T>`).
- Error: HTTP 4xx/5xx, body `{ "error": { "code": ApiErrorCode, "message": string } }` (`ApiErrorResponse`).
  `message` is human readable and safe to show in a notification.

| HTTP | `code`               | When                                                            |
| ---- | -------------------- | --------------------------------------------------------------- |
| 400  | `BAD_REQUEST`        | missing/invalid parameter or body                               |
| 404  | `NOT_FOUND`          | nothing found (place, image, route) or unknown `/api/*` path     |
| 405  | `METHOD_NOT_ALLOWED` | wrong HTTP method                                               |
| 500  | `CONFIG_MISSING_KEY` | API key missing in server env (`.env`, see `.env.example`)      |
| 500  | `INTERNAL_ERROR`     | unexpected server error                                         |
| 502  | `UPSTREAM_ERROR`     | external API failed / rejected key / rate limited               |
| 504  | `UPSTREAM_TIMEOUT`   | external API did not answer within 10 s                         |

- Units: metric (°C, m/s for OpenWeatherMap, km/h for Open-Meteo wind, mm, %).
- Coordinates: `lat` ∈ [-90, 90], `lon` ∈ [-180, 180], decimal degrees. Everywhere `{ lat, lon }` (`LatLon`).

---

## GET `/api/weather` – current weather (OpenWeatherMap)

| param  | required | notes                                                 |
| ------ | -------- | ----------------------------------------------------- |
| `lat`  | yes      | number                                                |
| `lon`  | yes      | number                                                |
| `name` | no       | overrides the station name in the response (≤100 ch.) |

`200 { data: CurrentWeather }` – `name, countryCode, lat, lon, dt, timezoneOffset, sunrise, sunset,
temperature, feelsLike, tempMin, tempMax, pressure, humidity, visibility, windSpeed, windDeg, windGust,
clouds, conditionId, condition, description, icon`. Times are Unix seconds (UTC); `timezoneOffset` in seconds.
Needs `OPENWEATHER_API_KEY`. Replaces legacy `fetchDataForPlace` / `fetchDataFromCoords` (used for refreshing favourites).

## GET `/api/forecast` – 5-day hourly + daily forecast (Open-Meteo, no key)

| param | required |
| ----- | -------- |
| `lat` | yes      |
| `lon` | yes      |

`200 { data: Forecast }`:

```ts
{
  lat, lon, timezone: 'Europe/Warsaw', utcOffsetSeconds: 7200,
  hourly: { time: string[]  /* 120 items, local "YYYY-MM-DDTHH:MM" */,
            temperature2m, precipitationProbability, precipitation, rain, showers,
            snowfall, weatherCode, cloudCover,
            windGusts10m /* km/h */, visibility /* m */, isDay /* 1|0 */ }, // (number|null)[] aligned with time
  daily:  { time: string[]  /* 5 items, "YYYY-MM-DD" */,
            weatherCode, temperatureMax, temperatureMin,
            sunrise, sunset /* local "YYYY-MM-DDTHH:MM" strings */,
            daylightDuration, sunshineDuration, uvIndexMax, uvIndexClearSkyMax,
            precipitationSum, rainSum, showersSum, snowfallSum, precipitationHours,
            precipitationProbabilityMax, windSpeedMax, windGustsMax, windDirectionDominant }
}
```

Same variables as legacy `fetchDataPlace`. Differences: times are **local wall-clock strings without offset**
(legacy: ISO with fake `Z`), missing values are `null` (legacy: `"?"`), `sunrise`/`sunset` are real values.
Place metadata (`name`, `countryCode`) is **not** included – take it from `/api/geocode`.

## GET `/api/geocode` – place search (Open-Meteo Geocoding, no key)

| param   | required | notes                                    |
| ------- | -------- | ---------------------------------------- |
| `q`     | yes      | ≤100 chars; fewer than 2 chars → `[]`    |
| `limit` | no       | integer 1..10, default 5                 |

`200 { data: Place[] }` – `{ name, lat, lon, countryCode /* "PL" */, country, admin1 }`. Empty array when nothing found
(not 404). Legacy search took the first result (`limit=1`).

## GET `/api/place-image` – photo of a place (Unsplash)

| param | required |
| ----- | -------- |
| `q`   | yes      |

`200 { data: PlaceImage }` – `{ url, alt, authorName, authorUrl }` (show attribution: “Photo by authorName on Unsplash”).
`404 NOT_FOUND` when Unsplash has no image. Needs `UNSPLASH_ACCESS_KEY`.

## GET `/api/route` – route with alternatives (geocoding + TomTom)

| param       | required | notes                                                                     |
| ----------- | -------- | ------------------------------------------------------------------------- |
| `from`      | yes      | place name, geocoded to the first match                                   |
| `to`        | yes      | place name                                                                |
| `routeType` | no       | `fastest` (default) \| `shortest` \| `eco` \| `thrilling` (`RouteType`)    |
| `fromLat`, `fromLon` | no | coordinates of a place picked from `/api/geocode`; skips geocoding `from` (both or neither) |
| `toLat`, `toLon`     | no | same for `to`                                                    |
| `departAt`  | no       | ISO 8601 departure, now..+3 days (default: now); sets traffic and arrival times |

`200 { data: RouteData }`:

```ts
{
  from: Place, to: Place, routeType,
  routes: Array<{                     // [main, ...up to 2 alternatives] (maxAlternatives=2)
    summary: { lengthInMeters, travelTimeInSeconds, trafficDelayInSeconds,
               departureTime, arrivalTime },   // ISO 8601 with offset
    points: LatLon[]                  // full geometry (legacy legs[0].points, renamed latitude/longitude -> lat/lon)
    timeline: Array<{ offsetMeters, seconds }> // driving time along the route (TomTom guidance), {0,0} .. end
  }>
}
```

`404` when a place or a route is not found. Needs `TOMTOM_API_KEY` (demo data in mock mode, see below).
"Make alternative the main route" (legacy `changeMainRoute`) is a pure client-side reorder – no endpoint.

## POST `/api/route-weather` – weather at control points along routes

Body (`Content-Type: application/json`, `RouteWeatherRequest`):

```ts
{
  routes: Array<{ points: LatLon[] }>, // 1..3 routes, 2..50 000 points each – pass RouteData.routes as-is
  controlPoints: number,              // integer 3..20 (legacy slider; default in legacy store: 5)
  departureTime?: string              // ISO 8601, now..+3 days; omitted = leave now
}
```

Each route may also carry `timeline` (`RouteProgress[]`, as returned by `/api/route`): checkpoints are then
timed from it with no extra TomTom calls. Without it, the server asks TomTom once per checkpoint.

`200 { data: RouteWeather[] }` – one item per route, **same order as the request**:

```ts
{ routeIndex: number,
  points: Array<{                     // RouteWeatherPoint
    lat, lon,
    name: string,                     // reverse geocoded; "Place on the road" when unknown
    lengthInMeters: number,           // driving distance from route start
    travelTimeInSeconds: number,      // driving time from route start
    time: string,                     // ISO UTC arrival, rounded to nearest 15 min
    temperature: number | null,       // °C, 1 decimal (legacy returned the string "12.3°C")
    weatherCode: number | null,       // WMO code
    isDay: boolean | null
  }> }
```

Control points = every `floor(points.length / controlPoints + 1)`-th route point plus the last one
(so usually `controlPoints + 1` points, the first being the start). Because results are index-aligned
with routes, the legacy `checkWeatherOnRoute` coordinate-matching is no longer needed: when the user
swaps the main route, reorder `RouteWeather[]` the same way (or look up by `routeIndex`).
This call is slow (≈ one TomTom request per control point, concurrency-limited) – show a loader.
Needs `TOMTOM_API_KEY` and `OPENWEATHER_API_KEY`.

## GET `/api/tiles/{layer}/{z}/{x}/{y}.png` – weather map tiles (OpenWeatherMap proxy)

`layer` ∈ `clouds_new | precipitation_new | pressure_new | wind_new | temp_new` (`WeatherMapLayer`),
`z` 0..20, `x`,`y` 0..2^z−1. Returns `image/png` (cached 10 min); errors are JSON as above.
Leaflet: `L.tileLayer('/api/tiles/' + layer + '/{z}/{x}/{y}.png')`. Replaces legacy `Map.js`, which put the
API key in the browser. The OpenStreetMap base layer is public and may be loaded directly.
Needs `OPENWEATHER_API_KEY`.

## POST `/api/departure-windows` – weather along a route for many departures

Body (`DepartureWindowsRequest`):

```ts
{
  checkpoints: Array<{ lat, lon, offsetSeconds }>, // 2..25, driving time from the start (from /api/route-weather)
  start: string,                                   // ISO, first departure (now..+3 days)
  count: number,                                   // 1..36 departures
  stepMinutes: number                              // 15..180 between departures
}
```

`200 { data: DepartureWindow[] }` – `{ departure, points: Array<{ time, temperature, weatherCode, isDay }> }`,
points index-aligned with `checkpoints`. Driving times are assumed equal for every departure (traffic ignored).
One Open-Meteo request; no TomTom calls.

---

## Mock mode (demo data)

`isMockMode()` in `src/lib/server/config.ts`: `MOCK_API=true` forces it, `MOCK_API=false` disables it,
otherwise it is on while `TOMTOM_API_KEY` or `OPENWEATHER_API_KEY` is missing.

In mock mode `/api/route`, `/api/route-weather` and `/api/departure-windows` return deterministic demo data (`src/lib/server/mock/`)
with the same shapes as above. `/api/geocode` and `/api/forecast` (Open-Meteo, no key) always stay live.
The page shows a "Demo data" badge while mock mode is on.
