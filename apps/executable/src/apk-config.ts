// Writes the chatbot's params into the device owner APK without rebuilding
// or re-signing it, so the server can make one per request from a template
// (`npm run build:apk`). The JSON goes into the APK Signing Block, which sits
// between the zip entries and the central directory:
//
//   [size: u64][pairs: (length: u64, id: u32, value)...][size: u64]["APK Sig Block 42"]
//
// APK Signature Scheme v2/v3 signs the entries, the central directory and the
// end of central directory record (with the central directory offset taken as
// the block's start), but not the block's other pairs, so the signature stays
// valid. The app reads the pair back in ProvisioningConfig.kt.
const CONFIG_BLOCK_ID = 0x444f4346; // "DOCF", must match ProvisioningConfig.kt
// Padding pair apksigner adds so the block fills whole 4 KiB pages, which
// the v2 verity digest expects. Rebuilt after the config is added.
const VERITY_PADDING_ID = 0x42726577;
const PAGE_SIZE = 4096;

const SIGNING_BLOCK_MAGIC = Buffer.from("APK Sig Block 42", "ascii");
const EOCD_SIGNATURE = 0x06054b50;
const EOCD_SIZE = 22;
const EOCD_CD_OFFSET = 16;
const MAX_COMMENT = 0xffff;

function findEocd(apk: Buffer): number {
  const min = Math.max(0, apk.length - EOCD_SIZE - MAX_COMMENT);
  for (let offset = apk.length - EOCD_SIZE; offset >= min; offset--) {
    if (apk.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  throw new Error("Not a zip file");
}

function pair(id: number, value: Buffer): Buffer {
  const header = Buffer.alloc(12);
  header.writeBigUInt64LE(BigInt(4 + value.length), 0);
  header.writeUInt32LE(id, 8);
  return Buffer.concat([header, value]);
}

// Returns a copy of `apk` with `config` in its signing block, replacing any
// config already there.
export function embedApkConfig(apk: Buffer, config: unknown): Buffer {
  const eocd = findEocd(apk);
  const centralDir = apk.readUInt32LE(eocd + EOCD_CD_OFFSET);
  if (!apk.subarray(centralDir - 16, centralDir).equals(SIGNING_BLOCK_MAGIC)) {
    throw new Error("APK has no v2 signing block");
  }
  const blockSize = Number(apk.readBigUInt64LE(centralDir - 24));
  const blockStart = centralDir - blockSize - 8;

  const pairs: Buffer[] = [];
  for (let offset = blockStart + 8; offset < centralDir - 24; ) {
    const length = Number(apk.readBigUInt64LE(offset));
    const id = apk.readUInt32LE(offset + 8);
    if (id !== CONFIG_BLOCK_ID && id !== VERITY_PADDING_ID) pairs.push(apk.subarray(offset, offset + 8 + length));
    offset += 8 + length;
  }
  pairs.push(pair(CONFIG_BLOCK_ID, Buffer.from(JSON.stringify(config), "utf8")));

  // 8 + pairs + 8 + 16 bytes; a padding pair is at least 12.
  let size = 32 + pairs.reduce((sum, p) => sum + p.length, 0);
  if (size % PAGE_SIZE) {
    let padding = PAGE_SIZE - (size % PAGE_SIZE);
    if (padding < 12) padding += PAGE_SIZE;
    pairs.push(pair(VERITY_PADDING_ID, Buffer.alloc(padding - 12)));
    size += padding;
  }

  const sizeField = Buffer.alloc(8);
  sizeField.writeBigUInt64LE(BigInt(size - 8));
  const block = Buffer.concat([sizeField, ...pairs, sizeField, SIGNING_BLOCK_MAGIC]);

  const tail = Buffer.from(apk.subarray(centralDir));
  tail.writeUInt32LE(blockStart + block.length, eocd - centralDir + EOCD_CD_OFFSET);
  return Buffer.concat([apk.subarray(0, blockStart), block, tail]);
}
