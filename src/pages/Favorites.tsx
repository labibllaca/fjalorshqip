import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites, type FavoriteItem } from '../lib/storage';

const Favorites = () => {
  const [favs, setFavs] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setFavs(getFavorites());
  }, []);

  return (
    <div>
      <h2>Të preferuarat</h2>
      {favs.length === 0 ? (
        <p>Nuk ka të preferuara ende.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {favs.map(f => (
            <li key={f.slug} style={{ marginBottom: 8 }}>
              <Link to={`/f/${f.slug}`} viewTransition>{f.term}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Favorites;
