const SUFFIXES = [
  'shin', 'nit', 'nte', 'shte',
  'se', 'te', 've', 'sh', 'n',
  'i', 'e', 'a', 'u', 't', 's', 'h'
];

function normalize(word) {
  return word.toLowerCase().replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/[^a-z]/g, '');
}

function tryStrip(word) {
  const candidates = [word];
  for (const sfx of SUFFIXES) {
    if (word.length > sfx.length + 1 && word.endsWith(sfx)) {
      candidates.push(word.slice(0, -sfx.length));
    }
  }
  return [...new Set(candidates)];
}
