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
KEYSTORE_TMP=""
restore() {
    cp "$BACKUP_FILE" "$CONSTANTS_FILE"
    rm -f "$BACKUP_FILE"
    [ -n "$KEYSTORE_TMP" ] && rm -f "$KEYSTORE_TMP"
    return 0  # last status becomes the script's exit code via the EXIT trap
}
trap restore EXIT

# Constant release signing key (see app/build.gradle), resolved in order:
#   1. ANDROID_KEYSTORE_PATH  - an explicit keystore file
#   2. ANDROID_KEYSTORE_BASE64 - the keystore base64 (one secret), decoded here
#   3. the default file next to the app, reused across builds
#   4. generated at the default path the first time, then kept for next time
# The signature is constant as long as one of these keeps pointing at the same
# key - which is what lets an installed app be updated in place (pm install -r).
DEFAULT_KEYSTORE="$(cd .. && cd .. && pwd)/lockdown-release.jks"  # apps/executable/lockdown-release.jks
KEY_ALIAS="${ANDROID_KEY_ALIAS:-lockdown}"

if [ -z "${ANDROID_KEYSTORE_PATH:-}" ] && [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
    KEYSTORE_TMP="$(mktemp)"
    printf '%s' "${ANDROID_KEYSTORE_BASE64}" | base64 -d > "$KEYSTORE_TMP"
    export ANDROID_KEYSTORE_PATH="$KEYSTORE_TMP"
fi
if [ -z "${ANDROID_KEYSTORE_PATH:-}" ] && [ -f "$DEFAULT_KEYSTORE" ]; then
    export ANDROID_KEYSTORE_PATH="$DEFAULT_KEYSTORE"
fi
if [ -z "${ANDROID_KEYSTORE_PATH:-}" ]; then
    # No keystore anywhere yet: create the constant one once and keep it.
    if [ -z "${ANDROID_KEYSTORE_PASSWORD:-}" ]; then
        ANDROID_KEYSTORE_PASSWORD="$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 28)"
        export ANDROID_KEYSTORE_PASSWORD
        echo "Generated a random keystore password: ${ANDROID_KEYSTORE_PASSWORD}"
    fi
    echo "No release keystore found; generating one at ${DEFAULT_KEYSTORE}"
    keytool -genkeypair -v \
        -keystore "$DEFAULT_KEYSTORE" \
        -alias "$KEY_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass "$ANDROID_KEYSTORE_PASSWORD" \
        -keypass "${ANDROID_KEY_PASSWORD:-$ANDROID_KEYSTORE_PASSWORD}" \
        -dname "CN=Lockdown MDM, O=Lockdown, C=BR"
    export ANDROID_KEYSTORE_PATH="$DEFAULT_KEYSTORE"
    echo "SAVE THIS KEY - without it you can't update installed apps. To reuse it"
    echo "in Docker/CI builds, store its base64 and password as secrets:"
    echo "  ANDROID_KEYSTORE_BASE64=\$(base64 -w0 \"$DEFAULT_KEYSTORE\")"
    echo "  ANDROID_KEYSTORE_PASSWORD=${ANDROID_KEYSTORE_PASSWORD}"
fi
if [ -z "${ANDROID_KEYSTORE_PASSWORD:-}" ]; then
    echo "ERROR: keystore ${ANDROID_KEYSTORE_PATH} needs ANDROID_KEYSTORE_PASSWORD set" >&2
    exit 1
fi
echo "Signing the release APK with the keystore at ${ANDROID_KEYSTORE_PATH}"

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
