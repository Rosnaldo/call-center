// ADB over USB implemented in TypeScript (no adb binary or adb server needed).
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { WebUSB } from "usb";
import {
  Adb,
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

const AUTH_PROMPT_DELAY_MS = 1_500;
const DRIVER_SETTLE_MS = 3_000;
// USB read timeout: the max the usb module takes (~49 days), i.e. never.
const READ_TIMEOUT_MS = 0xffff_ffff;

const NO_PERMISSIONS = "no permissions";
const NO_DRIVER = "no driver";

export interface DeviceInfo {
  serial: string;
  name: string;
  /** `device`, `no permissions`, `no driver`, `busy (...)` or `error (...)`. */
  state: string;
}

/** Runs on each device found in the `device` state, while it's connected. */
export type OnReady = (adb: Adb, device: string) => Promise<void>;

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

type TransferIn = (endpointNumber: number, length: number, timeout?: number) => Promise<USBInTransferResult>;

// Unlike WebUSB, the usb module gives every read a timeout (1 s by default),
// failing with "Cancelled", and a cancelled read loses the data in transit:
// the ADB connection then hangs. The ADB library expects reads to wait for
// data, so they get a timeout that never expires.
function withoutReadTimeout<T extends USBDevice>(device: T): T {
  const transferIn = (device.transferIn as TransferIn).bind(device);
  device.transferIn = (endpointNumber: number, length: number) =>
    transferIn(endpointNumber, length, READ_TIMEOUT_MS);
  return device;
}

// The ADB library reads every USB device's descriptors to find ADB interfaces,
// and one device we can't open (e.g. a webcam) would make the whole lookup fail.
class ReadableDevicesUSB extends WebUSB {
  async getDevices() {
    const devices = (await super.getDevices()).filter((device) => {
      try {
        return device.configurations.length >= 0;
      } catch {
        return false;
      }
    });
    return devices.map(withoutReadTimeout);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function connectionError(err: unknown): string {
  const message = errorMessage(err);
  if (err instanceof AdbDaemonWebUsbDevice.DeviceBusyError || /busy/i.test(message)) {
    return "busy (used by another program; if adb is installed, run `adb kill-server`)";
  }
  if (/permission|access/i.test(message)) return NO_PERMISSIONS;
  return `error (${message})`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Releases the claimed ADB interface and closes the device, so it can be
// opened again in this process. Two usb module quirks:
// - `close()` alone keeps the interface claimed until the object is garbage
//   collected, so the next open would find the device busy;
// - it refuses to touch a device while a read is in flight, throwing
//   synchronously (so `close().catch()` doesn't catch it). After the ADB
//   connection is up its read loop always has one, so the device then stays
//   open until the process exits.
// Never throws: there's nothing left to do with a device that won't close.
async function closeDevice(device: AdbDaemonWebUsbDevice): Promise<void> {
  try {
    if (!device.raw.opened) return;
    for (const iface of device.raw.configuration?.interfaces ?? []) {
      if (iface.claimed) await device.raw.releaseInterface(iface.interfaceNumber);
    }
    await device.raw.close();
  } catch {
    // Left open.
  }
}

// Connects and authenticates, telling the user to check the phone if the
// "Allow USB debugging?" prompt is waiting on them. Waits until it's accepted:
// giving up would leave the device unusable in this process (its read can't
// be cancelled, see closeDevice). Unplugging the phone ends the wait.
async function authenticate(
  connection: AdbDaemonWebUsbConnection,
  device: AdbDaemonWebUsbDevice,
  label: string,
  credentialStore: AdbCredentialStore
): Promise<AdbDaemonTransport> {
  const promptTimer = setTimeout(() => {
    console.log(
      [
        `Waiting for USB debugging to be allowed on ${label}:`,
        '  unlock the phone and tap "Allow" on the "Allow USB debugging?" prompt',
        '  (check "Always allow from this computer"). No prompt? Unplug and replug the cable.',
      ].join("\n"),
    );
  }, AUTH_PROMPT_DELAY_MS);

  try {
    return await AdbDaemonTransport.authenticate({ serial: device.serial, connection, credentialStore });
  } finally {
    clearTimeout(promptTimer);
  }
}

// `label` is read before connecting (see FoundDevice).
async function deviceState(
  device: AdbDaemonWebUsbDevice,
  label: string,
  credentialStore: AdbCredentialStore,
  onReady?: OnReady
): Promise<string> {
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
    transport = await authenticate(connection, device, label, credentialStore);
  } catch (err) {
    await closeDevice(device);
    return connectionError(err);
  }

  try {
    if (onReady) await onReady(new Adb(transport), label);
  } catch (err) {
    console.log(`Error on ${label}: ${errorMessage(err)}`);
  } finally {
    try {
      await transport.close();
    } catch {
      // The device is closed below either way.
    }
    await closeDevice(device);
  }
  return "device";
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
async function ensureWindowsDrivers(found: FoundDevice[]): Promise<boolean> {
  const missing = found.filter(({ state }) => state === NO_DRIVER);
  if (!missing.length) return false;

  console.log(`A USB driver is needed for: ${missing.map(describe).join(", ")}`);
  if (!(await askYesNo("Install the WinUSB driver now? Windows will ask for administrator approval."))) {
    console.log(windowsManualInstructions());
    return false;
  }
  let installed = false;
  for (const device of missing) {
    console.log(`Installing driver for ${describe(device)}...`);
    if (installWindowsDriver(device.device.raw, device.name)) {
      installed = true;
    } else {
      console.log(`Driver installation failed for ${describe(device)}.`);
    }
  }
  if (!installed) console.log(windowsManualInstructions());
  return installed;
}

// The name is read up front: the usb module reads it from the device on first
// access, which throws while the ADB connection has a transfer in flight.
interface FoundDevice {
  device: AdbDaemonWebUsbDevice;
  serial: string;
  name: string;
  state: string;
}

function productName(device: AdbDaemonWebUsbDevice): string {
  try {
    return device.name ?? "";
  } catch {
    return "";
  }
}

async function getStates(
  manager: AdbDaemonWebUsbDeviceManager,
  credentialStore: AdbCredentialStore,
  onReady?: OnReady
): Promise<FoundDevice[]> {
  const found: FoundDevice[] = [];
  for (const device of await manager.getDevices()) {
    const info = { device, serial: device.serial, name: productName(device) };
    found.push({ ...info, state: await deviceState(device, describe(info), credentialStore, onReady) });
  }
  return found;
}

// Equivalent of `adb devices`, running `onReady` on each ready device. Asks
// the user to fix missing USB permissions (Linux) or drivers (Windows) along
// the way.
export async function listDevices(onReady?: OnReady): Promise<DeviceInfo[]> {
  const blocked = await ensureLinuxAccess();
  const manager = new AdbDaemonWebUsbDeviceManager(new ReadableDevicesUSB({ allowAllDevices: true }));
  const credentialStore = new CredentialStore();

  // Devices are checked again after a driver install; act on each one once.
  const done = new Set<string>();
  const onReadyOnce: OnReady | undefined =
    onReady &&
    (async (adb, device) => {
      if (done.has(device)) return;
      done.add(device);
      await onReady(adb, device);
    });

  let found = await getStates(manager, credentialStore, onReadyOnce);
  if (await ensureWindowsDrivers(found)) {
    // The device re-enumerates with its new driver.
    await sleep(DRIVER_SETTLE_MS);
    found = await getStates(manager, credentialStore, onReadyOnce);
  }

  return [
    ...blocked.map(({ serial, name }) => ({ serial, name, state: NO_PERMISSIONS })),
    ...found.map(({ serial, name, state }) => ({ serial, name, state })),
  ];
}
