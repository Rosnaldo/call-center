// Config embedded at the end of a built executable by the server
// (src/server.ts), so each download carries the params collected by the
// chatbot without rebuilding. Layout, appended after the pkg binary:
//
//   [config JSON, UTF-8][JSON length: uint32 LE][MAGIC]
//
// pkg finds its own payload through offsets from the start of the file, and
// both ELF and PE ignore trailing data, so the binary still runs.
import fs from "fs";

const MAGIC = Buffer.from("DOCFG001", "ascii");
const LENGTH_BYTES = 4;
const TRAILER_BYTES = LENGTH_BYTES + MAGIC.length;
export const MAX_CONFIG_BYTES = 64 * 1024;

export interface EmbeddedConfig {
  os: string | null;
  version: string | null;
  privateDnsHost: string | null;
  allowedApps: string[] | null;
}

export function encodeConfig(config: EmbeddedConfig): Buffer {
  const json = Buffer.from(JSON.stringify(config), "utf8");
  if (json.length > MAX_CONFIG_BYTES) throw new Error("Config too large");
  const length = Buffer.alloc(LENGTH_BYTES);
  length.writeUInt32LE(json.length);
  return Buffer.concat([json, length, MAGIC]);
}

// The config embedded in `file`, or null when there is none (e.g. running
// with tsx, where the file is the node binary itself).
export function readEmbeddedConfig(file: string = process.execPath): EmbeddedConfig | null {
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
    if (!trailer.subarray(LENGTH_BYTES).equals(MAGIC)) return null;

    const length = trailer.readUInt32LE(0);
    if (length > MAX_CONFIG_BYTES || length > size - TRAILER_BYTES) return null;
    const json = Buffer.alloc(length);
    fs.readSync(fd, json, 0, length, size - TRAILER_BYTES - length);
    return JSON.parse(json.toString("utf8")) as EmbeddedConfig;
  } catch {
    return null;
  } finally {
    fs.closeSync(fd);
  }
}
