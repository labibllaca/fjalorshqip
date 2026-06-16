const NON_ALPHA_REGEX = /[^a-zA-Z]/g;
const WHITESPACE_REGEX = /\s+/;

export const getStems = (term: string) => {
  return term
    .toLowerCase()
    .replaceAll('ë', 'e')
    .replaceAll('ç', 'c')
    .split(WHITESPACE_REGEX)
    .map((word) => word.replace(NON_ALPHA_REGEX, ''))
    .filter((word) => word !== '');
};

export const getSlug = (term: string) => {
  return term
    .toLowerCase()
    .replaceAll('ë', 'ee')
    .replaceAll('ç', 'cc')
    .split(WHITESPACE_REGEX)
    .map((word) => word.replace(NON_ALPHA_REGEX, ''))
    .filter((word) => word !== '')
    .join('-');
};

export const getStemPrefix = (stem: string) => {
  if (stem.length >= 3) {
    return stem.substring(0, 3);
  } else {
    return '_';
  }
};
