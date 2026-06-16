import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Entry } from '../../lib/dictionary';
import { expandAttrs } from '../../lib/abbrev';
import { getSlugSet, wordToSlug, matchSlug } from '../../lib/crossref';
import { useEntry } from '../../lib/entry-context';
import styles from './Entries.module.scss';

interface EntriesProps {
  entries: Entry[];
}

function tocId(entryIdx: number, defIdx: number): string {
  return `def-${entryIdx}-${defIdx}`;
}

const AnimatedDef = ({ text, delay }: { text: string; delay: number }) => {
  const words = text.split(' ');
  const stagger = 100;

  return (
    <span className={styles.line}>
      {words.map((word, wi) => (
        <span
          key={wi}
          className={styles.word}
          style={{ animationDelay: `${delay + wi * stagger}ms` }}
        >
          {word}
        </span>
      ))}
    </span>
  );
};

const Entries = ({ entries = [] }: EntriesProps) => {
  const { crossRef } = useEntry();
  const [slugSet, setSlugSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSlugSet().then((data) => {
      setSlugSet(data);
      setLoading(false);
    });
  }, []);

  

  const slugKey = entries[0]?.slug || 'empty';

  let cumDelay = 0;
  const wordStagger = 100;
  const defGap = 200;
  const defDelays: number[][] = entries.map(entry =>
    entry.definitions.map(def => {
      const d = cumDelay;
      cumDelay += def.split(' ').length * wordStagger + defGap;
      return d;
    }),
  );

  function renderDefWithCrossRef(text: string, delay: number) {
    const words = text.split(/(\s+)/);
    const stagger = 100;

    return (
      <span className={styles.line}>
        {words.map((word, wi) => {
          if (!word.trim()) return <span key={wi}>{word}</span>;
          const slug = wordToSlug(word);
          const matched = matchSlug(slug, slugSet);
          if (matched && crossRef) {
            return (
              <a
                key={wi}
                href="#"
                className={`${styles.crossref} ${wi < 5 ? styles.highlight : ''}`}
                style={{ animationDelay: `${delay + wi * stagger}ms` }}
                onClick={(e) => {
                  e.preventDefault();
                  const entryIndex = entries.findIndex(entry => entry.term === word);
                  if (entryIndex >= 0) {
                    const targetId = `def-${entryIndex}-0`;
                    const el = document.getElementById(targetId);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                      el.style.animation = 'pulse 0.8s ease-in-out 3.75';
                      setTimeout(() => el.style.animation = '', 3000);
                    }
                  }
                }}
              >
                {word}
              </a>
            );
          }
          return (
            <span
              key={wi}
              className={`${styles.word} ${wi < 5 ? styles.highlight : ''}`}
              style={{ animationDelay: `${delay + wi * stagger}ms` }}
            >
              {word}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div className={styles.entries} key={slugKey}>
      {entries.map((entry, entryIdx) => (
        <div key={`entry-${entryIdx}`}>
          <span className={styles.title}>{entry.term}</span>{' '}
          <span className={styles.attributes}>{expandAttrs(entry.attributes)}</span>
          <br />
          {entry.definitions.map((definition, defIdx) => {
            const num = entry.definitions.length > 1 ? `${defIdx + 1}. ` : '';
            return (
              <div key={`def-${defIdx}`} id={tocId(entryIdx, defIdx)} className={styles.definition}>
                {renderDefWithCrossRef(`${num}${definition}`, defDelays[entryIdx][defIdx])}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Entries;
