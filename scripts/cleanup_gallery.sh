#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_DIR="$ROOT/.archive_js_duplicates/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

echo "Archivando JS duplicados y archivos de plantilla innecesarios en: $ARCHIVE_DIR"

# Archivar copias en templates y duplicados comunes
FILES=(
  "$ROOT/src/web/templates/modules/gallery/gallery_functions.js"
  "$ROOT/src/web/templates/modules/gallery/gallery_functions.js.bak"
  "$ROOT/src/web/static/js/gallery.js"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    echo " -> Moviendo $f"
    mkdir -p "$(dirname "$ARCHIVE_DIR/${f#$ROOT/}")"
    mv "$f" "$ARCHIVE_DIR/"
  else
    echo " -> No existe: $f"
  fi
done

echo "Hecho. Revisa $ARCHIVE_DIR y fusiona código necesario en src/web/static/js/modules/gallery/gallery_functions.js si procede."

echo "Sugerencia: luego commit: git add -A && git commit -m 'chore: archive legacy gallery duplicates'"
