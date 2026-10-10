// HTTP service that creates executables for the chatbot's "generate installer"
// button. The binaries and the device owner APK are built once (`npm run build`,
// `npm run build:apk`) and used as templates: each request writes the collected
// params into a copy of the APK (see apk-config.ts), embeds both at the end of a
// copy of the binary for the user's OS (see embedded-config.ts), which installs
// the APK on the phone connected over USB, and uploads it to the BUCKET_NAME
// S3 bucket.
//
//   POST /executables       { platform: 'linux' | 'windows' | 'macos', config }
//                           Authorization: a Keycloak service token (see auth.ts)
//                           -> 201 { id, filename, url }, `url` being a presigned
//                              download link valid for EXECUTABLE_URL_TTL_S
//   GET  /health            200 ok (no auth, for the healthcheck)
import {
  GetBucketLifecycleConfigurationCommand,
  GetObjectCommand,
  PutBucketLifecycleConfigurationCommand,
  PutObjectCommand,
  S3Client,
  type LifecycleRule,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spawnSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import os from "os";
import path from "path";
import { authenticate } from "./auth";
import { embedApkConfig } from "./apk-config";
import { encodePayload, MAX_CONFIG_BYTES, type EmbeddedConfig } from "./embedded-config";

const PORT = Number(process.env.EXECUTABLE_PORT ?? 5005);
const TEMPLATES_DIR = process.env.EXECUTABLE_TEMPLATES_DIR ?? path.resolve(__dirname, "../dist");
const APK_TEMPLATE = process.env.EXECUTABLE_APK_TEMPLATE ?? path.join(TEMPLATES_DIR, "device-owner.apk");
const OUTPUT_DIR = process.env.EXECUTABLE_OUTPUT_DIR ?? path.join(os.tmpdir(), "executable-builds");
const URL_TTL_S = Number(process.env.EXECUTABLE_URL_TTL_S ?? 60 * 60);
// Uploaded installers are one-shot downloads, so S3 expires them after this
// many days via a lifecycle rule on the `installers/` prefix (see
// ensureLifecycleRule).
const OBJECT_TTL_DAYS = Number(process.env.EXECUTABLE_OBJECT_TTL_DAYS ?? 1);
const INSTALLERS_PREFIX = "installers/";
const LIFECYCLE_RULE_ID = "expire-installers";
const BUCKET_NAME = process.env.BUCKET_NAME;
if (!BUCKET_NAME) throw new Error("BUCKET_NAME is not set");

// Region and credentials come from the usual AWS env vars (AWS_REGION,
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) or the default provider chain.
const s3 = new S3Client({});

type Platform = "linux" | "windows" | "macos";

// Template names, first found wins: `npm run build` names them per target,
// the single-platform builds (build:linux, build:win) don't.
const TEMPLATES: Record<Platform, string[]> = {
  linux: ["executable-linux-x64", "executable-linux"],
  windows: ["executable-win-x64.exe", "executable-win.exe"],
  macos: ["executable-macos-arm64"],
};
// The file inside the archive (what the user runs after extracting).
const BINARY_NAMES: Record<Platform, string> = {
  linux: "device-owner-installer-linux",
  windows: "device-owner-installer.exe",
  macos: "device-owner-installer-macos",
};

// Everything is delivered as a .zip: an HTTP/S3 download doesn't carry the
// executable bit, so a raw Linux/macOS binary would arrive without it and the
// OS would refuse to run it; zip stores the mode (0755), so the extracted
// binary is runnable with no chmod. zip also opens natively on Windows (unlike
// .tar.gz), which keeps the download friendly on every OS.
const ARCHIVE_NAMES: Record<Platform, string> = {
  linux: "device-owner-installer-linux.zip",
  windows: "device-owner-installer-windows.zip",
  macos: "device-owner-installer-macos.zip",
};

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const isPlatform = (value: unknown): value is Platform =>
  typeof value === "string" && value in TEMPLATES;

const nullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

function parseConfig(value: unknown): EmbeddedConfig {
  const config = value as Partial<EmbeddedConfig> | null;
  const valid =
    typeof config === "object" &&
    config !== null &&
    nullableString(config.os) &&
    nullableString(config.version) &&
    nullableString(config.privateDnsHost) &&
    // Optional, so a chatbot that doesn't send it yet still works.
    (config.appVersion === undefined || nullableString(config.appVersion)) &&
    (config.allowedApps === null ||
      (Array.isArray(config.allowedApps) && config.allowedApps.every((app) => typeof app === "string")));
  if (!valid) throw new HttpError(400, "Invalid config");
  const { os: mobileOs, version, privateDnsHost, allowedApps, appVersion = null } = config as EmbeddedConfig;
  return { os: mobileOs, version, privateDnsHost, allowedApps, appVersion };
}

async function createApk(config: EmbeddedConfig): Promise<Buffer> {
  let template: Buffer;
  try {
    template = await fs.promises.readFile(APK_TEMPLATE);
  } catch {
    throw new HttpError(503, `No APK template at ${APK_TEMPLATE}; run npm run build:apk`);
  }
  return embedApkConfig(template, config);
}

function findTemplate(platform: Platform): string {
  for (const name of TEMPLATES[platform]) {
    const file = path.join(TEMPLATES_DIR, name);
    if (fs.existsSync(file)) return file;
  }
  throw new HttpError(503, `No ${platform} template in ${TEMPLATES_DIR}; run npm run build`);
}

// Changing the binary breaks its macOS signature, so it's signed again
// (ad hoc, like the build) when a signing tool is around.
function resignMac(file: string): void {
  const [command, args] =
    process.platform === "darwin" ? ["codesign", ["--force", "--sign", "-", file]] : ["ldid", ["-S", file]];
  const result = spawnSync(command, args, { stdio: "ignore" });
  if (result.error || result.status !== 0) {
    console.warn(`Could not re-sign ${file} with ${command}; macOS may refuse to run it`);
  }
}

async function upload(file: string, key: string, filename: string): Promise<string> {
  const { size } = await fs.promises.stat(file);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fs.createReadStream(file),
      ContentLength: size,
      ContentType: "application/octet-stream",
      ContentDisposition: `attachment; filename="${filename}"`,
    }),
  );
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }), { expiresIn: URL_TTL_S });
}

// Zips `entry` (a file in `dir`) into `<dir>/<archiveName>`, preserving its
// mode, and returns the archive path.
function archive(dir: string, entry: string, archiveName: string): string {
  const zipPath = path.join(dir, archiveName);
  const result = spawnSync("zip", ["-q", archiveName, entry], { cwd: dir, stdio: "ignore" });
  if (result.error || result.status !== 0) throw new HttpError(500, `Could not zip ${entry}`);
  return zipPath;
}

async function createExecutable(
  platform: Platform,
  config: EmbeddedConfig,
): Promise<{ id: string; filename: string; url: string }> {
  const template = findTemplate(platform);
  const apk = await createApk(config);
  const id = crypto.randomUUID();
  const dir = path.join(OUTPUT_DIR, id);
  const binaryName = BINARY_NAMES[platform];
  const file = path.join(dir, binaryName);

  await fs.promises.mkdir(dir, { recursive: true });
  try {
    await fs.promises.copyFile(template, file);
    await fs.promises.appendFile(file, encodePayload({ config, apk }));
    await fs.promises.chmod(file, 0o755);
    if (platform === "macos") resignMac(file);
    const artifact = archive(dir, binaryName, ARCHIVE_NAMES[platform]);
    const filename = path.basename(artifact);
    const url = await upload(artifact, `installers/${id}/${filename}`, filename);
    return { id, filename, url };
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_CONFIG_BYTES) {
        reject(new HttpError(413, "Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
};

// Checked before reading the body, so anonymous callers can't make the
// service buffer it.
async function requireAuth(req: IncomingMessage): Promise<void> {
  try {
    await authenticate(req);
  } catch (err) {
    console.warn(`Unauthorized ${req.method} ${req.url}: ${err instanceof Error ? err.message : String(err)}`);
    throw new HttpError(401, "Unauthorized");
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
    return;
  }

  if (req.method === "POST" && pathname === "/executables") {
    await requireAuth(req);
    const body = (await readJson(req)) as { platform?: unknown; config?: unknown } | null;
    if (!isPlatform(body?.platform)) throw new HttpError(400, "Invalid platform");
    const created = await createExecutable(body.platform, parseConfig(body.config));
    sendJson(res, 201, created);
    return;
  }

  throw new HttpError(404, "Not found");
}

const server = createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) sendJson(res, status, { error: err instanceof Error ? err.message : "Error" });
    else res.destroy();
  });
});

// Makes S3 delete uploaded installers OBJECT_TTL_DAYS after upload, by ensuring
// a lifecycle rule on the `installers/` prefix. Idempotent and merged with any
// other rules the bucket has. A failure (e.g. no s3:PutLifecycleConfiguration
// permission) only warns: installers still work, they just won't auto-expire.
async function ensureLifecycleRule(): Promise<void> {
  const rule: LifecycleRule = {
    ID: LIFECYCLE_RULE_ID,
    Filter: { Prefix: INSTALLERS_PREFIX },
    Status: "Enabled",
    Expiration: { Days: OBJECT_TTL_DAYS },
    AbortIncompleteMultipartUpload: { DaysAfterInitiation: OBJECT_TTL_DAYS },
  };

  let existing: LifecycleRule[] = [];
  try {
    const current = await s3.send(new GetBucketLifecycleConfigurationCommand({ Bucket: BUCKET_NAME }));
    existing = current.Rules ?? [];
  } catch (err) {
    // No lifecycle config yet is expected (NoSuchLifecycleConfiguration).
    if ((err as { name?: string }).name !== "NoSuchLifecycleConfiguration") throw err;
  }

  const rules = [...existing.filter((r) => r.ID !== LIFECYCLE_RULE_ID), rule];
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: BUCKET_NAME,
      LifecycleConfiguration: { Rules: rules },
    }),
  );
}

server.listen(PORT, () => {
  console.log(
    `executable service listening on :${PORT} (templates: ${TEMPLATES_DIR}, APK: ${APK_TEMPLATE}, bucket: ${BUCKET_NAME})`,
  );
  ensureLifecycleRule()
    .then(() => console.log(`Installers in ${INSTALLERS_PREFIX} expire after ${OBJECT_TTL_DAYS} day(s)`))
    .catch((err: unknown) =>
      console.warn(
        `Could not set the installers lifecycle rule (they won't auto-expire): ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
});
