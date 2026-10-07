#!/usr/bin/env bash
# Builds libwdi's wdi-simple.exe (WinUSB driver installer used on Windows) by
# cross-compiling with MinGW inside Docker. Output: vendor/wdi/wdi-simple.exe
# Skipped when the output already exists; delete it to rebuild.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/vendor/wdi"
OUT="$OUT_DIR/wdi-simple.exe"

LIBWDI_VERSION="1.5.1"
LIBWDI_URL="https://github.com/pbatard/libwdi/archive/refs/tags/v${LIBWDI_VERSION}.tar.gz"
LIBWDI_SHA256="a695e93db0977dfdc5c6a99a4ea91b22f9027547d0177b2a0f3075078643c929"
# Windows 8.0 Driver Kit redistributables (WinUSB/WDF coinstallers), required by libwdi.
WDK_URL="https://download.microsoft.com/download/0/5/F/05FD6919-6250-425B-86ED-9B095E54065A/wdfcoinstaller.msi"
WDK_SHA256="29314207814ce9d5d73695f7e9239539cf37c79e750b9d5ea5a5ef5487a583d6"

export LIBWDI_URL LIBWDI_SHA256 WDK_URL WDK_SHA256

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
  -e LIBWDI_URL -e LIBWDI_SHA256 -e WDK_URL -e WDK_SHA256 \
  -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  debian:bookworm bash -euo pipefail -c '
    apt-get update -qq >/dev/null
    apt-get install -y -qq --no-install-recommends \
      mingw-w64 autoconf automake libtool make gcc libc6-dev msitools curl ca-certificates >/dev/null

    mkdir /work && cd /work
    curl -fsSL "$LIBWDI_URL" -o libwdi.tar.gz
    curl -fsSL "$WDK_URL" -o wdk.msi
    echo "$LIBWDI_SHA256  libwdi.tar.gz" | sha256sum -c -
    echo "$WDK_SHA256  wdk.msi" | sha256sum -c -

    mkdir wdk-msi && (cd wdk-msi && msiextract ../wdk.msi >/dev/null)
    mv "wdk-msi/Program Files/Windows Kits/8.0" /work/wdk
    mkdir libwdi && tar -xzf libwdi.tar.gz -C libwdi --strip-components=1

    cd libwdi
    ./bootstrap.sh >/dev/null 2>&1
    ./configure --build=x86_64-linux-gnu --host=x86_64-w64-mingw32 --disable-32bit \
      --enable-examples-build --disable-debug --with-wdkdir=/work/wdk --with-wdfver=1011 \
      LDFLAGS="-static" >/dev/null
    # configure skips WDK layout detection when cross-compiling; set it for the WDK 8.0 redist.
    test -f /work/wdk/redist/wdf/x64/winusbcoinstaller2.dll
    printf "#define COINSTALLER_DIR \"wdf\"\n#define X64_DIR \"x64\"\n" >> config.h
    make -j"$(nproc)" >/dev/null
    x86_64-w64-mingw32-strip examples/.libs/wdi-simple.exe 2>/dev/null || x86_64-w64-mingw32-strip examples/wdi-simple.exe
    cp examples/.libs/wdi-simple.exe /out/ 2>/dev/null || cp examples/wdi-simple.exe /out/
    chown "$HOST_UID:$HOST_GID" /out/wdi-simple.exe
  '
echo "Built $OUT"
