// Copies the chatbot config embedded in one APK into another, in place.
// Used by dev-apk.sh to keep the phone's config across local rebuilds.
//
// Usage: tsx scripts/copy-apk-config.ts <from.apk> <to.apk>
import { readFileSync, writeFileSync } from "node:fs";
import { embedApkConfig, readApkConfig } from "../src/apk-config";

const [from, to] = process.argv.slice(2);
if (!from || !to) {
  console.error("Usage: tsx scripts/copy-apk-config.ts <from.apk> <to.apk>");
  process.exit(1);
}

const config = readApkConfig(readFileSync(from));
if (config === undefined) {
  console.log(`No config in ${from}; the app will use the Constants.kt defaults`);
} else {
  writeFileSync(to, embedApkConfig(readFileSync(to), config));
  console.log(`Copied config: ${JSON.stringify(config)}`);
}
