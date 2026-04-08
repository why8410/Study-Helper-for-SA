#!/bin/zsh

set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$BASE_DIR"
python3 scripts/build_release_bundle.py

echo ""
echo "릴리스 폴더:"
echo "$BASE_DIR/release/study-helper-for-sa-tablet-web"
