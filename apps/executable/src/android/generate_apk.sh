#!/usr/bin/env bash
# Builds the Lockdown MDM APK.
#
# Optional overrides (edit Constants.kt permanently, or pass here for a one-off build):
#   DNS_HOST      - the locked private DNS hostname (default: b33522.dns.nextdns.io)
#   ADMIN_PASSWORD - the adb control password (default: 1234). Only its SHA-256 is embedded.
#
# Usage:
#   ./generate_apk.sh                                   # build with defaults from Constants.kt
#   DNS_HOST=custom.dns.example ADMIN_PASSWORD=secret ./generate_apk.sh
#
# Output: ./output/LockdownMDM-release.apk (and -debug.apk)

set -euo pipefail
cd "$(dirname "$0")"

CONSTANTS_FILE="app/src/main/java/com/lockdown/mdm/Constants.kt"
BACKUP_FILE="$(mktemp)"
cp "$CONSTANTS_FILE" "$BACKUP_FILE"
restore() { cp "$BACKUP_FILE" "$CONSTANTS_FILE"; rm -f "$BACKUP_FILE"; }
trap restore EXIT

if [ -n "${DNS_HOST:-}" ]; then
    sed -i "s|LOCKED_PRIVATE_DNS_HOST = \".*\"|LOCKED_PRIVATE_DNS_HOST = \"${DNS_HOST}\"|" "$CONSTANTS_FILE"
    echo "Using DNS host: ${DNS_HOST}"
fi

if [ -n "${ADMIN_PASSWORD:-}" ]; then
    HASH=$(printf '%s' "${ADMIN_PASSWORD}" | sha256sum | cut -d' ' -f1)
    python3 - "$CONSTANTS_FILE" "$HASH" <<'PYEOF'
import re, sys
path, new_hash = sys.argv[1], sys.argv[2]
text = open(path).read()
text = re.sub(r'CONTROL_PASSWORD_SHA256 =\s*\n\s*"[0-9a-f]{64}"',
              f'CONTROL_PASSWORD_SHA256 =\n        "{new_hash}"', text)
open(path, "w").write(text)
PYEOF
    echo "Using custom admin password (SHA-256 embedded, plaintext discarded)"
fi

ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/home/dell/android-sdk}" ./gradlew assembleDebug assembleRelease --no-daemon

mkdir -p output
cp app/build/outputs/apk/release/app-release.apk output/LockdownMDM-release.apk
cp app/build/outputs/apk/debug/app-debug.apk output/LockdownMDM-debug.apk

echo
echo "Built:"
echo "  output/LockdownMDM-release.apk"
echo "  output/LockdownMDM-debug.apk"
