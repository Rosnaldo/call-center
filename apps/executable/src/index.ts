import { openInTerminal, launchedWithoutTerminal, shouldPauseOnExit, waitForEnter } from "./terminal";
import { listDevices } from "./adb";
import { readEmbeddedConfig } from "./embedded-config";

async function main(): Promise<void> {
  // Params collected by the chatbot, embedded by the server on download.
  const config = readEmbeddedConfig();
  console.log(config ? `Config: ${JSON.stringify(config)}` : "No embedded config");
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
