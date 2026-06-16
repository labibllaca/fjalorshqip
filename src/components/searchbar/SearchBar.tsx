import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './SearchBar.module.scss';
import { AnimatePresence, motion } from 'framer-motion';
import classNames from 'classnames';
import { useEntry } from '../../lib/entry-context';
import { isFavorite, toggleFavorite } from '../../lib/storage';
import { expandAttrs } from '../../lib/abbrev';

interface SearchResult {
  slug: string;
  term: string;
  attributes: string[];
}

declare global {
  interface Document {
    __fjalorshqip__: string;
  }
}

const random_string = () => {
  return Math.random().toString(36).substring(2, 8);
}

const push_query = async (query: string) => {
  try {
    if (!document.__fjalorshqip__) {
      document.__fjalorshqip__ = random_string();
    }
    if (typeof umami !== 'undefined' && umami?.track) {
      umami.track('search_v2', {q: query, rs: document.__fjalorshqip__});
    }
  } catch (e) {
    console.error('unexpected error', e);
  }
};

const MotionLink = motion(Link);

const SearchBar = () => {
  const [query, setQuery] = useState(() => {
    const savedQuery = localStorage.getItem('fj_last_search_query');
    return savedQuery || '';
  });
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const hasFocused = useRef(false);

  const { entry, crossRef, setCrossRef } = useEntry();
  const [fav, setFav] = useState(() => entry ? isFavorite(entry.slug) : false);
  const navigate = useNavigate();

  useEffect(() => {
    if (inputRef.current && !hasFocused.current) {
      inputRef.current.focus();
      hasFocused.current = true;
    }
  }, []);

  useEffect(() => {
    if (query) {
      localStorage.setItem('fj_last_search_query', query);
    }
  }, [query]);

  useEffect(() => {
    setFav(entry ? isFavorite(entry.slug) : false);
  }, [entry]);

  // Reset focus index when suggestions list updates
  useEffect(() => {
    setFocusedIndex(-1);
  }, [suggestions]);

  const focusInput = () => {
    inputRef?.current?.focus();
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResult[] = await res.json();
      setSuggestions(data.slice(0, 10));
      if (data.length > 0) push_query(q);
    } catch { setSuggestions([]); }
  }, []);

  useEffect(() => {
    if (!query) { setSuggestions([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 200);
    return () => clearTimeout(timerRef.current);
  }, [query, doSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[focusedIndex];
        navigate(`/f/${selected.slug}`, { viewTransition: true });
        setSuggestions([]);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  const closePopover = () => {
    try {
      const el = document.getElementById('search-menu-popover');
      if (el && 'hidePopover' in el) {
        (el as any).hidePopover();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <div
        className={classNames(styles.searchbar, {
          [styles.hasSuggestions]: suggestions.length !== 0,
        })}
        onClick={focusInput}
      >
        <input
          type="text"
          size={1}
          placeholder="Kërko"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls="search-suggestions"
          aria-haspopup="listbox"
          onKeyDown={handleKeyDown}
        />
        {query && (
          <span className={styles.clearButton} onClick={() => setQuery('')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        )}
        <button
          className={styles.menuButton}
          {...{ popovertarget: "search-menu-popover" }}
          aria-label="Më shumë opsione"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>
      <div
        id="search-suggestions"
        role="listbox"
        aria-label="Sugjerimet e kërkimit"
        className={styles.suggestions}
      >
        <AnimatePresence>
          {suggestions.map((suggestion, index) => (
            <MotionLink
              key={`${suggestion.slug}-${suggestion.attributes.join('-')}`}
              to={`/f/${suggestion.slug}`}
              viewTransition
              className={classNames(styles.suggestion, {
                [styles.focused]: index === focusedIndex
              })}
              role="option"
              aria-selected={index === focusedIndex}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <span className={styles.term}>{suggestion.term}</span>
              <span className={styles.attrs}>{expandAttrs(suggestion.attributes)}</span>
            </MotionLink>
          ))}
        </AnimatePresence>
      </div>
      <div
        id="search-menu-popover"
        {...{ popover: "auto" }}
        className={styles.menu}
      >
        <button
          className={styles.menuItem}
          onClick={() => {
            if (!entry) return;
            const now = toggleFavorite(entry.slug, entry.term);
            setFav(now);
            closePopover();
          }}
        >
          {fav
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
          {fav ? 'Të preferuar' : 'Shto te të preferuarat'}
        </button>
        <button
          className={styles.menuItem}
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            closePopover();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          Kopjo linkun
        </button>
        <label className={styles.menuToggle}>
          <span className={classNames(styles.toggleTrack, { [styles.on]: crossRef })} onClick={() => setCrossRef(!crossRef)}>
            <span className={styles.toggleThumb} />
          </span>
          <span>Referencat e kryqëzuara</span>
          <input type="checkbox" checked={crossRef} onChange={e => setCrossRef(e.target.checked)} />
        </label>
      </div>
    </div>
  );
};

export default SearchBar;
