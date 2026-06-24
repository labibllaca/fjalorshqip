#!/usr/bin/env bash
set -e

read -p "A po e nisni aplikacionin lokal apo në server? (1/2): " choice

if [ "$choice" = "1" ]; then
  npm rebuild better-sqlite3 && npm run dev
elif [ "$choice" = "2" ]; then
  gitpastro && npm rebuild better-sqlite3 && npm run build && pmr fjalor
else
  echo "Zgjedhje e pavlefshme. Shkruani '1' ose '2'."
  exit 1
fi
