#!/usr/bin/env python3
"""
Strip duplicated POS/grammatical tags from the beginning of definitions.

The HF dataset (akadriu/fjalori-shqip) sometimes has the full_header
text embedded in the senses/definition field. When merge_hf() uses the
sense text as-is, the POS tags (e.g. "m. sh.") appear both in the
term header AND at the start of the definition text.

This script fixes existing entries and merge_external_definitions.py
prevents recurrence.
"""

import json
import re
from pathlib import Path

DICT_PATH = Path(__file__).parent / 'dictionary.json'

ROMAN_NUMS = {'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'}

KNOWN_ATTRS = {
    'm.', 'f.', 'mb.', 'kal.', 'ndajf.', 'parafj.', 'lidh.', 'pasth.',
    'num.', 'pron.', 'përc.', 'pj.', 'parasht.', 'prapasht.', 'shpreh.',
    'fj.u.', 'sh.', 'vetv.', 'jokal.', 'krahin.', 'bised.', 'fig.', 'mat.',
    'gjeom.', 'gjeog.', 'hist.', 'usht.', 'libr.', 'vjet.', 'zool.', 'bot.',
    'mjek.', 'folk.', 'mitol.', 'anat.', 'ekon.', 'drejt.', 'det.',
    'gjeol.', 'astron.', 'kim.', 'fiz.', 'let.', 'filoz.', 'polit.',
    'psikol.', 'sociol.', 'stat.', 'tek.', 'teknol.', 'tregt.',
    'vulg.', 'zharg.', 'pës.', 'vet.', 'gjuh.', 'keq.', 'kryes.',
    'spec.', 'fet.', 'poet.', 'shar.', 'pakuf.', 'mospërf.', 'etnogr.',
    'gjell.', 'as.', 'muz.', 'zyrt.', 'sport.', 'përmb.', 'bujq.',
    'përf.', 'thjeshtligj.', 'fin.', 'fem.',
}


def extract_attrs(term: str) -> list[str]:
    """Extract known grammatical attributes from the term string.

    Handles Roman numeral disambiguators like 'AH I m. sh. bot.'
    where 'I' (and similar) is not an attr but should be skipped.
    """
    parts = term.strip().split()
    if len(parts) < 2:
        return []
    attrs = []
    started = False
    for part in parts[1:]:
        part_lower = part.lower()
        # Skip Roman numeral disambiguators (may or may not have a dot)
        if not started and part_lower in ROMAN_NUMS:
            continue
        if part.endswith('.') and part_lower in KNOWN_ATTRS:
            attrs.append(part_lower)
            started = True
        elif not started and part.rstrip('.,').lower() in ROMAN_NUMS:
            # Roman numeral with trailing dot/comma
            continue
        else:
            break
    return attrs


def strip_attrs_from_def(def_text: str, attrs: list[str]) -> str:
    """Strip POS tags from the start of definition text if present."""
    if not attrs or not def_text:
        return def_text

    text = def_text.strip()
    # Build prefixes to try: full attrs list, then progressively shorter
    for i in range(len(attrs), 0, -1):
        prefix = ' '.join(attrs[:i]) + ' '
        if text.lower().startswith(prefix.lower()):
            return text[len(prefix):].strip()

    return text


def main():
    with open(DICT_PATH, encoding='utf-8') as f:
        entries = json.load(f)

    fixed = 0
    skipped = 0
    for entry in entries:
        term = entry.get('term', '')
        defs = entry.get('definition', [])
        if not term or not defs:
            continue

        attrs = extract_attrs(term)
        if not attrs:
            continue

        changed = False
        new_defs = []
        for d in defs:
            stripped = strip_attrs_from_def(d, attrs)
            # Also try stripping with a leading "1." or similar numbering
            if stripped == d.strip():
                # Check for "1. m. sh. ..." pattern
                m = re.match(r'^\d+\.\s*', d)
                if m:
                    after_num = d[m.end():]
                    stripped = strip_attrs_from_def(after_num, attrs)
                    if stripped != after_num:
                        stripped = m.group() + stripped

            if stripped != d.strip():
                changed = True
            new_defs.append(stripped)

        if changed:
            entry['definition'] = new_defs
            fixed += 1

    print(f'Fixed {fixed} entries with duplicated POS tags in definitions')

    # Write
    with open(DICT_PATH, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f'Updated dictionary.json ({len(entries)} entries)')


if __name__ == '__main__':
    main()
