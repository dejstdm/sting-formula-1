#!/usr/bin/env bash
# Generate one image through Codex's image tool.
# Usage: ./gen.sh <name> <prompt-file> [reference images...]
# Writes gen/<name>.png and logs to gen/<name>.log.
set -euo pipefail
cd "$(dirname "$0")"
name=$1; promptfile=$2; shift 2
refs=()
for r in "$@"; do refs+=(-i "$r"); done
{
  echo "Use your image generation tool to create exactly ONE image, then copy the resulting PNG to ./gen/${name}.png. Do not edit, crop or post-process it. Print the saved path when done."
  echo
  cat "$promptfile"
} | timeout 900 codex exec --skip-git-repo-check -s workspace-write "${refs[@]}" - > "gen/${name}.log" 2>&1
test -f "gen/${name}.png" && echo "ok ${name}" || echo "FAILED ${name} (see gen/${name}.log)"
