#!/usr/bin/env bash
# Bulk-install VS Code extensions into Antigravity via its CLI.
set -euo pipefail

SRC="$HOME/vscode-extensions-uniq.txt"
FAILED="$HOME/antigravity-install-failed.txt"
LOG="$HOME/antigravity-install-log.txt"

: > "$FAILED"
: > "$LOG"

if ! command -v antigravity >/dev/null 2>&1; then
  echo "Antigravity CLI not found; install it or ensure it's on PATH." | tee -a "$LOG"
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "Source list $SRC not found. Run ./scripts/export-and-prepare.sh first." | tee -a "$LOG"
  exit 1
fi

while IFS= read -r ext; do
  [ -z "$ext" ] && continue
  echo "Installing $ext ..." | tee -a "$LOG"
  if antigravity extension install "$ext" >>"$LOG" 2>&1 || antigravity install-extension "$ext" >>"$LOG" 2>&1; then
    echo "OK: $ext" | tee -a "$LOG"
  else
    echo "FAILED: $ext" | tee -a "$LOG"
    echo "$ext" >> "$FAILED"
  fi
done < "$SRC"

echo "Install complete. Failed installs (if any): $FAILED"
echo "See $LOG for details."
