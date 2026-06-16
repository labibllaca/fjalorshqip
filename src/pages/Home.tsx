import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/searchbar/SearchBar';
import type { HistoryItem, FavoriteItem } from '../lib/storage';
import { getHistory, getFavorites } from '../lib/storage';

const Home = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setHistory(getHistory());
    setFavorites(getFavorites());
  }, []);

  return (
    <div className="home-page">
      <div className="search-area">
        <SearchBar />
      </div>
      {favorites.length > 0 && (
        <section className="home-section">
          <h3>Të preferuarat</h3>
          <ul>
            {favorites.map(f => (
              <li key={f.slug}>
                <Link to={`/f/${f.slug}`} viewTransition>{f.term}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {history.length > 0 && (
        <section className="home-section">
          <h3>Historiku</h3>
          <ul>
            {history.slice(0, 10).map(h => (
              <li key={h.slug}>
                <Link to={`/f/${h.slug}`} viewTransition>{h.term}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default Home;
