import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Entry } from '../lib/dictionary';
import { useEntry } from '../lib/entry-context';
import { addToHistory } from '../lib/storage';
import SearchBar from '../components/searchbar/SearchBar';
import Entries from '../components/entries/Entries';
import NotFound from '../components/notfound/NotFound';

declare global {
  interface Window { __INITIAL_DATA__?: Entry[] }
}

const WordPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>(() => {
    if (typeof window !== 'undefined' && window.__INITIAL_DATA__) {
      const data = window.__INITIAL_DATA__;
      window.__INITIAL_DATA__ = undefined;
      return data;
    }
    return [];
  });
  const { setEntry } = useEntry();

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    if (entries.length > 0) {
      setLoading(false);
      return;
    }
    fetch(`/api/word/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setEntries(data ?? []);
        setLoading(false);
      })
      .catch(() => { setEntries([]); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (entries[0]) {
      setEntry(entries[0]);
      addToHistory(entries[0].slug, entries[0].term);
    }
  }, [entries, setEntry]);

  return (
    <div>
      <SearchBar />
      {loading ? <div>Duke u ngarkuar...</div> : entries.length > 0 ? <Entries entries={entries} /> : <NotFound />}
    </div>
  );
};

export default WordPage;
