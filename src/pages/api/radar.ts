import { handle, jsonData, methodNotAllowed } from '@/lib/server/api';
import { getLatestRadarFrame } from '@/lib/server/services/rainviewer';

/** GET /api/radar -> { data: RadarFrame } - latest rain radar frame (keyless RainViewer, also in mock mode). */
export const GET = handle(async () => jsonData(await getLatestRadarFrame(), { cacheSeconds: 300 }));

export const ALL = methodNotAllowed(['GET']);
