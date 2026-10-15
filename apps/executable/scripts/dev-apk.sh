#!/usr/bin/env bash
# Fast dev loop for the device owner app: rebuilds the release APK incrementally
# (gradle daemon kept warm), signs it with lockdown-release.jks so it updates the
# installed app in place, and installs it over adb - no frontend/installer round trip.
#
# The chatbot config the installed APK carries in its signing block is pulled from
# the phone and copied into the new build, so the app keeps its params.
#
# Usage (from anywhere, phone plugged in with USB debugging on):
#   apps/executable/scripts/dev-apk.sh
#   ANDROID_SERIAL=0063233159 apps/executable/scripts/dev-apk.sh   # with several devices
#   CONFIG_JSON=path/to/config.json apps/executable/scripts/dev-apk.sh  # use this config instead
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/src/android"
PACKAGE="com.lockdown.mdm"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Same key resolution as build-all.sh: the .jks on disk plus only the password from .env.
export ANDROID_KEYSTORE_PATH="${ANDROID_KEYSTORE_PATH:-$ROOT/lockdown-release.jks}"
if [[ -z "${ANDROID_KEYSTORE_PASSWORD:-}" && -f "$ROOT/.env" ]]; then
  line="$(grep -E '^ANDROID_KEYSTORE_PASSWORD=' "$ROOT/.env" | head -1)"
  val="${line#ANDROID_KEYSTORE_PASSWORD=}"; val="${val%$'\r'}"; val="${val%\"}"; val="${val#\"}"
  export ANDROID_KEYSTORE_PASSWORD="$val"
fi
if [[ ! -f "$ANDROID_KEYSTORE_PATH" || -z "${ANDROID_KEYSTORE_PASSWORD:-}" ]]; then
  echo "ERROR: need $ANDROID_KEYSTORE_PATH and ANDROID_KEYSTORE_PASSWORD (in $ROOT/.env or the environment)" >&2
  exit 1
fi
unset ANDROID_KEYSTORE_BASE64

adb wait-for-device

INSTALLED="$WORK/installed.apk"
if [[ -n "${CONFIG_JSON:-}" ]]; then
  echo "==> Using config from $CONFIG_JSON"
elif remote="$(adb shell pm path "$PACKAGE" | tr -d '\r' | sed -n 's/^package://p' | head -1)" && [[ -n "$remote" ]]; then
  echo "==> Pulling the installed APK to keep its config"
  adb pull "$remote" "$INSTALLED" >/dev/null
else
  echo "==> $PACKAGE not installed yet; building with the Constants.kt defaults"
fi

echo "==> Building"
(cd "$ANDROID_DIR" && ./gradlew assembleRelease)
APK="$WORK/app.apk"
cp "$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk" "$APK"

cd "$ROOT"
if [[ -n "${CONFIG_JSON:-}" ]]; then
  npx tsx -e "
    const fs = require('node:fs');
    const { embedApkConfig } = require('./src/apk-config');
    fs.writeFileSync(process.argv[1], embedApkConfig(fs.readFileSync(process.argv[1]), JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))));
  " "$APK" "$CONFIG_JSON"
elif [[ -f "$INSTALLED" ]]; then
  npx tsx scripts/copy-apk-config.ts "$INSTALLED" "$APK"
fi

echo "==> Installing"
adb install -r "$APK"
# Best effort: some builds block shell from starting a device owner's activities.
adb shell am start -n "$PACKAGE/.MainActivity" >/dev/null 2>&1 || true
echo "==> Done"
