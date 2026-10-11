import { MapContainer, Pane, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { RadarFrame, Route, RouteWeather } from '@/lib/shared/types';
import { useResolvedTheme } from '@/hooks/useTheme';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAX_ZOOM, TILES, TILE_ATTRIBUTION } from './mapConfig';
import type { MapInsets } from './mapConfig';
import MapResizeFix from './MapResizeFix';
import RadarLayer from './RadarLayer';
import RouteLayers from './RouteLayers';
import CheckpointMarkers from './CheckpointMarkers';
import './map.css';

interface DriveMapProps {
  /** routes[0] is the main route. */
  routes: Route[];
  /** Index-aligned with `routes` (may be empty while loading). */
  weather: RouteWeather[];
  insets: MapInsets;
  onSelectRoute: (index: number) => void;
  /** Rain radar frame to draw under the routes (null = radar off). */
  radar: RadarFrame | null;
  focusedCheckpoint: number | null;
  focusSeq: number;
  onSelectCheckpoint: (index: number) => void;
  onClearFocus: () => void;
}

export default function DriveMap({
  routes,
  weather,
  insets,
  onSelectRoute,
  radar,
  focusedCheckpoint,
  focusSeq,
  onSelectCheckpoint,
  onClearFocus,
}: DriveMapProps) {
  const dark = useResolvedTheme() === 'dark';
  const mainWeather = weather[0]?.points ?? [];
  const tiles = dark ? TILES.dark : TILES.light;

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      attributionControl
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer key={tiles.base} url={tiles.base} attribution={TILE_ATTRIBUTION} maxNativeZoom={MAX_ZOOM} />
      {radar && <RadarLayer frame={radar} />}
      {/* Place names above the routes, but never catching taps. */}
      <Pane name="labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
        <TileLayer key={tiles.labels} url={tiles.labels} maxNativeZoom={MAX_ZOOM} />
      </Pane>
      <RouteLayers routes={routes} mainWeather={mainWeather} insets={insets} onSelectRoute={onSelectRoute} />
      <CheckpointMarkers
        points={mainWeather}
        insets={insets}
        focused={focusedCheckpoint}
        focusSeq={focusSeq}
        onSelect={onSelectCheckpoint}
        onClearFocus={onClearFocus}
      />
      <MapResizeFix />
    </MapContainer>
  );
}
