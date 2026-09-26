#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

for file in index.html creators.csv _headers; do
  test -f "$file" || { printf 'Missing required file: %s\n' "$file" >&2; exit 1; }
done
test -d assets || { printf 'Missing required directory: assets\n' >&2; exit 1; }

if [ -e dist ]; then
  archive_root=.wrangler/dist-archive
  mkdir -p "$archive_root"
  archive_path="$archive_root/$(date +%Y%m%d)_dist"
  version=2
  while [ -e "$archive_path" ]; do
    archive_path="$archive_root/$(date +%Y%m%d)_dist_v${version}"
    version=$((version + 1))
  done
  mv dist "$archive_path"
  printf 'Moved dist to %s (restore: mv %s dist)\n' "$archive_path" "$archive_path"
fi

mkdir dist
cp index.html creators.csv _headers dist/
cp -R assets dist/
