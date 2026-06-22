import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EXT_DIR = resolve(ROOT, 'webextension');
const XPI = resolve(ROOT, 'fjalor-shqip.xpi');

if (existsSync(XPI)) rmSync(XPI);

execSync(`cd "${EXT_DIR}" && zip -r "${XPI}" . -x "*.DS_Store"`, { stdio: 'inherit' });

cpSync(XPI, resolve(ROOT, 'public/fjalor-shqip.xpi'), { force: true });

// Vite copies public/ to dist/ during build, so no need to copy to dist/ separately
console.log('Extension packaged → fjalor-shqip.xpi');
