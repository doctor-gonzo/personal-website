#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$ROOT/.codex/scratch/public-release-$(date +%Y%m%d-%H%M%S)}"

if [[ -e "$DEST" ]]; then
  echo "Destination already exists; choose a new empty path: $DEST" >&2
  exit 1
fi

mkdir -p "$DEST"

while IFS= read -r -d '' path; do
  case "$path" in
    future/*|TODO/*|.codex/*|.claude/*|.vscode/*|nfts/*|nfts.html|nfts.html.md|featured-nfts.js)
      continue
      ;;
  esac

  mkdir -p "$DEST/$(dirname "$path")"
  cp -p "$ROOT/$path" "$DEST/$path"
done < <(git -C "$ROOT" ls-files -co --exclude-standard -z)

if rg -n \
  'your-domain\.example|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}' \
  "$DEST" \
  -g '*.html' -g '*.md' -g '*.txt' -g '*.js' -g '*.json' -g '*.xml' -g '*.yml' -g '*.yaml'; then
  echo "Public release blocked: review the matches above." >&2
  exit 1
fi

echo "Prepared clean public snapshot: $DEST"
