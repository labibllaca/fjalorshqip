import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../data/gen/fjalor.db');
const dest = resolve(__dirname, '../../public/api');

if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
cpSync(SRC, join(dest, 'fjalor.db'), { force: true });
console.log('Copied fjalor.db → public/api/');
