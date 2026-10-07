// Getting USB access to Android devices when the OS blocks it:
// - Linux: a udev rule (installed as root via pkexec/sudo) grants the logged-in user access.
// - Windows: libwdi's wdi-simple installs the WinUSB driver on the ADB interface (UAC prompt).
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { APP_NAME } from "./constants";
import { commandExists } from "./terminal";

const ADB_INTERFACE = { classCode: 0xff, subclassCode: 0x42, protocolCode: 0x01 };

// ---------- Linux ----------

const SYSFS_USB = "/sys/bus/usb/devices";

export interface BlockedDevice {
  serial: string;
  name: string;
  /** 4 hex digits. */
  vendorId: string;
}

function readSysfs(dir: string, file: string): string {
  try {
    return fs.readFileSync(path.join(SYSFS_USB, dir, file), "utf8").trim();
  } catch {
    return "";
  }
}

// ADB devices the current user can't open, found through sysfs, which doesn't
// need device access.
export function inaccessibleLinuxDevices(): BlockedDevice[] {
  if (process.platform !== "linux") return [];
  let entries: string[];
  try {
    entries = fs.readdirSync(SYSFS_USB);
  } catch {
    return [];
  }

  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const result: BlockedDevice[] = [];
  const seen = new Set<string>();
  for (const iface of entries.filter((name) => name.includes(":"))) {
    const isAdb =
      readSysfs(iface, "bInterfaceClass") === hex(ADB_INTERFACE.classCode) &&
      readSysfs(iface, "bInterfaceSubClass") === hex(ADB_INTERFACE.subclassCode) &&
      readSysfs(iface, "bInterfaceProtocol") === hex(ADB_INTERFACE.protocolCode);
    const dev = iface.split(":")[0];
    if (!isAdb || seen.has(dev)) continue;
    seen.add(dev);

    const bus = readSysfs(dev, "busnum").padStart(3, "0");
    const num = readSysfs(dev, "devnum").padStart(3, "0");
    try {
      fs.accessSync(`/dev/bus/usb/${bus}/${num}`, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      result.push({
        serial: readSysfs(dev, "serial") || dev,
        name: readSysfs(dev, "product"),
        vendorId: readSysfs(dev, "idVendor"),
      });
    }
  }
  return result;
}

// Installs one udev rule per vendor giving the logged-in user (uaccess) access,
// then re-applies rules to the plugged devices. Returns true on success.
export function grantLinuxUsbAccess(vendorIds: string[]): boolean {
  const vendors = [...new Set(vendorIds)].filter((id) => /^[0-9a-f]{4}$/.test(id));
  if (!vendors.length) return false;

  const lines = ["set -e"];
  for (const vid of vendors) {
    const rule = `SUBSYSTEM=="usb", ATTR{idVendor}=="${vid}", MODE="0660", TAG+="uaccess"`;
    lines.push(`printf '%s\\n' '${rule}' > /etc/udev/rules.d/51-${APP_NAME}-${vid}.rules`);
  }
  lines.push("udevadm control --reload-rules");
  for (const vid of vendors) {
    lines.push(`udevadm trigger --subsystem-match=usb --attr-match=idVendor=${vid}`);
  }
  lines.push("udevadm settle");
  const script = lines.join("\n");

  // pkexec shows the desktop's password dialog; sudo asks in the terminal.
  const elevate = ["pkexec", "sudo"].find(commandExists);
  if (!elevate) return false;
  return spawnSync(elevate, ["sh", "-c", script], { stdio: "inherit" }).status === 0;
}

export function linuxManualInstructions(): string {
  return [
    "To grant access manually, install udev rules for Android devices, e.g.:",
    "  sudo apt install android-sdk-platform-tools-common   (Debian/Ubuntu)",
    "  sudo pacman -S android-udev                          (Arch)",
    "then unplug and replug the device.",
  ].join("\n");
}

// ---------- Windows ----------

// Bundled with the app (see scripts/build-wdi-simple.sh). __dirname is build/
// once bundled, and src/ under tsx: both are one level below the app root.
const WDI_SIMPLE = path.join(__dirname, "..", "vendor", "wdi", "wdi-simple.exe");

interface AdbInterfaceInfo {
  vendorId: number;
  productId: number;
  interfaceNumber: number;
  composite: boolean;
}

function adbInterfaceInfo(usbDevice: USBDevice): AdbInterfaceInfo | undefined {
  const interfaces = usbDevice.configuration?.interfaces ?? [];
  const adb = interfaces.find((iface) =>
    iface.alternates.some(
      (alt) =>
        alt.interfaceClass === ADB_INTERFACE.classCode &&
        alt.interfaceSubclass === ADB_INTERFACE.subclassCode &&
        alt.interfaceProtocol === ADB_INTERFACE.protocolCode
    )
  );
  if (!adb) return undefined;
  return {
    vendorId: usbDevice.vendorId,
    productId: usbDevice.productId,
    interfaceNumber: adb.interfaceNumber,
    composite: interfaces.length > 1,
  };
}

// wdi-simple can't run from inside the packaged executable, so copy it out first.
function extractWdiSimple(): { exe: string; dir: string } {
  const dir = path.join(os.tmpdir(), `${APP_NAME}-wdi`);
  fs.mkdirSync(dir, { recursive: true });
  const exe = path.join(dir, "wdi-simple.exe");
  fs.writeFileSync(exe, fs.readFileSync(WDI_SIMPLE));
  return { exe, dir };
}

// Installs WinUSB on the device's ADB interface. libwdi raises the UAC prompt
// itself. Returns true on success.
export function installWindowsDriver(usbDevice: USBDevice, name?: string): boolean {
  const info = adbInterfaceInfo(usbDevice);
  if (!info) return false;
  let wdi: { exe: string; dir: string };
  try {
    wdi = extractWdiSimple();
  } catch {
    return false;
  }

  const hex = (n: number) => `0x${n.toString(16).padStart(4, "0")}`;
  const args = [
    "--type", "0", // WinUSB
    "--vid", hex(info.vendorId),
    "--pid", hex(info.productId),
    "--name", name || "Android ADB Interface",
    "--dest", path.join(wdi.dir, "driver"),
    "--progressbar",
  ];
  if (info.composite) args.push("--iid", String(info.interfaceNumber));
  return spawnSync(wdi.exe, args, { stdio: "inherit", windowsHide: false }).status === 0;
}

export function windowsManualInstructions(): string {
  return [
    "To install the driver manually, use the Google USB Driver",
    "(https://developer.android.com/studio/run/win-usb) or Zadig (https://zadig.akeo.ie/),",
    "then unplug and replug the device.",
  ].join("\n");
}
