import type { DepartureWindowsRequest } from '@/lib/shared/types';
import {
  handle,
  isValidLatLon,
  jsonData,
  methodNotAllowed,
  optionalDeparture,
  parseNumberInRange,
} from '@/lib/server/api';
import { isMockMode } from '@/lib/server/config';
import { badRequest } from '@/lib/server/errors';
import { mockDepartureWindows } from '@/lib/server/mock/departure-windows';
import { getDepartureWindows } from '@/lib/server/services/departure-windows';

const MAX_CHECKPOINTS = 25;
/** A trip can last up to two days. */
const MAX_OFFSET_SECONDS = 48 * 3600;

/**
 * POST /api/departure-windows
 * body: DepartureWindowsRequest { checkpoints: { lat, lon, offsetSeconds }[], start, count, stepMinutes }
 * -> { data: DepartureWindow[] } - weather at each checkpoint for each departure (demo data in mock mode)
 */
export const POST = handle(async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  const parsed = parseBody(body);
  return jsonData(isMockMode() ? mockDepartureWindows(parsed) : await getDepartureWindows(parsed));
});

export const ALL = methodNotAllowed(['POST']);

function parseBody(body: unknown): DepartureWindowsRequest {
  if (typeof body !== 'object' || body === null) throw badRequest('Request body must be a JSON object.');
  const { checkpoints, start, count, stepMinutes } = body as Record<string, unknown>;

  if (!Array.isArray(checkpoints) || checkpoints.length < 2 || checkpoints.length > MAX_CHECKPOINTS) {
    throw badRequest(`"checkpoints" must be an array of 2..${MAX_CHECKPOINTS} points.`);
  }
  const parsedCheckpoints = checkpoints.map((c, i) => {
    if (!isValidLatLon(c)) throw badRequest(`"checkpoints[${i}]" must have lat and lon in valid ranges.`);
    const offset = parseNumberInRange(
      (c as { offsetSeconds?: unknown }).offsetSeconds,
      `checkpoints[${i}].offsetSeconds`,
      0,
      MAX_OFFSET_SECONDS,
    );
    return { lat: c.lat, lon: c.lon, offsetSeconds: offset };
  });

  const first = optionalDeparture(start, 'start');
  if (!first) throw badRequest('"start" is required.');
  return {
    checkpoints: parsedCheckpoints,
    start: first.toISOString(),
    count: parseNumberInRange(count, 'count', 1, 36, { integer: true }),
    stepMinutes: parseNumberInRange(stepMinutes, 'stepMinutes', 15, 180, { integer: true }),
  };
}
