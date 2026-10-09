// Config and device owner APK embedded at the end of a built executable by the
// server (src/server.ts), so each download carries the params collected by the
// chatbot without rebuilding. Layout, appended after the pkg binary:
//
//   [config JSON, UTF-8][APK][JSON length: uint32 LE][APK length: uint32 LE][MAGIC]
//
// pkg finds its own payload through offsets from the start of the file, and
// both ELF and PE ignore trailing data, so the binary still runs.
import fs from "fs";

const MAGIC = Buffer.from("DOCFG002", "ascii");
const LENGTH_BYTES = 4;
const TRAILER_BYTES = 2 * LENGTH_BYTES + MAGIC.length;
export const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_APK_BYTES = 512 * 1024 * 1024;

export interface EmbeddedConfig {
  os: string | null;
  version: string | null;
  privateDnsHost: string | null;
  allowedApps: string[] | null;
}

export interface EmbeddedPayload {
  config: EmbeddedConfig;
  /** The device owner APK, with `config` inside (see apk-config.ts). */
  apk: Buffer;
}

export function encodePayload({ config, apk }: EmbeddedPayload): Buffer {
  const json = Buffer.from(JSON.stringify(config), "utf8");
  if (json.length > MAX_CONFIG_BYTES) throw new Error("Config too large");
  const trailer = Buffer.alloc(TRAILER_BYTES);
  trailer.writeUInt32LE(json.length, 0);
  trailer.writeUInt32LE(apk.length, LENGTH_BYTES);
  MAGIC.copy(trailer, 2 * LENGTH_BYTES);
  return Buffer.concat([json, apk, trailer]);
}

// The payload embedded in `file`, or null when there is none (e.g. running
// with tsx, where the file is the node binary itself).
export function readEmbeddedPayload(file: string = process.execPath): EmbeddedPayload | null {
  let fd: number;
  try {
    fd = fs.openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const size = fs.fstatSync(fd).size;
    if (size < TRAILER_BYTES) return null;

    const trailer = Buffer.alloc(TRAILER_BYTES);
    fs.readSync(fd, trailer, 0, TRAILER_BYTES, size - TRAILER_BYTES);
    if (!trailer.subarray(2 * LENGTH_BYTES).equals(MAGIC)) return null;

    const jsonLength = trailer.readUInt32LE(0);
    const apkLength = trailer.readUInt32LE(LENGTH_BYTES);
    if (jsonLength > MAX_CONFIG_BYTES || apkLength > MAX_APK_BYTES) return null;
    if (jsonLength + apkLength > size - TRAILER_BYTES) return null;

    const json = Buffer.alloc(jsonLength);
    const apk = Buffer.alloc(apkLength);
    const apkStart = size - TRAILER_BYTES - apkLength;
    fs.readSync(fd, json, 0, jsonLength, apkStart - jsonLength);
    fs.readSync(fd, apk, 0, apkLength, apkStart);
    return { config: JSON.parse(json.toString("utf8")) as EmbeddedConfig, apk };
  } catch {
    return null;
  } finally {
    fs.closeSync(fd);
  }
}
