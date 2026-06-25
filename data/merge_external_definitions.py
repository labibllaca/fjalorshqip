#!/usr/bin/env python3
"""
Merge definitions from external Albanian lexicon sources into dictionary.json.

Sources (in priority order):
  1. HuggingFace akadriu/fjalori-shqip — official Academy definitions (requires HF_TOKEN)
  2. kaikki.org — Wiktionary-derived definitions (free, always available)

Usage:
    HF_TOKEN=hf_xxx python3 data/merge_external_definitions.py
    python3 data/merge_external_definitions.py  # kaikki.org only

This:
1. Reads dictionary.json and all available external sources
2. Matches placeholder entries by uppercase word
3. Replaces matched placeholders with real entries (definitions + PoS)
4. Upgrades kaikki-filled entries with better HF definitions where available
5. Writes updated dictionary.json
6. Rebuilds the SQLite database
"""

import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path('/Users/notib/Projekte/fjalorshqip/data')
DICT_PATH = DATA_DIR / 'dictionary.json'
KAIKKI_PATH = DATA_DIR / 'kaikki-org-albanian.jsonl'
BUILD_SCRIPT = 'npx tsx src/scripts/build-db.ts'
COPY_SCRIPT = 'node src/scripts/copy-api.mjs'

# ── Helpers ──

def extract_word(term: str) -> str:
    """Extract the canonical word from a term string (first token)."""
    parts = term.strip().split()
    return parts[0] if parts else ''


def is_kaikki_filled(entry: dict) -> bool:
    """Check if entry was filled by kaikki (short English definitions, no Albanian chars)."""
    if entry.get('placeholder'):
        return False
    defs = entry.get('definition') or []
    if not defs:
        return False
    text = defs[0].strip()
    if len(text) >= 100:
        return False
    has_albanian_chars = any(c in text.lower() for c in 'ëç')
    if has_albanian_chars:
        return False
    return True


# ── kaikki.org source ──

POS_MAP = {
    'noun': 'm.',
    'verb': 'kal.',
    'adj': 'mb.',
    'adv': 'ndajf.',
    'prep': 'parafj.',
    'conj': 'lidh.',
    'intj': 'pasth.',
    'num': 'num.',
    'pron': 'pron.',
    'det': 'përc.',
    'particle': 'pj.',
    'article': 'nyj.',
    'prefix': 'parasht.',
    'suffix': 'prapasht.',
    'phrase': 'shpreh.',
    'proverb': 'fj.u.',
    'name': None,
    'character': None,
    'interfix': None,
}

GENDER_MAP = {
    'masculine': 'm.',
    'feminine': 'f.',
    'neuter': 'asnj.',
}


def extract_gender(entry: dict) -> str | None:
    for sense in entry.get('senses', []):
        for tag in sense.get('tags', []):
            if tag in GENDER_MAP:
                return tag
    for ht in entry.get('head_templates', []):
        g = ht.get('args', {}).get('g')
        if g in ('m', 'f', 'n'):
            return {'m': 'masculine', 'f': 'feminine', 'n': 'neuter'}[g]
    for form in entry.get('forms', []):
        for tag in form.get('tags', []):
            if tag in ('masculine', 'feminine', 'neuter'):
                return tag
    return None


def get_albanian_pos(entry: dict) -> str | None:
    pos = entry.get('pos', '')
    base = POS_MAP.get(pos)
    if base is None:
        return None
    if pos == 'noun':
        gender = extract_gender(entry)
        return GENDER_MAP[gender] if gender else None
    if pos == 'verb':
        w = entry.get('word', '').lower()
        if w.endswith(('ohem', 'ohet', 'ohen', 'ohesh')):
            return 'vetv.'
        return 'kal.'
    return base


def format_kaikki_defs(entry: dict) -> list[str]:
    senses = entry.get('senses', [])
    defs = []
    for i, sense in enumerate(senses, 1):
        glosses = sense.get('glosses', [])
        if not glosses:
            continue
        text = glosses[0].strip()
        sep = ' ' if i > 1 else ''
        if text.endswith('.'):
            defs.append(f'{sep}{i}. {text}')
        else:
            defs.append(f'{sep}{i}. {text}.')
    return defs


def make_term(word: str, pos: str | None) -> str:
    word = word.upper()
    if pos:
        return f'{word} {pos} '
    return f'{word} '


def merge_kaikki(word: str, entry: dict) -> dict | None:
    pos = get_albanian_pos(entry)
    term = make_term(word, pos)
    defs = format_kaikki_defs(entry)
    if not defs:
        return None
    return {'term': term, 'definition': defs}


def build_kaikki_index() -> dict:
    index = defaultdict(list)
    if not KAIKKI_PATH.exists():
        print(f'  (kaikki file not found: {KAIKKI_PATH})')
        return index
    with open(KAIKKI_PATH, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            word = obj.get('word', '').upper()
            if word:
                index[word].append(obj)
    print(f'  Loaded {sum(len(v) for v in index.values())} kaikki entries ({len(index)} unique words)')
    return index


# ── HuggingFace source ──

ROMAN_HF = {'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'}


def split_full_header(full_header: str) -> tuple[str, str]:
    """
    Split a full_header into (header_part, definition_part).

    The HuggingFace dataset's full_header sometimes contains the entire 
    first line of the dictionary entry (word + POS + first definition merged).
    This function extracts just the header (word + POS tags).

    Example:
        'AKREDITIV m. sh. Dokument i lëshuar...'
        -> ('AKREDITIV m. sh.', 'Dokument i lëshuar...')
    """
    header = full_header.strip()
    parts = header.split()
    if not parts:
        return header, ''

    header_parts = [parts[0]]
    split_idx = 1
    roman_zone = True

    for idx, part in enumerate(parts[1:], 1):
        is_header = False
        if roman_zone and part in ROMAN_HF:
            is_header = True
        elif part.endswith('.,'):
            stripped = part.rstrip('.,')
            if 1 <= len(stripped) <= 8 and stripped.isalpha():
                is_header = True
        elif part.endswith('.'):
            stripped = part.rstrip('.')
            if 1 <= len(stripped) <= 8 and stripped.isalpha():
                is_header = True

        if is_header:
            header_parts.append(part)
            split_idx = idx + 1
            if part not in ROMAN_HF:
                roman_zone = False
        else:
            break

    header_str = ' '.join(header_parts)
    rest = ' '.join(parts[split_idx:]) if split_idx < len(parts) else ''
    return header_str, rest


def clean_hf_word(word: str) -> str:
    """Strip Roman numeral suffix from HF words (e.g. 'A I' -> 'A')."""
    return re.sub(r'\s+[IVXLCDM]+$', '', word.upper().strip())


def merge_hf(word: str, entry: dict) -> dict | None:
    full_header = entry.get('full_header', '') or ''
    if full_header.strip():
        header_part, def_part = split_full_header(full_header)
        term = header_part.strip() + ' '
    else:
        syn = entry.get('syntactic_tag') or ''
        term = make_term(word, syn if syn else None)
        def_part = ''

    senses = entry.get('senses') or []
    dtext = entry.get('definition') or ''

    if senses:
        defs = []
        for i, s in enumerate(senses, 1):
            s = s.strip()
            sep = ' ' if i > 1 else ''
            if s.endswith('.'):
                defs.append(f'{sep}{i}. {s}')
            else:
                defs.append(f'{sep}{i}. {s}.')
    elif dtext:
        defs = [dtext]
        if def_part:
            defs[0] = def_part + ' ' + defs[0]
    else:
        if def_part:
            defs = [def_part]
        else:
            return None

    return {'term': term.upper(), 'definition': defs}


def build_hf_index() -> dict:
    index = defaultdict(list)
    hf_token = os.environ.get('HF_TOKEN')
    if not hf_token:
        return index
    try:
        from datasets import load_dataset
    except ImportError:
        print('  (datasets library not installed)')
        return index
    try:
        ds = load_dataset('akadriu/fjalori-shqip', split='train', token=hf_token)
        print(f'  Loaded {len(ds)} HF entries')
        for row in ds:
            raw_word = (row.get('word') or '').upper()
            word = clean_hf_word(raw_word)
            if word:
                index[word].append(dict(row))
        print(f'  HF index: {len(index)} unique words')
    except Exception as e:
        print(f'  HF dataset error: {e}')
    return index


# ── Main ──

def main():
    # Build sources
    sources = []

    hf_index = build_hf_index()
    if hf_index:
        sources.append(('akadriu/fjalori-shqip', hf_index, merge_hf))

    print('Loading kaikki.org index...')
    kaikki_index = build_kaikki_index()
    if kaikki_index:
        sources.append(('kaikki.org', kaikki_index, merge_kaikki))

    if not sources:
        print('No external data sources available!')
        sys.exit(1)

    # Read dictionary
    with open(DICT_PATH, encoding='utf-8') as f:
        entries = json.load(f)
    print(f'\nDictionary entries: {len(entries)}')

    # Phase 1: Fill remaining placeholders (high-priority source first)
    placeholder_by_word = {}
    for i, entry in enumerate(entries):
        if entry.get('placeholder'):
            word = extract_word(entry.get('term', ''))
            if word:
                placeholder_by_word[word] = i
    print(f'Placeholder entries: {len(placeholder_by_word)}')

    filled = set()
    for source_name, source_index, merge_fn in sources:
        count = 0
        for word, word_entries in source_index.items():
            if word in placeholder_by_word and word not in filled:
                for se in word_entries:
                    result = merge_fn(word, se)
                    if result:
                        idx = placeholder_by_word[word]
                        entries[idx] = result
                        filled.add(word)
                        count += 1
                        break
        if count:
            print(f'  {source_name}: filled {count} placeholders')

    # Phase 2: Upgrade kaikki-filled entries with HF data
    if hf_index:
        upgrade_count = 0
        for i, entry in enumerate(entries):
            if entry.get('placeholder'):
                continue
            word = extract_word(entry.get('term', ''))
            if not word or word in filled:
                continue
            if not is_kaikki_filled(entry):
                continue
            if word in hf_index:
                for se in hf_index[word]:
                    result = merge_hf(word, se)
                    if result:
                        entries[i] = result
                        filled.add(word)
                        upgrade_count += 1
                        break
        if upgrade_count:
            print(f'  HF: upgraded {upgrade_count} kaikki entries')

    # Stats
    still_placeholder = sum(1 for e in entries if e.get('placeholder'))
    with_defs = len(entries) - still_placeholder
    print(f'\nResults:')
    print(f'  Total entries:       {len(entries)}')
    print(f'  With definitions:    {with_defs}')
    print(f'  Remaining placeholders: {still_placeholder}')

    # Write
    with open(DICT_PATH, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f'\nUpdated dictionary.json written ({len(entries)} entries)')

    # Rebuild database
    print('\nRebuilding database...')
    result = subprocess.run(BUILD_SCRIPT, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'Build failed:\n{result.stderr}', file=sys.stderr)
        sys.exit(1)
    print(result.stdout)

    result2 = subprocess.run(COPY_SCRIPT, shell=True, capture_output=True, text=True)
    if result2.returncode != 0:
        print(f'Copy failed:\n{result2.stderr}', file=sys.stderr)
        sys.exit(1)
    print(result2.stdout)

    import sqlite3
    db_path = Path('/Users/notib/Projekte/fjalorshqip/public/api/fjalor.db')
    conn = sqlite3.connect(str(db_path))
    count = conn.execute('SELECT COUNT(*) FROM entries').fetchone()[0]
    print(f'Database entries: {count}')
    conn.close()


if __name__ == '__main__':
    main()
