import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Entry } from '../lib/dictionary';
import { useEntry } from '../lib/entry-context';
import { addToHistory } from '../lib/storage';
import SearchBar from '../components/searchbar/SearchBar';
import Entries from '../components/entries/Entries';
import NotFound from '../components/notfound/NotFound';

const WordPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const { setEntry, setSlug } = useEntry();

  useEffect(() => {
    setSlug(slug ?? null);
  }, [slug, setSlug]);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    setLoading(true);
    setEntries([]);

    const wordUrl = `/api/word/${encodeURIComponent(slug)}`;
    const searchUrl = `/api/search?q=${encodeURIComponent(slug)}`;

    fetch(wordUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.length > 0) {
          setEntries(data);
          setLoading(false);
        } else {
          fetch(searchUrl)
            .then((r) => r.json())
            .then((results: Entry[]) => {
              if (results && results.length > 0) {
                setEntries(results);
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
        }
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
