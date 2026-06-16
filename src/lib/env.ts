import { config } from 'dotenv';

config();

export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

export const shouldSkipStaticWordPages = () => {
  return process.env.SHOULD_SKIP_STATIC_WORD_PAGES === 'true';
};

export const isCloudflarePages = () => {
  return process.env.CLOUDFLARE === 'true';
};

export const getDictionarySubset = (): string[] => {
  return JSON.parse(process.env.DICTIONARY_SUBSET || '[]');
};
