// npm only installs the `usb` native package for the current OS. Cross-built
// executables need the ones for every target, so download them into
// node_modules (where `usb` looks for them) from the npm registry.
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const TARGETS = ["linux-x64-gnu", "win32-x64-msvc", "darwin-x64", "darwin-arm64"];

const root = path.join(__dirname, "..");

function installedVersion(dir: string): string | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).version;
  } catch {
    return undefined;
  }
}

const version = installedVersion(path.join(root, "node_modules", "usb"));
if (!version) throw new Error("usb is not installed; run npm install first");

for (const target of TARGETS) {
  const name = `@node-usb/usb-${target}`;
  const dest = path.join(root, "node_modules", "@node-usb", `usb-${target}`);
  if (installedVersion(dest) === version) continue;

  console.log(`Fetching ${name}@${version}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "usb-native-"));
  try {
    const shell = process.platform === "win32";
    const tarball = execFileSync("npm", ["pack", `${name}@${version}`, "--silent", "--pack-destination", tmp], {
      encoding: "utf8",
      shell,
    }).trim().split("\n").pop()!;
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    execFileSync("tar", ["-xzf", path.join(tmp, tarball), "-C", dest, "--strip-components=1"], { shell });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
