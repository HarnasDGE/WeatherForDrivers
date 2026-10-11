import { formatDistanceKm, formatDuration } from '@/lib/shared/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFavoriteRoute, selectFavoriteRoutes, selectRouteStatus, selectRouteWeatherStatus } from '@/store/slices/routeSlice';
import { loadFavoriteRoute } from '@/store/thunks';
import '@/styles/route.css';

export default function FavoriteRoutes() {
  const dispatch = useAppDispatch();
  const favorites = useAppSelector(selectFavoriteRoutes);
  const routeStatus = useAppSelector(selectRouteStatus);
  const weatherStatus = useAppSelector(selectRouteWeatherStatus);
  const busy = routeStatus === 'loading' || weatherStatus === 'loading';

  return (
    <div className="favorites favorite-routes">
      <div className="controls-bar">Favorite Routes</div>
      {favorites.length === 0 ? (
        <span className="favorite-routes-empty">You don&apos;t have any routes in favorites!</span>
      ) : (
        <div className="listOfPlaces">
          <ul>
            {favorites.map((favorite, index) => (
              <li
                key={`${favorite.from.name}-${favorite.to.name}-${favorite.routeType}-${favorite.savedAt}`}
                className="favorite-route"
                role="button"
                tabIndex={0}
                aria-disabled={busy}
                title="Load this route"
                onClick={() => {
                  if (!busy) void dispatch(loadFavoriteRoute(favorite));
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                    e.preventDefault();
                    if (!busy) void dispatch(loadFavoriteRoute(favorite));
                  }
                }}
              >
                <div className="favRoute-item">
                  <div className="favRoute-icon">
                    <span className="material-symbols-outlined">pin_drop</span>
                  </div>
                  <div className="favRoute-details">
                    <span className="favRoute-name">
                      {favorite.from.name} - {favorite.to.name}
                    </span>
                    <span className="favRoute-options">
                      <span className="favRoute-option-name">KM:</span>
                      <span className="favRoute-option-value">
                        {formatDistanceKm(favorite.summary.lengthInMeters).replace(' km', '')}
                      </span>
                      <span className="favRoute-option-name">TIME:</span>
                      <span className="favRoute-option-value">{formatDuration(favorite.summary.travelTimeInSeconds)}</span>
                      <span className="favRoute-option-name">TYPE:</span>
                      <span className="favRoute-option-value">{favorite.routeType}</span>
                    </span>
                  </div>
                </div>
                <div className="favRoute-buttons">
                  <button
                    type="button"
                    className="control"
                    aria-label={`Remove ${favorite.from.name} - ${favorite.to.name} from favorites`}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(removeFavoriteRoute(index));
                    }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
