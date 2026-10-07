#!/usr/bin/env bash
# Builds libwdi's wdi-simple.exe (WinUSB driver installer used on Windows) by
# cross-compiling with MinGW inside Docker (see compile-wdi-simple.sh).
# Output: vendor/wdi/wdi-simple.exe
# Skipped when the output already exists; delete it to rebuild.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/vendor/wdi"
OUT="$OUT_DIR/wdi-simple.exe"

if [[ -f "$OUT" ]]; then
  echo "wdi-simple.exe already built ($OUT)"
  exit 0
fi

if ! command -v docker >/dev/null; then
  echo "Docker is required to build wdi-simple.exe" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
docker run --rm \
  -v "$OUT_DIR:/out" \
  -v "$ROOT/scripts/compile-wdi-simple.sh:/compile-wdi-simple.sh:ro" \
  -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  debian:bookworm bash -euo pipefail -c '
    bash /compile-wdi-simple.sh /out
    chown "$HOST_UID:$HOST_GID" /out/wdi-simple.exe
  '
echo "Built $OUT"
