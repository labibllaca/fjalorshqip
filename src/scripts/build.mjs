import { execSync } from 'child_process';
import { copyDb } from './copy-db.mjs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

console.log('Building Vite app...');
execSync('npx vite build', { stdio: 'inherit' });

copyDb(resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/api'));
console.log('Build complete.');
