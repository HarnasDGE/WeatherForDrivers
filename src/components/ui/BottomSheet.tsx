import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import styles from './BottomSheet.module.css';

export const SHEET_SNAPS = ['peek', 'half', 'full'] as const;
export type SheetSnap = (typeof SHEET_SNAPS)[number];

/** Visible sheet height in px for a snap, given the space between the top of the screen and the bottom nav. */
export function snapHeight(snap: SheetSnap, available: number): number {
  if (snap === 'peek') return Math.max(200, Math.round(available * 0.34));
  if (snap === 'half') return Math.round(available * 0.56);
  return available - 72;
}

const availableHeight = () => {
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;
  return window.innerHeight - nav;
};

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  label: string;
  children: ReactNode;
}

/**
 * Mobile: a sheet over the map that snaps between peek / half / full (drag the handle, or tap it to cycle).
 * Desktop: the same content as a static side panel (layout comes from the parent grid).
 */
export default function BottomSheet({ snap, onSnapChange, label, children }: BottomSheetProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [available, setAvailable] = useState(() => availableHeight());
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startHeight: number; lastY: number; lastT: number; velocity: number } | null>(
    null,
  );

  useEffect(() => {
    const onResize = () => setAvailable(availableHeight());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const height = dragHeight ?? snapHeight(snap, available);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (desktop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startHeight: height, lastY: event.clientY, lastT: event.timeStamp, velocity: 0 };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const dt = Math.max(1, event.timeStamp - state.lastT);
    state.velocity = (state.lastY - event.clientY) / dt; // px/ms, positive = upwards
    state.lastY = event.clientY;
    state.lastT = event.timeStamp;
    const next = state.startHeight + (state.startY - event.clientY);
    setDragHeight(Math.min(snapHeight('full', available), Math.max(120, next)));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    const moved = Math.abs(event.clientY - state.startY);
    setDragHeight(null);
    if (moved < 6) {
      // A tap cycles peek -> half -> full -> peek.
      onSnapChange(SHEET_SNAPS[(SHEET_SNAPS.indexOf(snap) + 1) % SHEET_SNAPS.length]);
      return;
    }
    // Project the release a little forward by velocity, then take the nearest snap.
    const projected = (dragHeight ?? height) + state.velocity * 180;
    const nearest = SHEET_SNAPS.reduce((best, candidate) =>
      Math.abs(snapHeight(candidate, available) - projected) < Math.abs(snapHeight(best, available) - projected)
        ? candidate
        : best,
    );
    onSnapChange(nearest);
  };

  return (
    <section
      className={styles.sheet}
      data-dragging={dragHeight !== null}
      style={desktop ? undefined : { height }}
      aria-label={label}
    >
      {!desktop && (
        <div
          className={styles.grip}
          role="button"
          tabIndex={0}
          aria-label={`Resize panel (now ${snap})`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setDragHeight(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSnapChange(SHEET_SNAPS[(SHEET_SNAPS.indexOf(snap) + 1) % SHEET_SNAPS.length]);
            }
          }}
        >
          <span className={styles.handle} />
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
