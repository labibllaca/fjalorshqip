import { useEffect, useState } from 'react';
import type { Entry } from '../lib/dictionary';
import { getWordOfTheDay } from '../lib/word-of-the-day';
import { expandAbbr } from '../lib/abbrev';
import { useEntry } from '../lib/entry-context';
import SearchBar from '../components/searchbar/SearchBar';

const dayNames = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'];
const monthNames = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];

function formatDate(d: Date): string {
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

const WordOfTheDay = () => {
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<Entry | null>(null);
  const { setEntry: setCtxEntry } = useEntry();

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    const MAX_RETRIES = 50;

    const fetchWord = (): void => {
      if (cancelled) return;

      getWordOfTheDay()
        .then(slug => fetch(`/api/word/${encodeURIComponent(slug)}`))
        .then(r => r.json())
        .then((data: Entry[]) => {
          if (cancelled) return;
          const e = data[0] ?? null;
          if (e?.definitions?.length) {
            setEntry(e);
            setCtxEntry(e);
            setLoading(false);
          } else if (retries < MAX_RETRIES) {
            retries++;
            fetchWord();
          } else {
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    };

    fetchWord();

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="wotd-page">
        <SearchBar />
        <p className="wotd-loading">Duke zgjedhur fjalën e ditës…</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="wotd-page">
        <SearchBar />
        <p className="wotd-loading">Nuk u gjet fjalë.</p>
      </div>
    );
  }

  return (
    <div className="wotd-page">
      <div className="wotd-card">
        <p className="wotd-date">{formatDate(new Date())}</p>
        <h1 className="wotd-term">{entry.term}</h1>
        {entry.attributes.length > 0 && (
          <p className="wotd-attrs">{entry.attributes.map(expandAbbr).join(' · ')}</p>
        )}
        <div className="wotd-defs">
          {entry.definitions.map((def, i) => (
            <p key={i} id={`def-0-${i}`} className="wotd-def">
              {entry.definitions.length > 1 && <span className="wotd-num">{i + 1}.</span>}
              {def}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WordOfTheDay;
