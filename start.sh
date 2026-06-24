#!/usr/bin/env bash
set -e

read -p "A po e nisni aplikacionin lokal apo në server? (1/2/3): " choice

if [ "$choice" = "1" ]; then
  npm rebuild better-sqlite3 && npm run dev
elif [ "$choice" = "2" ]; then
  $gitpastro && npm rebuild better-sqlite3 && npm run build && pmr fjalor
elif [ "$choice" = "3" ]; then
  docker compose up -d --build
else
  echo "Zgjedhje e pavlefshme. Shkruani '1', '2' ose '3'."
  exit 1
fi
