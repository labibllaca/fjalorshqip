#!/usr/bin/env python3
"""
Merge placeholder entries into dictionary.json and rebuild the database.

Usage:
    python3 data/merge_placeholders.py

This:
1. Reads dictionary.json + placeholder-entries.json
2. Deduplicates by word (extracted via the same logic as scrapedEntryToEntry)
3. Writes merged dictionary.json
4. Runs the TypeScript build-db.ts and copy-api.mjs
"""

import json
import re
import subprocess
import sys
from pathlib import Path

DATA_DIR = Path('/Users/notib/Projekte/fjalorshqip/data')
DICT_PATH = DATA_DIR / 'dictionary.json'
PLACEHOLDER_PATH = DATA_DIR / 'placeholder-entries.json'
BUILD_SCRIPT = 'npx tsx src/scripts/build-db.ts'
COPY_SCRIPT = 'node src/scripts/copy-api.mjs'


def extract_word(term: str) -> str:
    """Extract the canonical word from a term string (first token is always the word)."""
    parts = term.strip().split()
    return parts[0] if parts else ''


def existing_words(entries: list) -> set:
    """Build set of uppercase words already in the dictionary."""
    words = set()
    for entry in entries:
        word = extract_word(entry.get('term', ''))
        words.add(word.upper())
    return words


def main():
    # Read existing dictionary
    with open(DICT_PATH, encoding='utf-8') as f:
        dict_entries = json.load(f)
    print(f'Existing dictionary: {len(dict_entries)} entries')

    existing = existing_words(dict_entries)

    # Read placeholder entries
    with open(PLACEHOLDER_PATH, encoding='utf-8') as f:
        placeholder_entries = json.load(f)
    print(f'Placeholder entries: {len(placeholder_entries)}')

    # Filter out placeholders that already exist in the dictionary
    new_entries = []
    skipped = 0
    for entry in placeholder_entries:
        word = extract_word(entry.get('term', ''))
        if word.upper() in existing:
            skipped += 1
            continue
        # Create a clean ScrapedEntry: just the word as term
        new_entry = {
            'term': f'{word.upper()} ',
            'definition': [],
            'placeholder': True,
        }
        new_entries.append(new_entry)
        existing.add(word.upper())  # avoid duplicates among placeholders

    print(f'New entries to add: {len(new_entries)}')
    print(f'Skipped (already in dict): {skipped}')

    if not new_entries:
        print('No new entries to add.')
        return

    # Merge and write
    merged = dict_entries + new_entries
    with open(DICT_PATH, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f'Merged dictionary written: {len(merged)} entries')

    # Rebuild the database
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

    # Verify
    import sqlite3
    db_path = Path('/Users/notib/Projekte/fjalorshqip/public/api/fjalor.db')
    conn = sqlite3.connect(str(db_path))
    count = conn.execute('SELECT COUNT(*) FROM entries').fetchone()[0]
    print(f'Database entries: {count}')
    conn.close()


if __name__ == '__main__':
    main()
