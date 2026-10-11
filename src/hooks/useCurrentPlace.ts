import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchReversePlace } from '@/lib/client/api';
import type { Place } from '@/lib/shared/types';
import { useAppDispatch } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationsSlice';

const LOCATION_OFF = 'Location is off. Allow it in the browser, or type where you start.';
const LOCATION_TIMEOUT_MS = 10_000;

/** Browser geolocation + reverse geocoding: `locate()` resolves to the user's Place, or null after a notification. */
export function useCurrentPlace() {
  const dispatch = useAppDispatch();
  const [supported, setSupported] = useState(false);
  const [locating, setLocating] = useState(false);
  const alive = useRef(true);

  // Checked after mount so server and first client render match.
  useEffect(() => {
    alive.current = true;
    setSupported(typeof navigator !== 'undefined' && 'geolocation' in navigator);
    return () => {
      alive.current = false;
    };
  }, []);

  const locate = useCallback(async (): Promise<Place | null> => {
    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: LOCATION_TIMEOUT_MS,
          maximumAge: 5 * 60_000,
        }),
      );
      const here = { lat: position.coords.latitude, lon: position.coords.longitude };
      // Naming is best effort: without a name the spot is still usable.
      return await fetchReversePlace(here).catch(() => ({
        name: 'Your location',
        ...here,
        countryCode: null,
        country: null,
        admin1: null,
      }));
    } catch {
      dispatch(showNotification(LOCATION_OFF, 'alert'));
      return null;
    } finally {
      if (alive.current) setLocating(false);
    }
  }, [dispatch]);

  return { supported, locating, locate };
}
