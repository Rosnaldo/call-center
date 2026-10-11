import { openInTerminal, launchedWithoutTerminal, shouldPauseOnExit, waitForEnter, askRetry, askYesNo, askSecret } from "./terminal";
import type { Adb } from "@yume-chan/adb";
import { listDevices, type DeviceInfo, type OnReady } from "./adb";
import { installDeviceOwner, InstallBlockedError, sendControlCommand } from "./device-owner";
import { readEmbeddedPayload } from "./embedded-config";

async function main(): Promise<void> {
  // Params collected by the chatbot and the APK made with them, embedded by
  // the server on download.
  const payload = readEmbeddedPayload();

  let failed = false;
  const onReady: OnReady | undefined = payload
    ? async (adb, device) => {
        // Nothing is changed on the phone without the user's go-ahead (also
        // skipped without a terminal to answer in).
        const version = payload.config.appVersion ? ` (configuration ${payload.config.appVersion})` : "";
        if (!(await askYesNo(`Phone found: ${device}. Install the device owner app${version} on it?`))) {
          console.log(`Skipped ${device}.`);
          return;
        }
        if (!(await install(adb, device, payload.apk))) failed = true;
      }
    : undefined;

  // Keep asking for a phone until one is ready or the user quits.
  let devices: DeviceInfo[];
  for (;;) {
    console.log("Looking for a connected phone...");
    devices = await listDevices(onReady);
    if (devices.some(({ state }) => state === "device")) break;

    printDevices(devices);
    console.log(connectInstructions(devices));
    if (!(await askRetry("Press Enter to try again, or type q and Enter to quit:"))) {
      console.log("No phone ready: connect it over USB with USB debugging enabled and run this again.");
      process.exitCode = 1;
      return;
    }
  }

  printDevices(devices);
  if (failed) process.exitCode = 1;
}

// Installs the app; on a phone whose installs are locked, asks for the admin
// password, unlocks, retries and locks again.
async function install(adb: Adb, device: string, apk: Uint8Array): Promise<boolean> {
  try {
    return await installDeviceOwner(adb, device, apk);
  } catch (err) {
    if (!(err instanceof InstallBlockedError)) throw err;
    console.error(`Error: ${err.message}`);
  }

  let password: string;
  for (;;) {
    const answer = await askSecret("Admin password (empty to skip this phone):");
    if (!answer) {
      console.log(`Skipped ${device}: installs are still locked.`);
      return false;
    }
    const result = await sendControlCommand(adb, answer, "unlock_installs");
    if (result === null) {
      console.log(`The app on ${device} didn't answer the unlock request; try again in a moment.`);
      return false;
    }
    if (/invalid password/i.test(result)) {
      console.log("Wrong password.");
      continue;
    }
    if (!result.startsWith("OK")) {
      console.log(`Could not unlock installs on ${device}: ${result}`);
      return false;
    }
    password = answer;
    break;
  }

  console.log(`Installs unlocked on ${device}, retrying...`);
  try {
    return await installDeviceOwner(adb, device, apk);
  } finally {
    // The update restarts the app, so its control channel may take a while to answer.
    const result = await sendControlCommand(adb, password, "lock_installs", 30_000);
    if (result?.startsWith("OK")) console.log(`Installs locked again on ${device}.`);
    else console.log(`Warning: installs are still UNLOCKED on ${device} (${result ?? "no answer"}); send lock_installs to lock them.`);
  }
}

function printDevices(devices: DeviceInfo[]): void {
  console.log("List of devices attached");
  for (const { serial, state } of devices) {
    console.log(`${serial}\t${state}`);
  }
}

function connectInstructions(devices: DeviceInfo[]): string {
  if (devices.length) {
    return "\nA phone was found but can't be used yet (see its state above). Fix that, then try again.\n";
  }
  return [
    "",
    "No phone detected. On the phone:",
    "  1. Connect it to this computer with a USB cable (a data cable, not charge-only).",
    '  2. Enable Developer options: Settings > About phone, tap "Build number" 7 times.',
    '  3. Enable USB debugging: Settings > System > Developer options > "USB debugging".',
    '  4. Unlock the phone and tap "Allow" on the "Allow USB debugging?" prompt.',
    "",
  ].join("\n");
}

async function run(): Promise<void> {
  if (launchedWithoutTerminal() && openInTerminal()) return;

  try {
    await main();
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }

  if (shouldPauseOnExit()) await waitForEnter();
  // A connected phone's USB read never times out (see adb.ts) and keeps the
  // event loop alive, so the process wouldn't end on its own.
  process.exit();
}

run();
