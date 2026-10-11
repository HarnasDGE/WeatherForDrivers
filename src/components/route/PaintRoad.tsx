import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Route } from '@/lib/shared/types';
import { formatDuration } from '@/lib/shared/format';
import { endPointIcon, startPointIcon } from '../maps/leafletSetup';

interface PaintRoadProps {
  /** routes[0] is the main route. */
  routes: Route[];
  onSelectRoute: (index: number) => void;
}

const MAIN_COLOR = 'rgba(80, 160, 222, 1)';
const ALT_COLOR = 'rgba(128, 128, 128, 1)';
const HOVER_COLOR = 'rgba(100, 180, 242, 1)';

const timeIcon = (className: string, text: string) =>
  L.divIcon({ className, html: `<p>${text}</p>`, iconSize: undefined, iconAnchor: [-10, 0] });

/** Draws routes (polylines, time badges, start/end markers) on the surrounding react-leaflet map. */
export default function PaintRoad({ routes, onSelectRoute }: PaintRoadProps) {
  const map = useMap();
  // Always call the latest callback without re-drawing the layers.
  const onSelectRef = useRef(onSelectRoute);
  onSelectRef.current = onSelectRoute;
  const fittedKey = useRef<string | null>(null);

  useEffect(() => {
    const main = routes[0];
    if (!main || main.points.length === 0) return;

    const group = L.layerGroup().addTo(map);

    routes.forEach((route, index) => {
      if (route.points.length === 0) return;
      const isMain = index === 0;
      const baseColor = isMain ? MAIN_COLOR : ALT_COLOR;
      const diff = route.summary.travelTimeInSeconds - main.summary.travelTimeInSeconds;
      const text = isMain
        ? formatDuration(route.summary.travelTimeInSeconds)
        : `${diff > 0 ? 'Slower' : 'Faster'} by ${formatDuration(Math.abs(diff))}`;
      const baseClass = isMain ? 'mainRouteTimeInfo' : 'routeTimeInfo';

      const line = L.polyline(
        route.points.map((p) => [p.lat, p.lon] as L.LatLngTuple),
        { weight: 5, className: isMain ? 'mainRoadLine' : 'alternativeRoutes', color: baseColor },
      ).addTo(group);

      const mid = route.points[Math.floor(route.points.length / 2)];
      const badge = L.marker([mid.lat, mid.lon], { icon: timeIcon(baseClass, text), interactive: false }).addTo(group);

      line.on('click', () => onSelectRef.current(index));
      line.on('mouseover', () => {
        line.setStyle({ color: HOVER_COLOR });
        badge.setIcon(timeIcon(`${baseClass} ${baseClass}-hover`, text));
      });
      line.on('mouseout', () => {
        line.setStyle({ color: baseColor });
        badge.setIcon(timeIcon(baseClass, text));
      });
    });

    // Main route on top.
    group.eachLayer((layer) => {
      if (layer instanceof L.Polyline && layer.options.className === 'mainRoadLine') layer.bringToFront();
    });

    const first = main.points[0];
    const last = main.points[main.points.length - 1];
    L.marker([first.lat, first.lon], { icon: startPointIcon, title: 'Start' }).addTo(group);
    L.marker([last.lat, last.lon], { icon: endPointIcon, title: 'Destination' }).addTo(group);

    // Fit the view only for a new journey, not when the user swaps to an alternative.
    const key = `${first.lat},${first.lon}->${last.lat},${last.lon}`;
    if (fittedKey.current !== key) {
      fittedKey.current = key;
      const bounds = L.latLngBounds(main.points.map((p) => [p.lat, p.lon] as L.LatLngTuple));
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      group.remove();
    };
  }, [routes, map]);

  return null;
}
