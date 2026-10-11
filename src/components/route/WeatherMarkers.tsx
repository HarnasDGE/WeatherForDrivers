import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { RouteWeatherPoint } from '@/lib/shared/types';
import { calculateTimeAtRoute, formatTemperature } from '@/lib/shared/format';
import { getIconLink } from '@/lib/shared/weather-icons';
import { escapeHtml } from '../maps/leafletSetup';

interface WeatherMarkersProps {
  points: RouteWeatherPoint[];
  /** Markers are drawn only when true. */
  visible: boolean;
}

const LARGE_ZOOM_FROM = 8;

/** Weather icons at the control points of the main route; large (with text) when zoomed in. */
export default function WeatherMarkers({ points, visible }: WeatherMarkersProps) {
  const map = useMap();

  useEffect(() => {
    if (!visible || points.length === 0) return;

    const entries = points.map((point) => {
      const iconUrl = getIconLink(point.weatherCode, point.isDay);
      const large = L.divIcon({
        className: 'custom-icon',
        html: `
          <div class="custom-icon-container">
            <img src="${iconUrl}" alt="Weather icon" style="width: 50px; height: 50px;">
            <div class="custom-icon-text">
              <h2>${escapeHtml(point.name)} [${calculateTimeAtRoute(point.travelTimeInSeconds)}]</h2>
              <p>${formatTemperature(point.temperature)}</p>
            </div>
          </div>`,
        iconSize: [35, 35],
        iconAnchor: [17, 35],
        popupAnchor: [0, -35],
      });
      const small = L.divIcon({
        className: 'custom-icon',
        html: `
          <div class="custom-icon-container-small">
            <img src="${iconUrl}" alt="Weather icon" style="width: 50px; height: 50px;">
          </div>`,
        iconSize: [15, 15],
        iconAnchor: [17, 35],
        popupAnchor: [0, -35],
      });
      const marker = L.marker([point.lat, point.lon], { icon: map.getZoom() >= LARGE_ZOOM_FROM ? large : small }).addTo(
        map,
      );
      return { marker, large, small };
    });

    const updateIcons = () => {
      const isLarge = map.getZoom() >= LARGE_ZOOM_FROM;
      entries.forEach(({ marker, large, small }) => marker.setIcon(isLarge ? large : small));
    };
    map.on('zoomend', updateIcons);

    return () => {
      map.off('zoomend', updateIcons);
      entries.forEach(({ marker }) => marker.remove());
    };
  }, [points, visible, map]);

  return null;
}
