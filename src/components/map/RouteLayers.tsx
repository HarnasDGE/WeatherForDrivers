import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLon, Route, RouteWeatherPoint } from '@/lib/shared/types';
import { formatDuration } from '@/lib/shared/format';
import { assessRoad } from '@/lib/shared/road-conditions';
import type { RoadLevel } from '@/lib/shared/road-conditions';
import type { MapInsets } from './mapConfig';

interface RouteLayersProps {
  /** routes[0] is the main route. */
  routes: Route[];
  /** Checkpoints of the main route (their coordinates are points of the route geometry). */
  mainWeather: RouteWeatherPoint[];
  insets: MapInsets;
  onSelectRoute: (index: number) => void;
}

const RANK: Record<RoadLevel, number> = { unknown: 0, good: 1, caution: 2, danger: 3 };
const toLatLng = (p: LatLon) => [p.lat, p.lon] as L.LatLngTuple;
const key = (p: LatLon) => `${p.lat},${p.lon}`;

/** Main-route stretches between checkpoints, tagged with the worse condition of their two ends. */
function hazardStretches(route: Route, checkpoints: RouteWeatherPoint[]) {
  const indexByKey = new Map(route.points.map((p, i) => [key(p), i]));
  const located = checkpoints
    .map((cp) => ({ index: indexByKey.get(key(cp)), level: assessRoad(cp).level }))
    .filter((cp): cp is { index: number; level: RoadLevel } => cp.index !== undefined);
  const stretches: Array<{ points: LatLon[]; level: RoadLevel }> = [];
  for (let i = 1; i < located.length; i++) {
    const a = located[i - 1];
    const b = located[i];
    const level = RANK[a.level] >= RANK[b.level] ? a.level : b.level;
    if (level === 'caution' || level === 'danger') {
      stretches.push({ points: route.points.slice(a.index, b.index + 1), level });
    }
  }
  return stretches;
}

const pinIcon = (variant: 'start' | 'end') =>
  L.divIcon({ className: `trip-pin trip-pin--${variant}`, iconSize: [18, 18], iconAnchor: [9, 9] });

/**
 * Draws the routes as roads: alternatives in grey (tap to switch), the main route as asphalt with a dashed
 * centre line, and an amber/red edge where the weather makes the road worse.
 */
export default function RouteLayers({ routes, mainWeather, insets, onSelectRoute }: RouteLayersProps) {
  const map = useMap();
  // Always call the latest callback / insets without re-drawing the layers.
  const onSelectRef = useRef(onSelectRoute);
  onSelectRef.current = onSelectRoute;
  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  const fittedKey = useRef<string | null>(null);

  useEffect(() => {
    const main = routes[0];
    if (!main || main.points.length === 0) return;
    const group = L.layerGroup().addTo(map);

    routes.slice(1).forEach((route, offset) => {
      if (route.points.length === 0) return;
      const index = offset + 1;
      const line = L.polyline(route.points.map(toLatLng), { className: 'route-alt', weight: 7 }).addTo(group);
      line.on('click', () => onSelectRef.current(index));
      const diff = route.summary.travelTimeInSeconds - main.summary.travelTimeInSeconds;
      const text = diff === 0 ? 'Same time' : `${diff > 0 ? '+' : '−'}${formatDuration(Math.abs(diff))}`;
      // Spread the badges along their routes so they do not stack where the alternatives run close.
      const mid = route.points[Math.floor(route.points.length * (index === 1 ? 0.35 : 0.65))];
      const badge = L.marker(toLatLng(mid), {
        icon: L.divIcon({ className: 'route-badge', html: `<span>${text}</span>`, iconSize: undefined }),
        keyboard: false,
      }).addTo(group);
      badge.on('click', () => onSelectRef.current(index));
    });

    for (const stretch of hazardStretches(main, mainWeather)) {
      L.polyline(stretch.points.map(toLatLng), {
        className: `route-edge route-edge--${stretch.level}`,
        weight: 16,
        interactive: false,
      }).addTo(group);
    }
    L.polyline(main.points.map(toLatLng), { className: 'route-main', weight: 8, interactive: false }).addTo(group);
    L.polyline(main.points.map(toLatLng), {
      className: 'route-dash',
      weight: 2,
      dashArray: '7 9',
      interactive: false,
    }).addTo(group);

    L.marker(toLatLng(main.points[0]), { icon: pinIcon('start'), title: 'Start', keyboard: false }).addTo(group);
    L.marker(toLatLng(main.points[main.points.length - 1]), {
      icon: pinIcon('end'),
      title: 'Destination',
      keyboard: false,
    }).addTo(group);

    // Fit the view only for a new journey, not when the user switches to an alternative.
    const first = main.points[0];
    const last = main.points[main.points.length - 1];
    const journey = `${key(first)}->${key(last)}`;
    if (fittedKey.current !== journey) {
      fittedKey.current = journey;
      const bounds = L.latLngBounds(routes.flatMap((r) => r.points.map(toLatLng)));
      const { top, bottom } = insetsRef.current;
      map.fitBounds(bounds, { paddingTopLeft: [32, top + 24], paddingBottomRight: [32, bottom + 24] });
    }

    return () => {
      group.remove();
    };
  }, [routes, mainWeather, map]);

  return null;
}
