import { Pane, TileLayer } from 'react-leaflet';
import type { RadarFrame } from '@/lib/shared/types';

/** Rain radar tiles between the basemap and the routes; they never catch taps. */
export default function RadarLayer({ frame }: { frame: RadarFrame }) {
  return (
    <Pane name="radar" style={{ zIndex: 250, pointerEvents: 'none' }}>
      <TileLayer
        key={frame.tileUrl}
        url={frame.tileUrl}
        attribution={frame.attribution}
        maxNativeZoom={frame.maxZoom}
        opacity={0.65}
      />
    </Pane>
  );
}
