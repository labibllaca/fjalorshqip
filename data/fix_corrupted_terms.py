#!/usr/bin/env python3
"""
Fix corrupted entries in dictionary.json where the term field contains
definition text merged in (from HuggingFace full_header).

This script:
1. Fixes Type A entries (term contains definition text) - parses header from term
2. Removes exact duplicates (same term + same definition)
3. Removes corrupted fragment entries (word is lost, only def fragment remains)
"""

import json
import shutil
import re
from pathlib import Path

DICT_PATH = Path(__file__).parent / 'dictionary.json'

ROMAN = {'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'}

FRAGMENT_PATTERNS = [
    'sqep; ai që ka dëshirë',
    'Bimë barishtore ujëse',
    'Periudhë kohe që përfshin',
    'njerëzish, që lidhen',
    'faqe mali. Rogat',
    'nga të gjitha çeshitet',
]


def parse_header(term: str) -> tuple[str, str]:
    """
    Split a term like 'AKREDITIV M. SH. DOKUMENT I LËSHUAR...'
    into header ('AKREDITIV M. SH.') and definition ('DOKUMENT I LËSHUAR...').
    """
    term = term.strip()
    parts = term.split()
    if not parts:
        return term, ''

    header_parts = [parts[0]]
    rest_start = 1
    roman_zone = True

    for idx, part in enumerate(parts[1:], 1):
        is_header = False
        if roman_zone and part in ROMAN:
            is_header = True
        elif part.endswith('.'):
            stripped = part.rstrip('.')
            if 1 <= len(stripped) <= 8 and stripped.isalpha():
                is_header = True
        elif part.endswith('.,'):
            stripped = part.rstrip('.,')
            if 1 <= len(stripped) <= 8 and stripped.isalpha():
                is_header = True

        if is_header:
            header_parts.append(part)
            rest_start = idx + 1
            if part not in ROMAN:
                roman_zone = False
        else:
            break

    header = ' '.join(header_parts)
    rest = ' '.join(parts[rest_start:]) if rest_start < len(parts) else ''
    return header, rest


def normalize_term(header: str) -> str:
    """Convert header like 'AKREDITIV M. SH.' to 'AKREDITIV m. sh. '."""
    parts = header.split()
    if not parts:
        return header + ' '
    word = parts[0].upper()
    rest = []
    for p in parts[1:]:
        if p in ROMAN:
            rest.append(p)
        else:
            rest.append(p.lower())
    return word + ' ' + ' '.join(rest) + ' '


def has_definition_in_term(term: str, def_text: str) -> bool:
    """Check if definition text appears in the term."""
    if not def_text:
        return False
    clean_def = def_text.strip()
    # Strip leading numbering like "1. 1." or "1."
    clean_def = re.sub(r'^[\d.\s]+', '', clean_def).strip()
    for length in [40, 30, 20]:
        if len(clean_def) >= length:
            if clean_def[:length].lower() in term.lower():
                return True
    return False


def main():
    print('Reading dictionary.json...')
    with open(DICT_PATH, encoding='utf-8') as f:
        entries = json.load(f)
    print(f'Total entries: {len(entries)}')

    # Backup
    backup = DICT_PATH.with_suffix('.json.bak')
    shutil.copy2(DICT_PATH, backup)
    print(f'Backup saved to {backup}')

    # ── Phase 1: Fix Type A entries (term contains definition text) ──
    fixed = 0
    for entry in entries:
        term = entry.get('term', '').strip()
        defs = entry.get('definition', [])
        if not term:
            continue
        def_text = ' '.join(defs) if defs else ''

        is_corrupted = (
            len(term) > 50
            and has_definition_in_term(term, def_text)
        )

        if is_corrupted:
            header, rest = parse_header(term)
            if rest:
                entry['term'] = normalize_term(header)
                fixed += 1

    print(f'Phase 1: Fixed {fixed} corrupted terms')

    # ── Phase 2: Remove exact duplicates ──
    seen = {}
    deduped = []
    for entry in entries:
        term = entry.get('term', '').strip()
        def_text = ' '.join(entry.get('definition', []))
        key = (term.lower(), def_text[:100].lower())
        if key not in seen:
            seen[key] = True
            deduped.append(entry)
    removed_dups = len(entries) - len(deduped)
    entries = deduped
    print(f'Phase 2: Removed {removed_dups} exact duplicates')

    # ── Phase 3: Remove corrupted fragment entries ──
    clean = []
    for entry in entries:
        term = entry.get('term', '')
        if any(p in term for p in FRAGMENT_PATTERNS):
            continue
        clean.append(entry)
    removed_frags = len(entries) - len(clean)
    entries = clean
    print(f'Phase 3: Removed {removed_frags} corrupted fragments')

    # ── Phase 4: Catch any remaining over-long terms (should be rare) ──
    fixed2 = 0
    long_still = 0
    for entry in entries:
        term = entry.get('term', '').strip()
        defs = entry.get('definition', [])
        if len(term) > 60 and not entry.get('placeholder'):
            def_text = ' '.join(defs) if defs else ''
            header, rest = parse_header(term)
            if rest:
                entry['term'] = normalize_term(header)
                fixed2 += 1
            else:
                long_still += 1
                if long_still <= 5:
                    print(f'  Still long [{long_still}]: term={term[:80]}')
    if fixed2:
        print(f'Phase 4: Fixed {fixed2} remaining over-long terms')

    # ── Write ──
    with open(DICT_PATH, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f'\nFinal entry count: {len(entries)}')
    print(f'Done!')

    # Show samples
    print('\nSample fixed entries:')
    for word in ['AH I', 'AKREDITIV', 'ANDRALLOS', 'SHATOJ', 'BALLE', 'BEL I', 'DE']:
        for e in entries:
            t = e.get('term', '').strip()
            if t.startswith(word) and len(t) < 60:
                print(f'  term: {t}')
                defs = e.get('definition', [])
                if defs:
                    print(f'  def:  {str(defs[0])[:80]}')
                print()
                break


if __name__ == '__main__':
    main()
