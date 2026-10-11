import { useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route, RouteWeatherPoint } from '@/lib/shared/types';
import { useAppDispatch } from '@/store/hooks';
import { changeMainRoute } from '@/store/slices/routeSlice';
import '@/styles/route.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, OSM_ATTRIBUTION, OSM_URL } from '../maps/leafletSetup';
import MapResizeFix from '../maps/MapResizeFix';
import PaintRoad from './PaintRoad';
import WeatherMarkers from './WeatherMarkers';

interface RouteMapProps {
  routes: Route[];
  /** Weather at control points of the main route. */
  weatherPoints: RouteWeatherPoint[];
  showTemperature: boolean;
  showAlternatives: boolean;
}

export default function RouteMap({ routes, weatherPoints, showTemperature, showAlternatives }: RouteMapProps) {
  const dispatch = useAppDispatch();
  const visibleRoutes = useMemo(() => (showAlternatives ? routes : routes.slice(0, 1)), [routes, showAlternatives]);

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
      <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
      <PaintRoad routes={visibleRoutes} onSelectRoute={(index) => dispatch(changeMainRoute(index))} />
      <WeatherMarkers points={weatherPoints} visible={showTemperature} />
      <MapResizeFix />
    </MapContainer>
  );
}
