import L from 'leaflet';
import markerIcon from '@/assets/map/marker-icon.png';
import markerIcon2x from '@/assets/map/marker-icon-2x.png';
import markerShadow from '@/assets/map/marker-shadow.png';
import startPointImage from '@/assets/map/startpoint.png';
import endPointImage from '@/assets/map/endpoint.png';

/**
 * Leaflet resolves its default marker images relative to the CSS file, which breaks under a bundler.
 * Point the defaults at bundled assets instead (idempotent, module-level).
 */
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

export const startPointIcon = L.icon({
  iconUrl: startPointImage.src,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export const endPointIcon = L.icon({
  iconUrl: endPointImage.src,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export const DEFAULT_CENTER: [number, number] = [50.0619474, 19.9368564];
export const DEFAULT_ZOOM = 4;

export const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
