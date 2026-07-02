import { copyDb } from './copy-db.mjs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

copyDb(resolve(dirname(fileURLToPath(import.meta.url)), '../../public/api'));
