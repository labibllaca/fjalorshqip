import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Building Vite app...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('Copying SQLite DB...');
const DIST_API = path.resolve(__dirname, '../../dist/api');
if (!fs.existsSync(DIST_API)) fs.mkdirSync(DIST_API, { recursive: true });
fs.cpSync(
  path.resolve(__dirname, '../data/gen/fjalor.db'),
  path.join(DIST_API, 'fjalor.db'),
  { force: true }
);

console.log('Generating static word pages...');
execSync('node src/scripts/ssg.mjs', { stdio: 'inherit' });

console.log('Build complete.');
