#!/usr/bin/env bash
set -e

read -p "A po e nisni aplikacionin lokal apo në server? (lokal/server): " choice

if [ "$choice" = "lokal" ]; then
  npm rebuild better-sqlite3 && npm run dev
elif [ "$choice" = "server" ]; then
  gitpastro && npm rebuild better-sqlite3 && npm run build && pmr fjalor
else
  echo "Zgjedhje e pavlefshme. Shkruani 'lokal' ose 'server'."
  exit 1
fi
