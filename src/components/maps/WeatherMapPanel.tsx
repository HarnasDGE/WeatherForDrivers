import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { weatherTileUrl } from '@/lib/client/api';
import type { WeatherMapLayer } from '@/lib/shared/types';
import '@/styles/route.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, OSM_ATTRIBUTION, OSM_URL } from './leafletSetup';
import MapResizeFix from './MapResizeFix';

const LAYERS: Array<{ id: WeatherMapLayer; label: string }> = [
  { id: 'clouds_new', label: 'Clouds Map' },
  { id: 'precipitation_new', label: 'Precipitation Map' },
  { id: 'pressure_new', label: 'Pressure Map' },
  { id: 'wind_new', label: 'Wind Map' },
  { id: 'temp_new', label: 'Temp Map' },
];

export default function WeatherMapPanel() {
  const [layer, setLayer] = useState<WeatherMapLayer>('clouds_new');

  return (
    <div id="content">
      <div className="controls-bar">
        <div className="title-container">Maps</div>
      </div>
      <div id="actual-map">
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
          {/* key: remounts the layer so the previous weather layer is removed */}
          <TileLayer
            key={layer}
            url={weatherTileUrl(layer)}
            attribution="Weather data &copy; OpenWeatherMap"
            maxNativeZoom={10}
          />
          <MapResizeFix />
        </MapContainer>
      </div>
      <div className="list-maps">
        <ul>
          {LAYERS.map((item) => (
            <li key={item.id}>
              <button type="button" aria-pressed={layer === item.id} onClick={() => setLayer(item.id)}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
