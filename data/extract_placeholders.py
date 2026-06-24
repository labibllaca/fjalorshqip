#!/usr/bin/env python3
"""
Extract lemma/headword candidates from sq.dic that are not yet in the
dictionary database, and write them as placeholder entries.

Usage:
    python3 data/extract_placeholders.py

Output: data/placeholder-entries.json (array of ScrapedEntry-shaped objects)
"""

import json
import sqlite3
import re
from collections import Counter

SQUISH_DIC = '/Users/notib/Projekte/fjalorshqip/data/sq.dic'
DB_PATH = '/Users/notib/Projekte/fjalorshqip/public/api/fjalor.db'
OUTPUT = '/Users/notib/Projekte/fjalorshqip/data/placeholder-entries.json'

# --- Flag classification (derived from comprehensive sq.dic analysis) ---
# 
# Every unique flag token in sq.dic was sampled (up to 8 words per flag) and
# classified by word-ending pattern. Flags whose samples are overwhelmingly
# lemma-like (ending in -oj, -uar, -shme, consonant, -ë, etc.) go to LEMMA_FLAGS.
# Flags whose samples are overwhelmingly inflection-like (ending in -on, -oi,
# -ova, -ojmë, -ojnë, -hem, -hej, -ën, -ës, -in, -it, -at, -të, -ve, etc.)
# go to INFLECTION_FLAGS. Mixed flags go to AMBIGUOUS_FLAGS.

LEMMA_FLAGS = frozenset({
    # Proper names
    'K', 'P',
    # Masculine nouns (consonant ending)
    'KM', 'NK', 'KN', 'MK', 'NKM', 'KNM', 'MKN', 'NMK', 'L', 'LNK', 'LNKM',
    'R', 'NLK', 'MLK', 'KNL', 'LP', 'NP', 'AK', 'ENK', 'LM', 'TA', 'AQ', 'QA',
    # Feminine nouns in -ë
    'Q', 'ARQ',
    # Abstract nouns in -i
    'T',
    # Adjectives (masculine)
    'MP', 'M', 'N', 'MNK', 'MNP', 'MPN', 'PM', 'PNM', 'NPM', 'NMP',
    'NM', 'MKL', 'KLM',
    # Adjectives in -shme (feminine)
    'AS', 'SA', 'ES', 'SE',
    # Adjectives in -ik, -ak, -or, -al, -oz, -ar
    'RQ', 'QR',
    # Participles in -uar / -ur (adjective uses)
    'KL', 'LK', 'ALK', 'AKL', 'LKA', 'LAK', 'KLA', 'EKL', 'ELK',
    # Verbs in -oj (present 1sg, citation form)
    'DBC', 'BDC', 'DC', 'DBFC', 'DFBC', 'ZC', 'FDBC', 'DCB', 'BCD', 'CBD',
    'F', 'DBCF', 'FBDC', 'BCDF', 'BDFC', 'D', 'BC', 'BFDC', 'CD', 'CBDF',
    'DFC', 'FC', 'FCBD', 'BCFD', 'BDCF', 'DCBF', 'FBCD', 'DFCB', 'CDB',
    'FDC', 'DCF', 'FDCB', 'CF', 'DF', 'CDF', 'C', 'B', 'BFC', 'CB', 'CBF',
    'FBC',
    # Verb stems (non-standard verbs)
    'H', 'GH', 'HG', 'G', 'GHL', 'HL',
    # Miscellaneous nouns/adjectives
    'S',
})

INFLECTION_FLAGS = frozenset({
    # Verb aorist / imperfect / present plural
    'X', 'ZX', 'XZ', 'ZKX', 'EXZ', 'XZE', 'ZXE',
    # Verb present 3sg / inflections by conjugation class
    'XKZ', 'KXZ', 'KZX', 'XZK', 'XK', 'ZXK', 'KX', 'ZK', 'KZ', 'KZXE',
    # Verb passive / medio-passive forms
    'EZX', 'XEZ', 'ZEX', 'XE', 'EX', 'AXZ',
    # Verb optative / subjunctive
    'ZXA', 'ZAX', 'XAZ', 'AZX', 'XZA', 'AZE',
    # Noun/adj definite / plural / case forms
    'A', 'E', 'EA', 'AE',
})

AMBIGUOUS_FLAGS = frozenset({
    'Z',    # 22004: mixed noun lemmas + noun inflections
    'AZ',   #  286: mixed adjectives + inflections
    'ZE',   #  138: mixed lemmas + inflections
    'ZA',   #  194: mixed participles + inflections
    'EZ',   #  162: mixed lemmas + inflections
    'KE',   #   13: mixed (dhunues/lemma, dreqnon/inflection)
    'EK',   #   20: mostly lemmas with some -on words
    'AZE',  #   18: mixed (emra/fille — plurals, anshëm/gjak — lemmas)
})

# These flags appear on both lemmas and inflections — need morphological analysis
AMBIGUOUS_FLAGS = frozenset({
    'Z',    # mixed: lemmas and noun inflections (22k entries)
    'AZ',   # mixed: adjectives and inflections (286 entries)
})


def load_sq_dic():
    """Load sq.dic and return (word, flags_set, has_flags) tuples."""
    entries = []
    with open(SQUISH_DIC, encoding='latin-1') as f:
        lines = f.read().splitlines()[1:]  # Skip line count header

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if '/' in line:
            word, flag_part = line.split('/', 1)
            flags = set(flag_part.split('/'))
            entries.append((word, flags, True))
        else:
            entries.append((line, frozenset(), False))

    return entries


def load_existing_terms():
    """Load all term values already in the SQLite DB (uppercased)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT term FROM entries")
    return {row[0] for row in cursor.fetchall()}


def is_likely_inflection(word, all_words_lower, all_words_original=None):
    """
    Morphological heuristic: is this entry an inflected form
    rather than a lemma?
    
    Uses Albanian noun/verb declension patterns and a "shorter base exists" check.
    all_words_lower is a set of all lowercased word forms in sq.dic.
    all_words_original (optional) maps lowercase -> original case for lookups.
    """
    """
    Morphological heuristic: is this /Z or /AZ entry an inflected form
    rather than a lemma?
    
    Uses Albanian noun/verb declension patterns and a "shorter base exists" check.
    all_words_lower is a set of all lowercased word forms in sq.dic.
    """
    wl = word.lower()
    
    # --- Noun inflections ---
    
    # Store length of word to avoid repeated len() calls
    n = len(wl)
    
    # Feminine def acc: stem in -ë + n = -ën (e.g., abakë -> abakën)
    if wl.endswith('ën') and n > 2:
        if wl[:-1] in all_words_lower:
            return True
        # Also check def nom form (wl[:-2] + 'a') for names like Adelinë -> Adelina
        if len(wl) > 3 and wl[:-2] + 'a' in all_words_lower:
            return True
    
    # Feminine def gen/dat/abl: stem in -ë + s = -ës (e.g., abakë -> abakës)
    if wl.endswith('ës') and n > 2:
        if wl[:-1] in all_words_lower:
            return True
        if len(wl) > 3 and wl[:-2] + 'a' in all_words_lower:
            return True
    
    # Feminine def acc: stem in -i + në = -inë (e.g., Abisini -> Abisininë)
    # Also covers stems in other vowels
    if wl.endswith('në') and n > 3:
        base = wl[:-2]
        if base in all_words_lower:
            return True
        # Even if base form doesn't exist, check if base + 'a' exists
        # (def nom of i-stem nouns, like "Abisinia" for "Abisininë")
        if base + 'a' in all_words_lower:
            return True
    
    # Feminine def gen/dat/abl: stem in -i + së = -isë (e.g., Abisini -> Abisinisë)
    if wl.endswith('së') and n > 3:
        base = wl[:-2]
        if base in all_words_lower:
            return True
        # Also check def nom form (base + 'a')
        if base + 'a' in all_words_lower:
            return True
    
    # Feminine def nom: stem in -ë -> -a (e.g., abakë -> abaka)
    if wl.endswith('a') and n > 2:
        alt = wl[:-1] + 'ë'
        if alt in all_words_lower:
            return True
        # Also check: stem in -i or consonant + a = def form (e.g., "Abisinia")
        base = wl[:-1]
        if base in all_words_lower:
            return True
    
    # Masculine def acc: stem + -in (e.g., abdikim -> abdikimin)
    if wl.endswith('in') and n > 3:
        base = wl[:-2]
        if base in all_words_lower:
            return True
    
    # Masculine def gen/dat/abl: stem + -it (e.g., abdikim -> abdikimit)
    if wl.endswith('it') and n > 3:
        base = wl[:-2]
        if base in all_words_lower:
            return True
    
    # Masculine def nom: stem + -i (e.g., abdikim -> abdikimi)
    # Only match when base ends in consonant (not ë, i, etc.)
    if wl.endswith('i') and n > 2:
        base = wl[:-1]
        if base in all_words_lower and base[-1] not in 'ëi':
            return True
    
    # Indefinite plural (masc in -ë or -e): stem exists as masc noun
    if wl.endswith('ë') and n > 2:
        base = wl[:-1]
        if base in all_words_lower and base[-1] not in 'ëi':
            return True
    if wl.endswith('e') and n > 2:
        base = wl[:-1]
        if base in all_words_lower and base[-1] not in 'ëiea':
            return True
    
    # Definite plural: ends in -t (e.g., abdikimet, abonentët)
    if wl.endswith('t') and n > 2:
        base = wl[:-1]
        if base in all_words_lower:
            return True
    
    # Plural gen/dat/abl: ends in -ve (e.g., abdikimeve)
    if wl.endswith('ve') and n > 3:
        base = wl[:-2]
        if base in all_words_lower:
            return True
    
    # --- Verb inflection patterns ---
    # NOTE: For verb endings we use GENERIC pattern matching instead of base existence
    # checks, because verb stems (without the -j ending) often don't appear in sq.dic
    # as standalone entries.
    
    # Aorist 1sg/2sg: -ova, -ove (e.g., abdikova, abdikove)
    # Aorist 3sg: -oi (e.g., abdikoi)
    # Aorist 1pl/2pl/3pl: -uam, -uat, -uan (e.g., abdikuam, abdikuat, abdikuan)
    if wl.endswith(('ova', 'ove')) and n > 4 and wl[-4] in 'oiua':
        return True
    if wl.endswith('oi') and n > 3 and wl[-3] == 'k':  # conservative: ending in -koi
        return True
    if wl.endswith(('uam', 'uat', 'uan')) and n > 4:
        return True
    
    # Imperfect: -oja, -oje (e.g., abdikoja, abdikoje)
    if wl.endswith(('oja', 'oje')) and n > 4:
        return True
    
    # Imperfect 3sg: -onte, -nin (e.g., abdikonte, abonin)
    if wl.endswith('onte') and n > 5:
        return True
    if wl.endswith('onin') and n > 5:
        return True
    
    # Present 1pl/2pl/3pl: -ojmë, -oni, -ojnë (e.g., abdikojmë, abdikoni, abdikojnë)
    if wl.endswith(('ojmë', 'ojnë')) and n > 4:
        return True
    if wl.endswith('oni') and n > 4:
        return True
    
    # Generic verb stem check: if word ends in a verb inflection suffix,
    # check if the corresponding -oj stem exists.
    # e.g., "afron" (3sg) → "afroj" (1sg), "distancoi" (aorist) → "distancoj"
    # Present 3sg: -on → base + oj = present 1sg
    if wl.endswith('on') and n > 3:
        if wl[:-2] + 'oj' in all_words_lower:
            return True
    
    # Aorist 3sg: -oi → base + oj
    if wl.endswith('oi') and n > 3:
        if wl[:-2] + 'oj' in all_words_lower:
            return True
    
    # Imperfect: -oja, -oje, -onte (e.g., abdikoja, abdikoje, abdikonte)
    if wl.endswith(('oja', 'oje')) and n > 4:
        if wl[:-3] + 'oj' in all_words_lower:
            return True
    
    if wl.endswith('onte') and n > 5:
        if wl[:-4] + 'oj' in all_words_lower:
            return True
    
    # Present 1pl/2pl/3pl: -ojmë, -oni, -ojnë
    if wl.endswith(('ojmë', 'ojnë')) and n > 4:
        if wl[:-4] + 'oj' in all_words_lower:
            return True
    if wl.endswith('oni') and n > 4:
        if wl[:-3] + 'oj' in all_words_lower:
            return True
    
    # Passive/reflexive: -hem, -hesh, -het, -hej, -hen, -heni, -hemi
    for suffix in ['hej', 'hesh', 'het', 'hem', 'hen', 'heni', 'hemi']:
        if wl.endswith(suffix) and n > len(suffix) + 1:
            base = wl[:-len(suffix)]
            if base + 'j' in all_words_lower or base + 'oj' in all_words_lower:
                return True
    
    # Aorist 1sg/2sg: -ova, -ove (if verb stem exists)
    if wl.endswith(('ova', 'ove')) and n > 4:
        if wl[:-3] + 'j' in all_words_lower or wl[:-3] + 'oj' in all_words_lower:
            return True
    
    # Aorist plural: -uam, -uat, -uan
    for suffix in ['uam', 'uat', 'uan']:
        if wl.endswith(suffix) and n > 4:
            base = wl[:-3]
            if base + 'oj' in all_words_lower:
                return True
    
    # Optative: -ka, -ke, -kam, -kem, -kan, -ken
    for suffix in ['ka', 'ke', 'kam', 'kem', 'kan', 'ken']:
        if wl.endswith(suffix) and n > len(suffix) + 1:
            base = wl[:-len(suffix)]
            if base + 'oj' in all_words_lower or base + 'j' in all_words_lower:
                return True
    
    return False


def guess_type_hint(word, flags):
    """Return a basic type hint for the placeholder entry."""
    if not word:
        return None
    first_char = word[0]
    is_upper = first_char.isupper()
    
    if is_upper:
        return "Emër i përveçëm"
    
    if 'DBC' in flags or 'H' in flags:
        return "Folje"
    
    if 'MP' in flags or 'N' in flags or 'M' in flags or 'NKM' in flags:
        return "Mbiemër"
    
    if 'S' in flags:
        return "Mbiemër"
    
    if word.endswith('oj'):
        return "Folje"
    
    if word.endswith(('shëm', 'shme', 'shëmë')):
        return "Mbiemër"
    
    if word.endswith(('ik', 'ak', 'or', 'al', 'iv', 'oz', 'ez', 'ar')):
        return "Mbiemër"
    
    if word.endswith(('ë', 'e', 'a')):
        return "Emër"
    
    return "Emër"


def main():
    entries = load_sq_dic()
    existing_terms = load_existing_terms()
    
    # Build set of all lowercased words for inflection detection
    all_words_lower = {w.lower() for w, _, _ in entries}
    
    # Counters for reporting
    stats = Counter()
    placeholder_candidates = []
    
    for word, flags, has_flags in entries:
        word_up = word.upper()
        
        # Skip entries already in the database
        if word_up in existing_terms:
            stats['existing'] += 1
            continue
        
        # Skip very short words (1 character)
        if len(word) <= 1:
            stats['too_short'] += 1
            continue
        
        # Skip entries with non-letter characters (except hyphens)
        if not re.match(r'^[a-zA-ZëËçÇäÄöÖüÜ][a-zA-ZëËçÇäÄöÖüÜ-]*$', word):
            stats['special_chars'] += 1
            continue
        
        # --- INFLECTION DETECTION ---
        
        # A) Known inflection flags (ground truth from Hunspell affix rules)
        if has_flags and (flags & INFLECTION_FLAGS):
            stats['inflection_flag'] += 1
            continue
        
        # B) Morphological check -- for unflagged and non-inflection-flag entries
        if is_likely_inflection(word, all_words_lower):
            stats['inflection_morph'] += 1
            continue
        
        # --- LEMMA DETECTION ---
        
        # Known lemma flags
        if has_flags and (flags & LEMMA_FLAGS):
            placeholder_candidates.append((word, flags))
            stats['lemma_flag'] += 1
            continue
        
        # Ambiguous flags that passed morphological check
        if has_flags and (flags & AMBIGUOUS_FLAGS):
            placeholder_candidates.append((word, flags))
            stats['ambiguous_lemma'] += 1
            continue
        
        # Unknown flags -- include conservatively as lemma
        if has_flags:
            placeholder_candidates.append((word, flags))
            stats['unknown_flag'] += 1
            continue
        
        # No flags -- only keep if it looks like a proper name lemma
        if word[0].isupper():
            placeholder_candidates.append((word, flags))
            stats['unflagged_proper_lemma'] += 1
            continue
        
        # Skip remaining lowercased unflagged entries (generated inflections)
        stats['unflagged_lower'] += 1
    
    # Deduplicate by uppercase word (keep first occurrence)
    seen = {}
    for word, flags in placeholder_candidates:
        key = word.upper()
        if key not in seen:
            seen[key] = (word, flags)
    
    placeholder_candidates = list(seen.values())
    placeholder_candidates.sort(key=lambda x: x[0].lower())
    
    # Build output in ScrapedEntry-compatible format
    output = []
    for word, flags in placeholder_candidates:
        entry = {
            "term": f"{word.upper()} {guess_type_hint(word, flags)}. " if guess_type_hint(word, flags) else word.upper(),
            "definition": [],
            "placeholder": True
        }
        output.append(entry)
    
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    # Report
    print("=== STATS ===")
    print(f"Total sq.dic entries:        {len(entries)}")
    print(f"Already in DB:               {stats['existing']}")
    print(f"Too short / special chars:   {stats.get('too_short',0) + stats.get('special_chars',0)}")
    print()
    print(f"--- Included as placeholders ---")
    print(f"Lemma flags (passed):        {stats['lemma_flag']}")
    print(f"Unflagged proper lemmas:     {stats['unflagged_proper_lemma']}")
    print(f"Ambiguous flags (lemma):     {stats['ambiguous_lemma']}")
    print(f"Unknown flags:               {stats['unknown_flag']}")
    print(f"TOTAL placeholder entries:   {len(output)}")
    print()
    print(f"--- Excluded (inflections) ---")
    print(f"Inflection flags:            {stats['inflection_flag']}")
    print(f"Inflections (morph check):   {stats['inflection_morph']}")
    print(f"Unflagged lowercase:         {stats['unflagged_lower']}")
    print(f"Output written to: {OUTPUT}")


if __name__ == '__main__':
    main()
