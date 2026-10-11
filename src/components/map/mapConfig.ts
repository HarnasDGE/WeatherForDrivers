/**
 * Esri Gray Canvas basemaps (no key) - muted so the route and the weather stand out.
 * Place names come as a separate reference layer drawn above the base.
 */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';

export const TILES = {
  light: { base: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, labels: `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}` },
  dark: { base: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, labels: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}` },
} as const;

/** The canvas basemaps have no tiles beyond this zoom. */
export const MAX_ZOOM = 16;

export const TILE_ATTRIBUTION = 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

/** Central Europe until a route is drawn. */
export const DEFAULT_CENTER: [number, number] = [51.9, 19.1];
export const DEFAULT_ZOOM = 6;

/** Space covered by floating UI (trip bar, sheet), in px - routes are fitted inside the rest. */
export interface MapInsets {
  top: number;
  bottom: number;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
