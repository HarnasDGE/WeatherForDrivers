import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { RouteWeatherPoint } from '@/lib/shared/types';
import { formatTemperature } from '@/lib/shared/format';
import { assessRoad } from '@/lib/shared/road-conditions';
import type { RoadLevel } from '@/lib/shared/road-conditions';
import { getWeatherSymbol } from '@/lib/shared/weather-icons';
import { escapeHtml } from './mapConfig';
import type { MapInsets } from './mapConfig';

/** Below this zoom only the checkpoints with a warning are shown, so a long route does not turn into a wall of signs. */
const ALL_SIGNS_FROM_ZOOM = 8;
/** Signs closer than this on screen (px) would overlap - the less severe one is hidden. */
const MIN_SIGN_DISTANCE = 64;

const SEVERITY: Record<RoadLevel, number> = { danger: 0, caution: 1, good: 2, unknown: 3 };

/** Zoom used when a checkpoint is brought into view (closer zooms are kept). */
const FOCUS_ZOOM = 9;

interface CheckpointMarkersProps {
  points: RouteWeatherPoint[];
  insets: MapInsets;
  /** Index in `points` of the checkpoint to bring into view and highlight. */
  focused: number | null;
  /** Changes on every focus request, so asking for the same checkpoint again pans back to it. */
  focusSeq: number;
  onSelect: (index: number) => void;
  onClearFocus: () => void;
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Road-sign plates at the checkpoints of the main route: weather icon + temperature, edged by road condition.
 * Tapping a sign focuses its checkpoint; a focused checkpoint is highlighted, always shown and panned into the
 * part of the map that is not covered by the trip bar or the sheet.
 */
export default function CheckpointMarkers({
  points,
  insets,
  focused,
  focusSeq,
  onSelect,
  onClearFocus,
}: CheckpointMarkersProps) {
  const map = useMap();
  // Latest callbacks / insets without rebuilding the signs.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onClearRef = useRef(onClearFocus);
  onClearRef.current = onClearFocus;
  const insetsRef = useRef(insets);
  insetsRef.current = insets;

  useEffect(() => {
    if (points.length === 0) return;
    const group = L.layerGroup().addTo(map);
    const entries = points.slice(1).map((point, offset) => {
      const index = offset + 1;
      const isFocused = index === focused;
      const condition = assessRoad(point);
      const icon = L.divIcon({
        className: isFocused ? 'sign sign--focused' : 'sign',
        html: `<div class="sign__plate" data-level="${condition.level}" data-night="${point.isDay === false}" title="${escapeHtml(condition.label)}">
            <span class="icon" aria-hidden="true">${getWeatherSymbol(point.weatherCode, point.isDay)}</span>
            <b>${formatTemperature(point.temperature)}</b>
          </div>`,
        iconSize: undefined,
      });
      const marker = L.marker([point.lat, point.lon], {
        icon,
        keyboard: true,
        zIndexOffset: isFocused ? 1000 : 0,
        title: `${formatTemperature(point.temperature)}, ${condition.label}. Show in the list`,
      });
      marker.on('add', () => {
        const element = marker.getElement();
        element?.setAttribute('role', 'button');
        element?.setAttribute('aria-pressed', String(isFocused));
      });
      marker.on('click', () => onSelectRef.current(index));
      return { marker, level: condition.level, isFocused };
    });
    // Worst conditions claim their spot first.
    // The focused sign comes first and is always shown.
    const bySeverity = [...entries].sort(
      (a, b) => Number(b.isFocused) - Number(a.isFocused) || SEVERITY[a.level] - SEVERITY[b.level],
    );

    const update = () => {
      const showAll = map.getZoom() >= ALL_SIGNS_FROM_ZOOM;
      const placed: L.Point[] = [];
      for (const { marker, level, isFocused } of bySeverity) {
        const position = map.latLngToContainerPoint(marker.getLatLng());
        const wanted = isFocused || showAll || level === 'caution' || level === 'danger';
        const free = isFocused || placed.every((p) => p.distanceTo(position) >= MIN_SIGN_DISTANCE);
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
    const clear = () => onClearRef.current();
    map.on('click', clear);
    return () => {
      map.off('zoomend', update);
      map.off('click', clear);
      group.remove();
    };
  }, [points, focused, map]);

  // Bring the focused checkpoint into the free part of the map (between the trip bar and the sheet).
  useEffect(() => {
    const point = focused !== null ? points[focused] : undefined;
    if (!point) return;
    const zoom = Math.max(map.getZoom(), FOCUS_ZOOM);
    const size = map.getSize();
    const { top, bottom } = insetsRef.current;
    // The sign stands above its point, so the point sits a little below the middle of the free area.
    const wanted = L.point(size.x / 2, top + (size.y - top - bottom) / 2 + 20);
    const target = map.project([point.lat, point.lon], zoom).subtract(wanted.subtract(size.divideBy(2)));
    map.setView(map.unproject(target, zoom), zoom, { animate: !prefersReducedMotion() });
  }, [focused, focusSeq, points, map]);

  return null;
}
