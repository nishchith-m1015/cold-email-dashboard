#!/usr/bin/env bash
# Export installed VS Code extensions and repo recommendations, then merge/uniq
set -euo pipefail

OUT_HOME=${HOME}
EXT_FILE="$OUT_HOME/vscode-extensions.txt"
REPO_RECS="$OUT_HOME/vscode-project-recommendations.txt"
UNIQ_OUT="$OUT_HOME/vscode-extensions-uniq.txt"

echo "Exporting installed VS Code extensions to $EXT_FILE"
code --list-extensions > "$EXT_FILE"

if [ -f .vscode/extensions.json ]; then
  echo "Found .vscode/extensions.json, extracting recommendations to $REPO_RECS"
  jq -r '.recommendations[]' .vscode/extensions.json > "$REPO_RECS"
else
  echo "No .vscode/extensions.json found in repo — creating a minimal recommendations file."
  mkdir -p .vscode
  cat > .vscode/extensions.json <<'JSON'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "eamodio.gitlens",
    "ms-azuretools.vscode-docker",
    "GitHub.copilot",
    "redhat.vscode-yaml"
  ],
  "unwantedRecommendations": []
}
JSON
  jq -r '.recommendations[]' .vscode/extensions.json > "$REPO_RECS"
fi

echo "Merging and deduplicating into $UNIQ_OUT"
cat "$EXT_FILE" "$REPO_RECS" | grep -v '^$' | sort -u > "$UNIQ_OUT"

echo "Done. Unique extensions list: $UNIQ_OUT"
echo "Preview (first 50 lines):"
head -n 50 "$UNIQ_OUT" || true

echo "If you want to proceed with bulk install, run: ./scripts/install-antigravity.sh"
