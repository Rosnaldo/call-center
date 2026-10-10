import { openInTerminal, launchedWithoutTerminal, shouldPauseOnExit, waitForEnter, askRetry, askYesNo } from "./terminal";
import { listDevices, type DeviceInfo, type OnReady } from "./adb";
import { installDeviceOwner } from "./device-owner";
import { readEmbeddedPayload } from "./embedded-config";

async function main(): Promise<void> {
  // Params collected by the chatbot and the APK made with them, embedded by
  // the server on download.
  const payload = readEmbeddedPayload();
  console.log(payload ? `Config: ${JSON.stringify(payload.config)}` : "No embedded config");

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
        if (!(await installDeviceOwner(adb, device, payload.apk))) failed = true;
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
