#!/usr/bin/env python3
"""
Convert entries with English-only definitions (kaikki-filled) back to placeholders.

These entries were originally placeholders filled with English glosses from
kaikki.org. Since no Albanian definition is available, revert them to
placeholder state so they can be properly filled later.
"""

import json
import re
from pathlib import Path

DICT_PATH = Path(__file__).parent / 'dictionary.json'

# Albanian grammar markers and cross-reference abbreviations
# that can appear in definitions without ë/ç
ALB_PATTERNS = re.compile(
    r'\b(s\.\s*e\s|shih\s|sh\.\s|fem\.\s|mashk\.\s|kryes\.\s|'
    r'vjet\.\s|bised\.\s|krahin\.\s|fig\.\s|libr\.\s|'
    r'pës\.\s|vet\.\s|jokal\.\s|kal\.\s|mb\.\s|ndajf\.\s|'
    r'pasth\.\s|lidh\.\s|num\.\s|parafj\.\s|'
    r'^U\s|^I\s|^E\s|^Të\s|^Një\s)',
    re.IGNORECASE
)


def has_albanian_chars(text: str) -> bool:
    return any(c in text.lower() for c in 'ëç')


def has_albanian_grammar(text: str) -> bool:
    """Check for Albanian grammar markers in the definition."""
    return bool(ALB_PATTERNS.search(text))


def is_kaikki_filled(entry: dict) -> bool:
    """Check if entry was filled by kaikki (short English def, no Albanian content)."""
    if entry.get('placeholder'):
        return False
    defs = entry.get('definition') or []
    if not defs:
        return False
    for d in defs:
        text = d.strip()
        if len(text) >= 100:
            return False
        if has_albanian_chars(text):
            return False
        if has_albanian_grammar(text):
            return False
    return True


def main():
    with open(DICT_PATH, encoding='utf-8') as f:
        entries = json.load(f)

    converted = 0
    for entry in entries:
        if is_kaikki_filled(entry):
            entry['definition'] = []
            entry['placeholder'] = True
            converted += 1

    print(f'Converted {converted} entries to placeholders')

    with open(DICT_PATH, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f'Updated dictionary.json ({len(entries)} entries)')


if __name__ == '__main__':
    main()
