// Installs the embedded device owner APK on a connected phone and makes it the
// device owner, like `adb install -r app.apk && adb shell dpm set-device-owner ...`.
import type { Adb } from "@yume-chan/adb";
import { ReadableStream } from "@yume-chan/stream-extra";

// Release build of apps/executable/src/android (`npm run build:apk`).
const ADMIN_COMPONENT = "com.lockdown.mdm/.AdminReceiver";
const REMOTE_APK = "/data/local/tmp/device-owner.apk";

async function shell(adb: Adb, command: string): Promise<string> {
  return (await adb.subprocess.noneProtocol.spawnWaitText(command)).trim();
}

async function push(adb: Adb, apk: Uint8Array): Promise<void> {
  const sync = await adb.sync();
  try {
    await sync.write({
      filename: REMOTE_APK,
      file: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(apk);
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
// Failures are logged, not thrown, so the other phones are still handled.
export async function installDeviceOwner(adb: Adb, device: string, apk: Uint8Array): Promise<boolean> {
  console.log(`Installing the device owner app on ${device}...`);
  await push(adb, apk);
  let output: string;
  try {
    output = await shell(adb, `pm install -r ${REMOTE_APK}`);
  } finally {
    await shell(adb, `rm -f ${REMOTE_APK}`);
  }
  if (!output.includes("Success")) {
    // An already provisioned phone blocks installs until unlocked with the admin password.
    console.log(`Install failed on ${device}: ${output}`);
    return false;
  }

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
