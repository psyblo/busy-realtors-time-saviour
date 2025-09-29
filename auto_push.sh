#!/bin/bash
set -euo pipefail

LOGFILE="auto_push.log"
echo "===== Auto-push started at $(date) =====" | tee -a "$LOGFILE"

while true; do
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "Codex auto-update 🚀" || true
    git push origin main && echo "$(date)  Pushed OK" | tee -a "$LOGFILE"
  fi
  sleep 60
done

