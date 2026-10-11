import { useEffect, useState } from 'react';
import { fetchRadar } from '@/lib/client/api';
import type { RadarFrame } from '@/lib/shared/types';

const REFRESH_MS = 5 * 60_000;

export type RadarStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** Latest radar frame while `enabled` (re-checked every 5 minutes; the frame is kept if a refresh fails). */
export function useRadar(enabled: boolean): { frame: RadarFrame | null; status: RadarStatus } {
  const [frame, setFrame] = useState<RadarFrame | null>(null);
  const [status, setStatus] = useState<RadarStatus>('idle');

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    const load = () => {
      fetchRadar()
        .then((next) => {
          if (cancelled) return;
          setFrame((current) => (current?.tileUrl === next.tileUrl ? current : next));
          setStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setStatus((current) => (current === 'ready' ? current : 'failed'));
        });
    };
    setStatus((current) => (current === 'ready' ? current : 'loading'));
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return { frame, status };
}
