#!/bin/bash
while true; do
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "Codex auto-update 🚀"
    git push origin main
  fi
  sleep 60
done

