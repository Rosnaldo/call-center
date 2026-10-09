import { openInTerminal, launchedWithoutTerminal, shouldPauseOnExit, waitForEnter } from "./terminal";
import { listDevices } from "./adb";
import { installDeviceOwner } from "./device-owner";
import { readEmbeddedPayload } from "./embedded-config";

async function main(): Promise<void> {
  // Params collected by the chatbot and the APK made with them, embedded by
  // the server on download.
  const payload = readEmbeddedPayload();
  console.log(payload ? `Config: ${JSON.stringify(payload.config)}` : "No embedded config");

  let failed = false;
  const devices = await listDevices(
    payload
      ? async (adb, device) => {
          if (!(await installDeviceOwner(adb, device, payload.apk))) failed = true;
        }
      : undefined,
  );
  console.log("List of devices attached");
  for (const { serial, state } of devices) {
    console.log(`${serial}\t${state}`);
  }
  if (payload && !devices.some(({ state }) => state === "device")) {
    console.log("No phone ready: connect it over USB with USB debugging enabled and run this again.");
    failed = true;
  }
  if (failed) process.exitCode = 1;
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
}

run();
