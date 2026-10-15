#!/usr/bin/env bash
# Builds both release artifacts the executable service serves as templates:
#   - the Android APK   (npm run build:apk  -> dist/device-owner.apk)
#   - the Linux installer (npm run build:linux -> dist/executable-linux)
#
# Pulls the keystore password from apps/executable/.env (needed to sign the APK with the
# lockdown-release.jks on disk) unless it is already set in the environment, so a one-off works:
#   ANDROID_KEYSTORE_PASSWORD=other ./scripts/build-all.sh
# Only this one var is read on purpose: sourcing the whole .env would also pull in
# ANDROID_KEYSTORE_BASE64, which makes generate_apk.sh decode a keystore from that string
# instead of using the .jks file - and the .env's value isn't a valid keystore.
#
# Usage (from anywhere):
#   apps/executable/scripts/build-all.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${ANDROID_KEYSTORE_PASSWORD:-}" && -f "$ROOT/.env" ]]; then
  line="$(grep -E '^ANDROID_KEYSTORE_PASSWORD=' "$ROOT/.env" | head -1)"
  if [[ -n "$line" ]]; then
    val="${line#ANDROID_KEYSTORE_PASSWORD=}"
    val="${val%$'\r'}"          # tolerate CRLF
    val="${val%\"}"; val="${val#\"}"   # strip surrounding double quotes if any
    export ANDROID_KEYSTORE_PASSWORD="$val"
  fi
fi

if [[ -z "${ANDROID_KEYSTORE_PASSWORD:-}" ]]; then
  echo "ERROR: ANDROID_KEYSTORE_PASSWORD is not set (expected in $ROOT/.env or the environment)" >&2
  exit 1
fi

echo "==> Building the APK"
npm run build:apk

echo "==> Building the Linux installer"
npm run build:linux

echo "==> Done. Artifacts in $ROOT/dist:"
ls -la "$ROOT/dist/device-owner.apk" "$ROOT/dist/executable-linux"
