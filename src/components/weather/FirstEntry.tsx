import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectWeatherStatus } from '@/store/slices/weatherSlice';
import { searchPlace } from '@/store/thunks';

export default function FirstEntry() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectWeatherStatus);
  const [query, setQuery] = useState('');
  const loading = status === 'loading';

  const onSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void dispatch(searchPlace(query));
  };

  return (
    <div id="content" className="hello-form">
      <h2 className="gradient-text">Hello in Weather App.</h2>
      <p>
        Search for weather information from anywhere in the world! Also use the weather information search function
        for travelers
      </p>
      <form className="search-row" onSubmit={onSubmit}>
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter place..."
          aria-label="Place"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  );
}
