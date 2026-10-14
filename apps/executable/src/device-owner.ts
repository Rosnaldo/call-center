// Installs the embedded device owner APK on a connected phone and makes it the
// device owner, like `adb install -r app.apk && adb shell dpm set-device-owner ...`.
import type { Adb } from "@yume-chan/adb";
import { ReadableStream } from "@yume-chan/stream-extra";

// Release build of apps/executable/src/android (`npm run build:apk`).
const PACKAGE = "com.lockdown.mdm";
const ADMIN_COMPONENT = `${PACKAGE}/.AdminReceiver`;
const REMOTE_APK = "/data/local/tmp/device-owner.apk";
// The app's control channel (ControlChannelService): it polls command.txt and
// writes the answer to result.txt.
const CONTROL_DIR = `/sdcard/Android/data/${PACKAGE}/files`;

// Thrown when the phone was provisioned by an older build whose install lock
// (DISALLOW_INSTALL_APPS) rejects the APK; lifted only by `unlock_installs`.
export class InstallBlockedError extends Error {
  constructor(device: string) {
    super(
      `Installs are locked on ${device}: the device owner app is already set up on this phone and blocks ` +
        "every install and update until it is unlocked with the admin password."
    );
    this.name = "InstallBlockedError";
  }
}

async function shell(adb: Adb, command: string): Promise<string> {
  return (await adb.subprocess.noneProtocol.spawnWaitText(command)).trim();
}

async function push(adb: Adb, filename: string, data: Uint8Array): Promise<void> {
  const sync = await adb.sync();
  try {
    await sync.write({
      filename,
      file: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(data);
          controller.close();
        },
      }),
      permission: 0o644,
    });
  } finally {
    await sync.dispose();
  }
}

// Returns true when the phone ends up with the app installed as device owner.
// Failures are logged, not thrown, so the other phones are still handled,
// except a locked phone, which throws InstallBlockedError.
export async function installDeviceOwner(adb: Adb, device: string, apk: Uint8Array): Promise<boolean> {
  console.log(`Installing the device owner app on ${device}...`);
  await push(adb, REMOTE_APK, apk);
  let output: string;
  try {
    output = await shell(adb, `pm install -r ${REMOTE_APK}`);
  } finally {
    await shell(adb, `rm -f ${REMOTE_APK}`);
  }
  if (/User restriction prevents installing|INSTALL_FAILED_USER_RESTRICTED/.test(output)) {
    throw new InstallBlockedError(device);
  }
  if (!output.includes("Success")) {
    console.log(`Install failed on ${device}: ${output}`);
    return false;
  }

  // Lets the app turn on its browser guard (an accessibility service), which a
  // device owner can't do by itself; see PolicyEnforcer.enableBrowserGuard.
  output = await shell(adb, `pm grant ${PACKAGE} android.permission.WRITE_SECURE_SETTINGS`);
  if (output) console.log(`Could not enable the browser guard on ${device}: ${output}`);

  output = await shell(adb, `dpm set-device-owner ${ADMIN_COMPONENT}`);
  if (output.includes("Success")) {
    console.log(`Device owner set on ${device}.`);
    return true;
  }
  if (/already set|already (has|provisioned)/i.test(output)) {
    console.log(`App updated on ${device}; it was already the device owner.`);
    return true;
  }
  // Usually accounts on the phone: Android only allows a device owner on a
  // phone without accounts (factory reset, or remove them in Settings).
  console.log(`Could not set the device owner on ${device}: ${output}`);
  return false;
}

// Runs an admin command (e.g. unlock_installs) through the app's control
// channel. Returns its answer ("OK: ..." or "ERROR: ..."), or null when the app
// doesn't answer in time.
export async function sendControlCommand(
  adb: Adb,
  password: string,
  cmd: string,
  timeoutMs = 10_000
): Promise<string | null> {
  await shell(adb, `rm -f ${CONTROL_DIR}/result.txt`);
  await push(adb, `${CONTROL_DIR}/command.txt`, new TextEncoder().encode(`password=${password}\ncmd=${cmd}\n`));
  for (const deadline = Date.now() + timeoutMs; Date.now() < deadline; ) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = await shell(adb, `cat ${CONTROL_DIR}/result.txt 2>/dev/null`);
    if (result) return result;
  }
  return null;
}
