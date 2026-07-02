import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../data/gen/fjalor.db');

export function copyDb(dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(SRC, path.join(dest, 'fjalor.db'), { force: true });
  console.log(`Copied fjalor.db → ${path.relative(process.cwd(), dest)}/`);
}
