// ADB over USB implemented in TypeScript (no adb binary or adb server needed).
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { WebUSB } from "usb";
import {
  AdbDaemonTransport,
  type AdbCredentialStore,
  type AdbPrivateKey,
} from "@yume-chan/adb";
import {
  AdbDaemonWebUsbDevice,
  AdbDaemonWebUsbDeviceManager,
  type AdbDaemonWebUsbConnection,
} from "@yume-chan/adb-daemon-webusb";
import { APP_NAME } from "./constants";
import { askYesNo } from "./terminal";
import {
  inaccessibleLinuxDevices,
  grantLinuxUsbAccess,
  linuxManualInstructions,
  installWindowsDriver,
  windowsManualInstructions,
  type BlockedDevice,
} from "./usb-permissions";

const AUTH_TIMEOUT_MS = 60_000;
const AUTH_PROMPT_DELAY_MS = 1_500;
const DRIVER_SETTLE_MS = 3_000;

const NO_PERMISSIONS = "no permissions";
const NO_DRIVER = "no driver";

export interface DeviceInfo {
  serial: string;
  name: string;
  /** `device`, `unauthorized`, `no permissions`, `no driver`, `busy (...)` or `error (...)`. */
  state: string;
}

function configDir(): string {
  const home = os.homedir();
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), APP_NAME);
  }
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", APP_NAME);
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), APP_NAME);
}

function readPkcs8(file: string): Buffer | undefined {
  try {
    const pem = fs.readFileSync(file, "utf8");
    return crypto.createPrivateKey(pem).export({ type: "pkcs8", format: "der" });
  } catch {
    return undefined;
  }
}

// Keys the phone may already trust: the installed adb's key (read-only), then
// our own. A new key is generated and saved only when neither exists.
class CredentialStore implements AdbCredentialStore {
  private readonly adbKeyFile = path.join(os.homedir(), ".android", "adbkey");
  private readonly ownKeyFile = path.join(configDir(), "adbkey");
  private readonly name = `${os.userInfo().username}@${os.hostname()}`;

  *iterateKeys(): Generator<AdbPrivateKey> {
    for (const file of [this.adbKeyFile, this.ownKeyFile]) {
      const buffer = readPkcs8(file);
      if (buffer) yield { buffer: new Uint8Array(buffer), name: this.name };
    }
  }

  generateKey(): AdbPrivateKey {
    const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, publicExponent: 65537 });
    fs.mkdirSync(path.dirname(this.ownKeyFile), { recursive: true });
    fs.writeFileSync(this.ownKeyFile, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
    return { buffer: new Uint8Array(privateKey.export({ type: "pkcs8", format: "der" })), name: this.name };
  }
}

// The ADB library reads every USB device's descriptors to find ADB interfaces,
// and one device we can't open (e.g. a webcam) would make the whole lookup fail.
class ReadableDevicesUSB extends WebUSB {
  async getDevices() {
    return (await super.getDevices()).filter((device) => {
      try {
        return device.configurations.length >= 0;
      } catch {
        return false;
      }
    });
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function connectionError(err: unknown): string {
  if (err instanceof AdbDaemonWebUsbDevice.DeviceBusyError) {
    return "busy (used by another program; if adb is installed, run `adb kill-server`)";
  }
  const message = errorMessage(err);
  if (/permission|access/i.test(message)) return NO_PERMISSIONS;
  return `error (${message})`;
}

// Connects and authenticates, telling the user to check the phone if the
// "Allow USB debugging?" prompt is waiting on them.
async function authenticate(
  connection: AdbDaemonWebUsbConnection,
  device: AdbDaemonWebUsbDevice,
  credentialStore: AdbCredentialStore
): Promise<AdbDaemonTransport> {
  const promptTimer = setTimeout(() => {
    console.log(`Waiting for "Allow USB debugging" to be accepted on ${device.name} (${device.serial})...`);
  }, AUTH_PROMPT_DELAY_MS);
  let timeoutTimer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => reject(new Error("unauthorized")), AUTH_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      AdbDaemonTransport.authenticate({ serial: device.serial, connection, credentialStore }),
      timeout,
    ]);
  } finally {
    clearTimeout(promptTimer);
    clearTimeout(timeoutTimer);
  }
}

async function deviceState(device: AdbDaemonWebUsbDevice, credentialStore: AdbCredentialStore): Promise<string> {
  let connection: AdbDaemonWebUsbConnection;
  try {
    connection = await device.connect();
  } catch (err) {
    // On Windows, an ADB interface we can't open almost always lacks a WinUSB driver.
    const isBusy = err instanceof AdbDaemonWebUsbDevice.DeviceBusyError;
    return process.platform === "win32" && !isBusy ? NO_DRIVER : connectionError(err);
  }

  let transport: AdbDaemonTransport | undefined;
  try {
    transport = await authenticate(connection, device, credentialStore);
    return "device";
  } catch (err) {
    return errorMessage(err) === "unauthorized" ? "unauthorized" : connectionError(err);
  } finally {
    if (transport) await transport.close();
    await device.raw.close().catch(() => {});
  }
}

function describe(device: { name: string; serial: string }): string {
  return device.name ? `${device.name} (${device.serial})` : device.serial;
}

// Linux: offers to install udev rules for devices the user can't open.
// Returns the devices still inaccessible afterwards.
async function ensureLinuxAccess(): Promise<BlockedDevice[]> {
  const blocked = inaccessibleLinuxDevices();
  if (!blocked.length) return blocked;

  console.log(`USB permission is needed for: ${blocked.map(describe).join(", ")}`);
  if (await askYesNo("Grant access now? You'll be asked for your password.")) {
    if (grantLinuxUsbAccess(blocked.map((d) => d.vendorId))) {
      console.log("USB access granted.");
      return inaccessibleLinuxDevices();
    }
    console.log("Could not grant USB access.");
  }
  console.log(linuxManualInstructions());
  return blocked;
}

// Windows: offers to install the WinUSB driver on devices that lack one.
// Returns true when at least one driver was installed.
async function ensureWindowsDrivers(devices: AdbDaemonWebUsbDevice[], states: string[]): Promise<boolean> {
  const missing = devices.filter((_, i) => states[i] === NO_DRIVER);
  if (!missing.length) return false;

  console.log(`A USB driver is needed for: ${missing.map(describe).join(", ")}`);
  if (!(await askYesNo("Install the WinUSB driver now? Windows will ask for administrator approval."))) {
    console.log(windowsManualInstructions());
    return false;
  }
  let installed = false;
  for (const device of missing) {
    console.log(`Installing driver for ${describe(device)}...`);
    if (installWindowsDriver(device.raw, device.name)) {
      installed = true;
    } else {
      console.log(`Driver installation failed for ${describe(device)}.`);
    }
  }
  if (!installed) console.log(windowsManualInstructions());
  return installed;
}

async function getStates(manager: AdbDaemonWebUsbDeviceManager, credentialStore: AdbCredentialStore) {
  const devices = await manager.getDevices();
  const states: string[] = [];
  for (const device of devices) states.push(await deviceState(device, credentialStore));
  return { devices, states };
}

// Equivalent of `adb devices`. Asks the user to fix missing USB permissions
// (Linux) or drivers (Windows) along the way.
export async function listDevices(): Promise<DeviceInfo[]> {
  const blocked = await ensureLinuxAccess();
  const manager = new AdbDaemonWebUsbDeviceManager(new ReadableDevicesUSB({ allowAllDevices: true }));
  const credentialStore = new CredentialStore();

  let { devices, states } = await getStates(manager, credentialStore);
  if (await ensureWindowsDrivers(devices, states)) {
    // The device re-enumerates with its new driver.
    await new Promise((resolve) => setTimeout(resolve, DRIVER_SETTLE_MS));
    ({ devices, states } = await getStates(manager, credentialStore));
  }

  return [
    ...blocked.map(({ serial, name }) => ({ serial, name, state: NO_PERMISSIONS })),
    ...devices.map((device, i) => ({ serial: device.serial, name: device.name, state: states[i] })),
  ];
}
