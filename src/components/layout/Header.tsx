import { useState } from 'react';
import logo from '@/assets/logoweather.png';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { changeContent, CONTENT_TABS, selectContent, selectWeatherStatus } from '@/store/slices/weatherSlice';
import { searchPlace } from '@/store/thunks';

const TAB_LABELS: Record<(typeof CONTENT_TABS)[number], string> = {
  'Main Info': 'Main',
  Maps: 'Maps',
  'Along The Road': 'Along The Road',
};

/** Interactive header (search + tabs) - lives inside the React island because it talks to the store. */
export default function Header() {
  const dispatch = useAppDispatch();
  const content = useAppSelector(selectContent);
  const status = useAppSelector(selectWeatherStatus);
  const [query, setQuery] = useState('');

  const onSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void dispatch(searchPlace(query)).then((ok) => {
      if (ok) setQuery('');
    });
  };

  return (
    <header>
      <div id="main-header-line">
        <div id="logo-app">
          <img src={logo.src} alt="Logo" />
          <div className="pageTitle gradient-text">Weather App</div>
        </div>
        <form id="search-container" onSubmit={onSubmit} role="search">
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter place..."
            aria-label="Place"
          />
          <button
            type="submit"
            className="buttons-menu"
            id="search-submit"
            aria-label="Search"
            disabled={status === 'loading'}
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        </form>
      </div>
      <div id="second-header-line">
        <ul className="header-menu">
          {CONTENT_TABS.map((tab) => (
            <li
              key={tab}
              className={tab === content ? 'active' : undefined}
              onClick={() => dispatch(changeContent(tab))}
            >
              {TAB_LABELS[tab]}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
