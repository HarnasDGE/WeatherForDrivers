import type { RouteWarning, RouteWarningsPoint, WarningLevel, WarningStretch } from '@/lib/shared/types';
import { API_BASE } from '../config';
import { fetchJson } from '../http';
import { countyAt } from './powiaty';

/**
 * Official meteorological warnings of IMGW-PIB (public data API, no key):
 * GET https://danepubliczne.imgw.pl/api/data/warningsmeteo -> array of warnings, each for a list of
 * counties (4-digit TERYT codes). Times are Polish wall-clock time ("2026-10-12 06:00:00").
 * The list is small (the whole country), so it is fetched once and cached for 10 minutes.
 */

/** Upstream item, as verified on the live API (all values are strings). */
interface ImgwWarningRaw {
  id?: string;
  nazwa_zdarzenia?: string;
  stopien?: string;
  prawdopodobienstwo?: string;
  obowiazuje_od?: string;
  obowiazuje_do?: string;
  opublikowano?: string;
  tresc?: string;
  komentarz?: string;
  biuro?: string;
  teryt?: string[];
}

/** Parsed warning before it is matched against a route. */
export interface ImgwWarning {
  id: string;
  level: WarningLevel;
  event: string;
  eventLabel: string | null;
  probability: number | null;
  validFrom: Date;
  validTo: Date;
  published: Date | null;
  office: string | null;
  teryt: Set<string>;
  description: string;
}

const CACHE_MS = 10 * 60 * 1000;
/** After a failed fetch, wait this long before asking IMGW again (the route flow must stay fast). */
const FAILURE_CACHE_MS = 60 * 1000;
const TIMEOUT_MS = 6000;

let cache: { at: number; ttl: number; warnings: ImgwWarning[] } | null = null;
let inFlight: Promise<ImgwWarning[]> | null = null;

/* ------------------------------ time ------------------------------ */

const warsawParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Warsaw',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Offset of Polish time from UTC at an instant, ms (+1 h in winter, +2 h in summer). */
function warsawOffsetMs(instant: number): number {
  const parts = Object.fromEntries(warsawParts.formatToParts(new Date(instant)).map((p) => [p.type, p.value]));
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return wall - Math.floor(instant / 1000) * 1000;
}

/** "YYYY-MM-DD HH:MM[:SS]" in Polish time -> instant; null when malformed. */
export function parseWarsawTime(value: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value?.trim() ?? '');
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  // Two passes settle the offset also next to a DST switch.
  let utc = wall - warsawOffsetMs(wall);
  utc = wall - warsawOffsetMs(utc);
  return Number.isNaN(utc) ? null : new Date(utc);
}

/* ----------------------------- parsing ----------------------------- */

/** Short English labels for the usual IMGW phenomena; first match wins. */
const EVENT_LABELS: Array<[RegExp, string]> = [
  [/deszcz.*burz/i, 'Heavy rain with thunderstorms'],
  [/grad/i, 'Thunderstorms with hail'],
  [/burz/i, 'Thunderstorms'],
  [/zawiej|zamie/i, 'Blowing snow'],
  [/marzn/i, 'Freezing rain'],
  [/gołoled/i, 'Glaze ice'],
  [/oblodz/i, 'Icy roads'],
  [/szad/i, 'Freezing fog'],
  [/mgł/i, 'Dense fog'],
  [/śnieg/i, 'Heavy snow'],
  [/wiatr/i, 'Strong wind'],
  [/deszcz|opad/i, 'Heavy rain'],
  [/upał/i, 'Heat'],
  [/przymroz/i, 'Ground frost'],
  [/mróz|mroz/i, 'Severe frost'],
  [/roztop/i, 'Thaw'],
];

export function eventLabel(event: string): string | null {
  return EVENT_LABELS.find(([pattern]) => pattern.test(event))?.[1] ?? null;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Comment is "Brak." (none) on most warnings. */
const hasComment = (comment: string) => comment !== '' && !/^brak\.?$/i.test(comment);

/** Validates and normalises the upstream list; malformed items are skipped. */
export function parseWarnings(raw: unknown): ImgwWarning[] {
  if (!Array.isArray(raw)) return [];
  const result: ImgwWarning[] = [];
  for (const item of raw as ImgwWarningRaw[]) {
    if (typeof item !== 'object' || item === null) continue;
    const level = Number(item.stopien);
    const validFrom = parseWarsawTime(item.obowiazuje_od);
    const validTo = parseWarsawTime(item.obowiazuje_do);
    const teryt = Array.isArray(item.teryt) ? item.teryt.filter((t) => typeof t === 'string' && /^\d{4}$/.test(t)) : [];
    const event = text(item.nazwa_zdarzenia);
    if (![1, 2, 3].includes(level) || !validFrom || !validTo || teryt.length === 0 || !event) continue;
    const probability = Number.parseInt(text(item.prawdopodobienstwo), 10);
    const comment = text(item.komentarz);
    result.push({
      id: text(item.id) || `${event}-${item.obowiazuje_od}`,
      level: level as WarningLevel,
      event,
      eventLabel: eventLabel(event),
      probability: Number.isFinite(probability) ? probability : null,
      validFrom,
      validTo,
      published: parseWarsawTime(item.opublikowano),
      office: text(item.biuro) || null,
      teryt: new Set(teryt),
      description: [text(item.tresc), hasComment(comment) ? comment : ''].filter(Boolean).join(' '),
    });
  }
  return result;
}

/* ----------------------------- fetching ----------------------------- */

async function load(): Promise<ImgwWarning[]> {
  try {
    const raw = await fetchJson<unknown>(`${API_BASE.imgw}/api/data/warningsmeteo`, {
      service: 'IMGW',
      timeoutMs: TIMEOUT_MS,
      retries: 1,
    });
    if (!Array.isArray(raw)) console.warn('[imgw] unexpected warnings response, treating as no warnings');
    const warnings = parseWarnings(raw);
    cache = { at: Date.now(), ttl: CACHE_MS, warnings };
    return warnings;
  } catch (error) {
    // Warnings are an extra: never break the route flow because IMGW is down.
    console.warn('[imgw] could not load warnings, showing none', error instanceof Error ? error.message : error);
    cache = { at: Date.now(), ttl: FAILURE_CACHE_MS, warnings: [] };
    return [];
  }
}

/** All current IMGW meteorological warnings for Poland (cached; [] when IMGW is unavailable). */
export async function getImgwWarnings(): Promise<ImgwWarning[]> {
  if (cache && Date.now() - cache.at < cache.ttl) return cache.warnings;
  inFlight ??= load().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/* ----------------------------- matching ----------------------------- */

/**
 * Time window each point stands for: from halfway after the previous point to halfway before the next one,
 * so a warning that starts or ends between two samples still counts.
 */
function pointWindows(times: number[]): Array<[number, number]> {
  return times.map((t, i) => [
    i === 0 ? t : (times[i - 1] + t) / 2,
    i === times.length - 1 ? t : (t + times[i + 1]) / 2,
  ]);
}

/** Warnings that apply to the route while the driver is in the warned county, with the affected stretches. */
export function matchWarnings(points: readonly RouteWarningsPoint[], warnings: readonly ImgwWarning[]): RouteWarning[] {
  if (warnings.length === 0 || points.length === 0) return [];
  const counties = points.map(countyAt);
  const windows = pointWindows(points.map((p) => new Date(p.time).getTime()));
  const result: RouteWarning[] = [];

  for (const warning of warnings) {
    const from = warning.validFrom.getTime();
    const to = warning.validTo.getTime();
    const hit = points.map((_, i) => {
      const county = counties[i];
      const [enter, exit] = windows[i];
      return county !== null && warning.teryt.has(county.teryt) && enter <= to && exit >= from;
    });

    const stretches: WarningStretch[] = [];
    hit.forEach((inside, i) => {
      if (!inside) return;
      const last = stretches.at(-1);
      if (last && last.toIndex === i - 1) {
        last.toIndex = i;
        last.toMeters = points[i].lengthInMeters;
      } else {
        const meters = points[i].lengthInMeters;
        stretches.push({ fromIndex: i, toIndex: i, fromMeters: meters, toMeters: meters });
      }
    });
    if (stretches.length === 0) continue;

    const areas = [...new Set(counties.flatMap((county, i) => (hit[i] && county ? [county.name] : [])))];
    result.push({
      id: warning.id,
      level: warning.level,
      event: warning.event,
      eventLabel: warning.eventLabel,
      probability: warning.probability,
      validFrom: warning.validFrom.toISOString(),
      validTo: warning.validTo.toISOString(),
      published: warning.published?.toISOString() ?? null,
      office: warning.office,
      areas,
      stretches,
      description: warning.description,
      sample: false,
    });
  }

  // Where it starts on the road first, then the most severe.
  return result.sort((a, b) => a.stretches[0].fromIndex - b.stretches[0].fromIndex || b.level - a.level);
}

/** Warnings along a route; [] when IMGW is unavailable or the route is outside Poland. */
export async function getRouteWarnings(points: readonly RouteWarningsPoint[]): Promise<RouteWarning[]> {
  return matchWarnings(points, await getImgwWarnings());
}
