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
```

Output in `dist/`:

| File | Platform |
|---|---|
| `executable-linux-x64` | Linux |
| `executable-win-x64.exe` | Windows |
| `executable-macos-x64` | macOS Intel |
| `executable-macos-arm64` | macOS Apple Silicon |

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

States: `device` (ready), `unauthorized` (the "Allow USB debugging" prompt on the
phone wasn't accepted within 60 s), `no permissions`, `busy`.

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
