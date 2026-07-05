import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites, type FavoriteItem } from '../lib/storage';

const Favorites = () => {
  const [favs, setFavs] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setFavs(getFavorites());
  }, []);

  return (
    <div className="fav-page">
      {favs.length === 0 ? (
        <p className="fav-empty">Nuk ke ndonjë fjalë të preferuar ende.</p>
      ) : (
        <ul className="fav-list">
          {favs.map(f => (
            <li key={f.slug} className="fav-item">
              <Link to={`/f/${f.slug}`} viewTransition>{f.term}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Favorites;
