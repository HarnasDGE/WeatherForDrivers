import { useEffect, useMemo, useState } from 'react';
import DriveMap from '@/components/map/DriveMap';
import BottomSheet, { snapHeight } from '@/components/ui/BottomSheet';
import type { SheetSnap } from '@/components/ui/BottomSheet';
import RadarToggle from '@/components/map/RadarToggle';
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useRadar } from '@/hooks/useRadar';
import type { PlaceInput } from '@/lib/client/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  changeMainRoute,
  focusCheckpoint,
  selectFocusedCheckpoint,
  selectFocusSeq,
  selectFocusSource,
  selectRouteData,
  selectRouteError,
  selectRouteStatus,
  selectRouteWeather,
} from '@/store/slices/routeSlice';
import type { FavoriteRoute } from '@/store/slices/routeSlice';
import { showNotification } from '@/store/slices/notificationsSlice';
import { selectRadar, setRadar } from '@/store/slices/uiSlice';
import { fetchRouteWithWeather, loadFavoriteRoute } from '@/store/thunks';
import DriveHome from './DriveHome';
import { RoadTimelineLoading } from './RoadTimeline';
import TripBar from './TripBar';
import TripDetails from './TripDetails';
import TripPlanner from './TripPlanner';
import styles from './DriveScreen.module.css';

/** Height of the floating trip bar area on phones, px (kept clear when fitting a route). */
const TRIP_BAR_SPACE = 92;

/** "Drive" tab: full-screen map, trip bar on top, route and road weather in the sheet. */
export default function DriveScreen({ demo }: { demo: boolean }) {
  const dispatch = useAppDispatch();
  const routeData = useAppSelector(selectRouteData);
  const routeWeather = useAppSelector(selectRouteWeather);
  const routeStatus = useAppSelector(selectRouteStatus);
  const error = useAppSelector(selectRouteError);
  const focusedCheckpoint = useAppSelector(selectFocusedCheckpoint);
  const focusSeq = useAppSelector(selectFocusSeq);
  const focusSource = useAppSelector(selectFocusSource);
  const radarOn = useAppSelector(selectRadar);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const radar = useRadar(radarOn);

  const [plannerOpen, setPlannerOpen] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>(routeData ? 'half' : 'peek');

  // A new route opens the sheet halfway: the verdict and options are visible, the map still shows the road.
  useEffect(() => {
    if (routeStatus === 'loading' || routeStatus === 'succeeded') setSnap('half');
  }, [routeStatus]);

  // Let the user know once when the radar cannot be loaded.
  useEffect(() => {
    if (radar.status === 'failed') dispatch(showNotification('Rain radar is unavailable right now.', 'error'));
  }, [radar.status, dispatch]);

  // Focusing a checkpoint keeps the map visible: a full sheet drops to half (list tap), a peeking one opens (map tap).
  useEffect(() => {
    if (focusSeq === 0 || desktop) return;
    setSnap((current) =>
      focusSource === 'timeline' ? (current === 'full' ? 'half' : current) : current === 'peek' ? 'half' : current,
    );
  }, [focusSeq, focusSource, desktop]);

  const insets = useMemo(
    () =>
      desktop ? { top: 0, bottom: 0 } : { top: TRIP_BAR_SPACE, bottom: snapHeight('half', window.innerHeight - 64) },
    [desktop],
  );

  const check = (from: PlaceInput, to: PlaceInput) => {
    setPlannerOpen(false);
    void dispatch(fetchRouteWithWeather(from, to));
  };

  const pickSaved = (favorite: FavoriteRoute) => {
    setPlannerOpen(false);
    void dispatch(loadFavoriteRoute(favorite));
  };

  const content =
    routeStatus === 'loading' ? (
      <RoadTimelineLoading label="Finding your route" />
    ) : routeStatus === 'failed' && !routeData ? (
      <div className={styles.problem} role="alert">
        <p>{error}</p>
        <button type="button" className={styles.retry} onClick={() => setPlannerOpen(true)}>
          Change route
        </button>
      </div>
    ) : routeData ? (
      <TripDetails routeData={routeData} routeWeather={routeWeather} demo={demo} />
    ) : (
      <DriveHome onPlan={() => setPlannerOpen(true)} onPickSaved={pickSaved} />
    );

  return (
    <div className={styles.drive}>
      <div className={styles.map}>
        <DriveMap
          routes={routeData?.routes ?? []}
          weather={routeWeather}
          insets={insets}
          onSelectRoute={(index) => dispatch(changeMainRoute(index))}
          radar={radarOn ? radar.frame : null}
          focusedCheckpoint={focusedCheckpoint}
          focusSeq={focusSeq}
          onSelectCheckpoint={(index) => dispatch(focusCheckpoint({ index, source: 'map' }))}
          onClearFocus={() => dispatch(focusCheckpoint(null))}
        />
      </div>
      <div className={styles.tools}>
        <RadarToggle
          on={radarOn}
          frame={radar.frame}
          status={radar.status}
          onToggle={() => dispatch(setRadar(!radarOn))}
        />
      </div>
      <div className={styles.top}>
        <TripBar routeData={routeData} demo={demo} onEdit={() => setPlannerOpen(true)} />
      </div>
      <BottomSheet snap={snap} onSnapChange={setSnap} label="Trip">
        {content}
      </BottomSheet>
      {plannerOpen && <TripPlanner onClose={() => setPlannerOpen(false)} onSubmit={check} onPickSaved={pickSaved} />}
    </div>
  );
}
