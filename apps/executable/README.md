# executable

TypeScript port of [`local-executable`](../local-executable): a Node.js app packaged as a standalone executable (no Node install needed) for Linux, Windows and macOS. Logs go to the terminal.

## Usage

```bash
npm install --workspaces=false   # standalone install, like local-executable
npm start            # run src/index.ts with tsx
npm run check-types  # tsc type check (also runs before every build)
npm run build        # build all platforms into dist/
npm run build:linux  # or a single platform
npm run build:win
npm run build:mac
npm run build:apk    # device owner APK template into dist/device-owner.apk
npm run watch:installer  # dev: rebuild dist/executable-linux on every src change
npm run serve:watch  # dev: the installer service, restarted on changes
```

The installer binary (what runs on the user's PC) is the pkg output in `dist/`,
so **a change to the installer's own code** (`src/index.ts`, `device-owner.ts`,
`adb.ts`, `embedded-config.ts`, `terminal.ts`, `usb-permissions.ts`,
`constants.ts`) needs a rebuild of `dist/` to take effect; a change to the
HTTP service alone (`src/server.ts`, `apk-config.ts`, `auth.ts`) does not (in
dev it runs from source via `npm run serve`). `npm run watch:installer`
(nodemon) rebuilds `dist/executable-linux` automatically on each change to the
installer sources — run `npm run build:linux` once first so the native modules
are fetched. The binary is written to a temp file and renamed, so a download
never picks up a half-written template. In prod the Dockerfile always rebuilds
from source, so this only matters for local dev.

In docker compose dev, the `executable` container runs both: the service with
`npm run serve:watch` (restarts on changes) and `npm run watch:installer`, so
the next installer downloaded from the chat already has the latest code (wait
for nodemon's "clean exit" after a change). It runs as the `node` user (UID
1000) so `dist/` stays owned by the host user. The service prefers
`dist/executable-linux-x64` (from `npm run build`) over `executable-linux`:
delete it, or the watcher's rebuilds won't be served.

Output in `dist/`:

| File | Platform |
|---|---|
| `executable-linux-x64` | Linux |
| `executable-win-x64.exe` | Windows |
| `executable-macos-x64` | macOS Intel |
| `executable-macos-arm64` | macOS Apple Silicon |

## Installer service (`npm run serve`)

`src/server.ts` is an HTTP service the chatbot calls from its "Gerar instalador"
button. The binaries and `dist/device-owner.apk` are templates. Each request:

1. writes the params collected by the chatbot into a copy of the APK
   (`src/apk-config.ts`, see [Device owner APK](#device-owner-apk));
2. appends the params and that APK to a copy of the binary for the user's OS
   (`src/embedded-config.ts`), which the executable reads from itself on start;
3. uploads it to the `BUCKET_NAME` S3 bucket (`installers/<id>/<filename>`). The
   response carries a presigned download URL, which the chatbot hands the user.

Every installer is delivered as a `.zip` (`device-owner-installer-<os>.zip`): an
HTTP/S3 download doesn't carry the executable bit, so a raw Linux/macOS binary
would arrive without it and the OS would refuse to run it. zip stores the mode
(0755), so the extracted binary runs with no `chmod`, and `.zip` opens natively
on Windows too (unlike `.tar.gz`). The service needs the `zip` tool (installed
in both Dockerfiles).

| Route | |
|---|---|
| `POST /executables` | `{ platform: "linux" \| "windows" \| "macos", config }` → `201 { id, filename, url }` (`url` valid for `EXECUTABLE_URL_TTL_S`, 1 h) |
| `GET /health` | `ok` |

Env (see `.env.example`): `BUCKET_NAME` (required), `AWS_REGION`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or any other AWS credential
source), `EXECUTABLE_PORT` (5005), `EXECUTABLE_TEMPLATES_DIR` (`dist/`),
`EXECUTABLE_APK_TEMPLATE` (`<templates dir>/device-owner.apk`), `EXECUTABLE_OUTPUT_DIR` (temp dir, files are deleted after the upload),
`EXECUTABLE_URL_TTL_S` (3600), `EXECUTABLE_OBJECT_TTL_DAYS` (1). The bucket
needs no public access.

On startup the service installs an S3 lifecycle rule (`expire-installers`) that
deletes everything under `installers/` after `EXECUTABLE_OBJECT_TTL_DAYS` day(s),
so the uploaded installers are temporary (the presigned URL already expires after
`EXECUTABLE_URL_TTL_S`; this removes the object itself). It's merged with any other
rules on the bucket, so it needs `s3:GetLifecycleConfiguration` and
`s3:PutLifecycleConfiguration`; without those it just warns and installers don't
auto-expire.

macOS: appending the config breaks the binary's signature, so the service signs
it again ad hoc with `ldid` (`codesign` on a Mac) when available.

## Device owner APK

`src/android` is the Android app (Lockdown MDM, see its README). `npm run
build:apk` builds it with `generate_apk.sh` (needs JDK 17 and the Android SDK;
the prod Dockerfile has a stage for it) and copies the release APK to
`dist/device-owner.apk`.

The server doesn't rebuild it per request (Gradle takes minutes, the chatbot
waits 30 s): it stores the config JSON as an ID-value pair (ID `0x444f4346`) in
the APK Signing Block, which APK Signature Scheme v2/v3 doesn't sign, so the
APK needs no re-signing. The app reads it in `ProvisioningConfig.kt` and uses
it as the default allowlist (`allowedApps`, plus the Play Store) and Private
DNS (`privateDnsHost`; `null` leaves DNS unlocked). Without the pair, it falls
back to `Constants.kt`. `appVersion` (the configuration version typed in the
chatbot, e.g. `1.2.0`) can't go in the APK's `versionName` (the manifest is
signed), so the app shows it on its main screen and, as device owner, sets the
organization name to `Lockdown MDM <appVersion>`, which Android shows in
Settings (device admin / "managed by" info).

On start, the executable looks for a phone, asking the user to connect it
(USB cable, developer options, USB debugging) and retrying until one is ready
or the user quits. For each phone in the `device` state it asks whether to
install (naming the configuration version typed in the chatbot), then installs the embedded APK (`pm install -r`) and makes it the device owner
(`dpm set-device-owner com.lockdown.mdm/.AdminReceiver`). Android only allows
that on a phone without accounts; otherwise the error is shown and the exit
code is 1. A phone already provisioned blocks installs (`DISALLOW_INSTALL_APPS`)
until `unlock_installs` is sent with the admin password.

### Signing key (constant across builds)

Updating an installed device owner (`pm install -r`) only works if the new APK
is signed with the same key, so the key must be a fixed input, not generated per
build. `app/build.gradle` reads a release keystore from the environment:

| Var | |
|---|---|
| `ANDROID_KEYSTORE_PATH` | path to the `.jks`, or | 
| `ANDROID_KEYSTORE_BASE64` | the `.jks` base64 (decoded by `generate_apk.sh`), to travel as one secret |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | key alias (default `lockdown`) |
| `ANDROID_KEY_PASSWORD` | key password (default: the keystore password) |

In Docker these come in as BuildKit secrets (`android_keystore_b64`,
`android_keystore_password`), wired on the `executable` service in
`docker-compose.prod.yml` and sourced from `ANDROID_KEYSTORE_BASE64` /
`ANDROID_KEYSTORE_PASSWORD` in the environment, so the key never lands in an
image layer. Generate the keystore once:

```bash
keytool -genkeypair -keystore lockdown-release.jks -alias lockdown \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Lockdown MDM, O=Lockdown, C=BR"
export ANDROID_KEYSTORE_BASE64="$(base64 -w0 lockdown-release.jks)"
export ANDROID_KEYSTORE_PASSWORD=...
```

`generate_apk.sh` resolves the key in this order: `ANDROID_KEYSTORE_PATH` ->
`ANDROID_KEYSTORE_BASE64` -> the default file `apps/executable/lockdown-release.jks`
(reused across builds, kept out of git by `.gitignore`) -> and, only if none of
those exist, it **generates** the keystore at that default path the first time
and prints its base64 + password to save as secrets. `dockerfile.prod` copies
that default file into the build when it's present (so the committed key is
reused), and generates one otherwise. Either way the key then stays put, so the
signature is constant. An existing keystore still needs its
`ANDROID_KEYSTORE_PASSWORD`.

## How the build works

1. `scripts/build-wdi-simple.sh` cross-compiles libwdi's `wdi-simple.exe` (Windows
   driver installer) with MinGW in Docker, into `vendor/wdi/`. Needs Docker; runs
   once (delete the file to rebuild). Sources and the Microsoft WDK 8.0
   redistributable are pinned by SHA-256.
2. `scripts/fetch-usb-natives.ts` (run with tsx) downloads the `usb` native module for every
   target into `node_modules/@node-usb/` (npm only installs the current OS's).
3. `tsc --noEmit` type-checks `src/` and `scripts/` (tsc never emits; esbuild
   compiles the TypeScript).
4. esbuild bundles `src/` and the ESM-only `@yume-chan/*` packages into `build/app.js`.
5. pkg packages `build/app.js`, the `usb` package, the native modules and `wdi-simple.exe`.

## Android devices (ADB over USB)

The app lists Android devices like `adb devices`, but talks to them directly over
USB with [`@yume-chan/adb`](https://github.com/yume-chan/ya-webadb) and
[`usb`](https://github.com/node-usb/node-usb). **Users don't need adb installed.**

States: `device` (ready), `no permissions`, `no driver`, `busy`, `error (...)`.
While the phone's "Allow USB debugging" prompt is pending, the app waits for it
(with instructions) until it's accepted or the phone is unplugged.

`usb` quirks handled in `src/adb.ts`:
- Reads get a timeout (1 s by default) unlike WebUSB, and a cancelled read loses
  the data in transit, hanging the ADB connection: reads use the max timeout.
- A device with a read in flight can't be closed (the error, "The same native
  value cannot be borrowed mutably...", is thrown synchronously). Once
  connected, ADB always has one, so the phone stays claimed until the process
  exits, which `index.ts` does explicitly (the pending read keeps Node alive).
- Reading the product name also fails mid-read, so it's read before connecting.

- **Authorization**: if `~/.android/adbkey` exists (adb was used before), that key
  is reused, so already-trusted phones don't prompt again. Otherwise a key is
  created in the app's config dir, shared with the JS `local-executable`
  (`~/.config/local-executable`,
  `~/Library/Application Support/local-executable`, `%APPDATA%\local-executable`).
- **Linux permissions**: if a device can't be opened, the app asks
  `Grant access now? [Y/n]`. On yes it installs
  `/etc/udev/rules.d/51-local-executable-<vendor>.rules`
  (`MODE="0660", TAG+="uaccess"`: access for the logged-in user only) using
  `pkexec` (password dialog) or `sudo`, reloads udev and continues. Once per
  device vendor. On no, it shows manual instructions and lists `no permissions`.
- **Windows driver**: if the ADB interface can't be opened (no WinUSB driver), the
  app asks `Install the WinUSB driver now? [Y/n]`. On yes it runs the bundled
  [libwdi](https://github.com/pbatard/libwdi) `wdi-simple.exe` for that VID/PID/interface;
  Windows shows a UAC prompt. libwdi signs the generated driver with a self-signed
  certificate it installs as trusted. Then the device is checked again.
- **adb server**: if the user also has adb running, it holds the USB interface and
  the device shows `busy`. Run `adb kill-server` first.
- USB only: no Wi-Fi devices or emulators.

## Double-click behavior

When the executable is started without a terminal (e.g. double-clicked in a file
manager), it reopens itself in the system terminal so the logs are visible, and
waits for Enter before closing the window:

- **Linux**: opens the first available of gnome-terminal, ptyxis, kgx, konsole,
  xfce4-terminal, kitty, alacritty, wezterm, foot, xterm, x-terminal-emulator.
- **macOS**: opens Terminal.app.
- **Windows**: Windows already opens a console; the program pauses before exit so
  the window doesn't vanish (skipped when run from `cmd`).

On Linux, a downloaded binary needs execute permission: `chmod +x executable-linux-x64`.

## macOS signing

macOS will kill unsigned binaries on launch. If you build on Linux, either install
[`ldid`](https://github.com/ProcursusTeam/ldid) before building, or run this on the Mac:

```bash
codesign --sign - ./executable-macos-arm64
```
