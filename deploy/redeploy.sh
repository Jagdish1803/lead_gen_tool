#!/usr/bin/env bash
# Pull the latest code and restart the app on the VPS.
#   bash deploy/redeploy.sh
set -e
cd "$(dirname "$0")/.."
echo "→ Pulling latest…"
git pull origin main
echo "→ Installing deps…"
npm install
echo "→ Building…"
npm run build
echo "→ Reloading PM2…"
pm2 reload pitching-tool
echo "✓ Done. Live now."
