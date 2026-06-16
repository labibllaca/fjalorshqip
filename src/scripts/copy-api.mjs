import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.resolve(__dirname, '../data/gen');
const PUBLIC_API = path.resolve(__dirname, '../../public/api');

if (!fs.existsSync(PUBLIC_API)) fs.mkdirSync(PUBLIC_API, { recursive: true });
fs.cpSync(path.join(GEN_DIR, 'fjalor.db'), path.join(PUBLIC_API, 'fjalor.db'), { force: true });
console.log('Copied fjalor.db → public/api/');
