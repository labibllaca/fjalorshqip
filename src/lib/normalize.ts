export function foldDiacritic(s: string): string {
  return s.toLowerCase().replace(/ë/g, 'e').replace(/ç/g, 'c');
}
