const MAP: Record<string, string> = {
  'em.': 'emër',
  'f.': 'femër',
  'm.': 'mashkullor',
  'mb.': 'mbiemër',
  'nd.': 'ndajfolje',
  'fol.': 'folje',
  'lidh.': 'lidhëz',
  'paraf.': 'parafjalë',
  'përem.': 'përemër',
  'num.': 'numëror',
  'pasth.': 'pasthirrmë',
  'art.': 'artikull',
  'pjes.': 'pjesëz',
  'jokal.': 'jokalimtar',
  'kal.': 'kalimtar',
  'sh.': 'shumës',
  'nj.': 'njëjës',
  'krh.': 'krahasore',
  'bised.': 'bisedor',
  'fig.': 'figurativ',
  'th.': 'thjesht',
  'anat.': 'anatomi',
  'bot.': 'botanikë',
  'hist.': 'histori',
  'kim.': 'kimi',
  'mat.': 'matematikë',
  'mjek.': 'mjekësi',
  'gjeog.': 'gjeografi',
  'gju.': 'gjuhësi',
  'let.': 'letërsi',
  'usht.': 'ushtarak',
  'drejt.': 'drejtësi',
  'ekon.': 'ekonomi',
  'fet.': 'fetar',
  'përk.': 'përkthim',
};

export function expandAbbr(attr: string): string {
  const parts = attr.split('.').filter(Boolean);
  return parts.map(p => MAP[p + '.'] || p + '.').join(' ');
}

export function expandAttrs(attrs: string[]): string {
  return attrs.map(expandAbbr).join(', ');
}
