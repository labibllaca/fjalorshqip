import type { Entry } from '../../lib/dictionary';
import { expandAttrs } from '../../lib/abbrev';
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
                <AnimatedDef text={`${num}${definition}`} delay={defDelays[entryIdx][defIdx]} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Entries;
