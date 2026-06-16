import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Entry } from '../lib/dictionary';
import SearchBar from '../components/searchbar/SearchBar';
import styles from './WordGame.module.scss';

function shuffle(s: string): string {
  const a = [...s];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.join('');
}

function blurDef(def: string, term: string): (string | { t: string; blurred: boolean })[] {
  const idx = def.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return [def];
  return [
    def.slice(0, idx),
    { t: def.slice(idx, idx + term.length), blurred: true },
    ...blurDef(def.slice(idx + term.length), term),
  ];
}

const MAX_WRONG = 3;

const WordGame = () => {
  const [words, setWords] = useState<Entry[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [guess, setGuess] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'correct' | 'revealed'>('playing');
  const [hint, setHint] = useState(false);
  const [shuffledTerm, setShuffledTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(new Set());
  const [animatingPositions, setAnimatingPositions] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>();

  const loadWords = useCallback(() => {
    setLoading(true);
    setIdx(0);
    setScore(0);
    setTotal(0);
    setGuess('');
    setWrongCount(0);
    setPhase('playing');
    setHint(false);
    setShuffledTerm('');
    setDone(false);
    setRevealedPositions(new Set());
    setAnimatingPositions(new Set());
    fetch('/api/random?n=20')
      .then(r => r.json())
      .then((data: Entry[]) => {
        setWords(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadWords(); }, [loadWords]);

  useEffect(() => {
    if (phase !== 'playing') inputRef.current?.focus();
  }, [phase]);

  const current = words[idx];

  const checkGuess = () => {
    if (!current || phase !== 'playing' || !guess.trim()) return;
    if (guess.trim().toLowerCase() === current.term.toLowerCase()) {
      setPhase('correct');
      setScore(s => s + 1);
      setTotal(t => t + 1);
    } else {
      const wc = wrongCount + 1;
      setWrongCount(wc);
      setTotal(t => t + 1);
      setGuess('');
      setShake(true);
      clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setShake(false), 500);
      if (wc >= MAX_WRONG && current) { setShuffledTerm(shuffle(current.term)); setHint(true); }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGuess(value);
    
    if (!current || phase !== 'playing') return;
    
    const term = current.term.toLowerCase();
    const newRevealed = new Set(revealedPositions);
    const newAnimating = new Set<number>();
    
    for (const char of value.toLowerCase()) {
      for (let i = 0; i < term.length; i++) {
        if (term[i] === char && !revealedPositions.has(i)) {
          newRevealed.add(i);
          newAnimating.add(i);
        }
      }
    }
    
    if (newAnimating.size > 0) {
      setAnimatingPositions(newAnimating);
      setTimeout(() => setAnimatingPositions(new Set()), 300);
    }
    setRevealedPositions(newRevealed);
  };

  const reveal = () => {
    if (current) setShuffledTerm(shuffle(current.term));
    setPhase('revealed');
  };

  const next = () => {
    if (idx + 1 >= words.length) {
      setDone(true);
      return;
    }
    setIdx(i => i + 1);
    setGuess('');
    setWrongCount(0);
    setPhase('playing');
    setHint(false);
    setShuffledTerm('');
    setShake(false);
    setRevealedPositions(new Set());
    setAnimatingPositions(new Set());
  };

  const masked = useMemo(() => {
    if (!current) return '';
    const t = current.term;
    return t.split('').map((char, i) => {
      if (i === 0 || revealedPositions.has(i)) return char;
      return '_';
    }).join('') + ` (${t.length})`;
  }, [current, revealedPositions]);

  if (loading) {
    return (
      <div className={styles.page}>
        <SearchBar />
        <p className={styles.status}>Duke ngarkuar fjalët…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h2 className={styles.title}>Loja mbaroi!</h2>
          <p className={styles.finalScore}>{score} / {total} të sakta</p>
          <button className={styles.btn} onClick={loadWords}>Luaj përsëri</button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className={styles.page}>
        <SearchBar />
        <p className={styles.status}>Nuk u gjetën fjalë.</p>
        <button className={styles.btn} onClick={loadWords}>Provo përsëri</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.score}>{score} / {total}</span>
          <span className={styles.progress}>{idx + 1} / {words.length}</span>
        </div>

        <p className={styles.masked}>
          {phase === 'correct' ? current.term : phase === 'revealed' ? shuffledTerm : (
            <>
              {masked.split('').map((char, i) => (
                <span
                  key={i}
                  className={`${styles.maskedChar} ${animatingPositions.has(i) ? styles.revealAnim : ''}`}
                >
                  {char}
                </span>
              ))}
            </>
          )}
        </p>

        <div className={styles.defs}>
          {current.definitions.map((def, i) => (
            <p key={i} className={styles.def}>
              {current.definitions.length > 1 && <span className={styles.num}>{i + 1}.</span>}
              {(phase === 'correct' ? [def] : blurDef(def, current.term)).map((part, j) =>
                typeof part === 'string' ? (
                  <span key={j}>{part}</span>
                ) : (
                  <span key={j} className={styles.blurred}>{part.t}</span>
                ),
              )}
            </p>
          ))}
        </div>

        {hint && (
          <p className={styles.hint}>{shuffledTerm || shuffle(current.term.toLowerCase())}</p>
        )}

        {phase === 'playing' && (
          <>
            <div className={`${styles.inputRow} ${shake ? styles.shake : ''}`}>
              <input
                ref={inputRef}
                className={`${styles.input} ${wrongCount > 0 ? styles.wrongInput : ''}`}
                value={guess}
                onChange={handleInputChange}
                onKeyDown={e => { if (e.key === 'Enter') checkGuess(); }}
                placeholder="Shkruaj përgjigjen…"
                autoFocus
              />
              <button className={styles.btn} onClick={checkGuess}>OK</button>
              <button
                className={styles.hintBtn}
                onClick={() => setHint(h => !h)}
                title="Shfaq shkronjat e përziera"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </button>
            </div>
            {wrongCount >= MAX_WRONG && (
              <button className={styles.revealBtn} onClick={reveal}>
                Zgjidhje
              </button>
            )}
          </>
        )}

        {phase === 'correct' && (
          <div className={styles.feedback}>
            <p className={styles.correct}>Saktë!</p>
            <button className={styles.btn} onClick={next}>
              {idx + 1 >= words.length ? 'Shiko rezultatin' : 'Fjala tjetër'}
            </button>
          </div>
        )}

        {phase === 'revealed' && (
          <div className={styles.feedback}>
            <p className={styles.wrong}>{shuffledTerm}</p>
            <button className={styles.btn} onClick={next}>
              {idx + 1 >= words.length ? 'Shiko rezultatin' : 'Fjala tjetër'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordGame;
