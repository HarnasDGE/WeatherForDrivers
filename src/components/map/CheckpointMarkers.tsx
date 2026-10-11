import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { RouteWeatherPoint } from '@/lib/shared/types';
import { formatTemperature } from '@/lib/shared/format';
import { assessRoad } from '@/lib/shared/road-conditions';
import type { RoadLevel } from '@/lib/shared/road-conditions';
import { getWeatherSymbol } from '@/lib/shared/weather-icons';
import { escapeHtml } from './mapConfig';

/** Below this zoom only the checkpoints with a warning are shown, so a long route does not turn into a wall of signs. */
const ALL_SIGNS_FROM_ZOOM = 8;
/** Signs closer than this on screen (px) would overlap - the less severe one is hidden. */
const MIN_SIGN_DISTANCE = 64;

const SEVERITY: Record<RoadLevel, number> = { danger: 0, caution: 1, good: 2, unknown: 3 };

/** Road-sign plates at the checkpoints of the main route: weather icon + temperature, edged by road condition. */
export default function CheckpointMarkers({ points }: { points: RouteWeatherPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const group = L.layerGroup().addTo(map);
    const entries = points.slice(1).map((point) => {
      const condition = assessRoad(point);
      const icon = L.divIcon({
        className: 'sign',
        html: `<div class="sign__plate" data-level="${condition.level}" title="${escapeHtml(condition.label)}">
            <span class="icon" aria-hidden="true">${getWeatherSymbol(point.weatherCode, point.isDay)}</span>
            <b>${formatTemperature(point.temperature)}</b>
          </div>`,
        iconSize: undefined,
      });
      const marker = L.marker([point.lat, point.lon], { icon, keyboard: false, interactive: false });
      return { marker, level: condition.level };
    });
    // Worst conditions claim their spot first.
    const bySeverity = [...entries].sort((a, b) => SEVERITY[a.level] - SEVERITY[b.level]);

    const update = () => {
      const showAll = map.getZoom() >= ALL_SIGNS_FROM_ZOOM;
      const placed: L.Point[] = [];
      for (const { marker, level } of bySeverity) {
        const position = map.latLngToContainerPoint(marker.getLatLng());
        const wanted = showAll || level === 'caution' || level === 'danger';
        const free = placed.every((p) => p.distanceTo(position) >= MIN_SIGN_DISTANCE);
        if (wanted && free) {
          placed.push(position);
          group.addLayer(marker);
        } else {
          group.removeLayer(marker);
        }
      }
    };
    update();
    map.on('zoomend', update);
    return () => {
      map.off('zoomend', update);
      group.remove();
    };
  }, [points, map]);

  return null;
}
