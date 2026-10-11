import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Keeps Leaflet in sync when its container changes size (tabs, responsive layout). */
export default function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}
