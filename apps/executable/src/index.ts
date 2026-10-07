import { openInTerminal, launchedWithoutTerminal, shouldPauseOnExit, waitForEnter } from "./terminal";
import { listDevices } from "./adb";

async function main(): Promise<void> {
  console.log("hello world");
  console.log("List of devices attached");
  for (const { serial, state } of await listDevices()) {
    console.log(`${serial}\t${state}`);
  }
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
