// HTTP service that creates executables for the chatbot's "generate installer"
// button. The binaries are built once (`npm run build`) and used as
// templates: each request copies the one for the user's OS, embeds the
// collected params at its end (see embedded-config.ts) and uploads it to the
// BUCKET_NAME S3 bucket.
//
//   POST /executables       { platform: 'linux' | 'windows' | 'macos', config }
//                           -> 201 { id, filename, url }, `url` being a presigned
//                              download link valid for EXECUTABLE_URL_TTL_S
//   GET  /health            200 ok
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spawnSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import os from "os";
import path from "path";
import { encodeConfig, MAX_CONFIG_BYTES, type EmbeddedConfig } from "./embedded-config";

const PORT = Number(process.env.EXECUTABLE_PORT ?? 5005);
const TEMPLATES_DIR = process.env.EXECUTABLE_TEMPLATES_DIR ?? path.resolve(__dirname, "../dist");
const OUTPUT_DIR = process.env.EXECUTABLE_OUTPUT_DIR ?? path.join(os.tmpdir(), "executable-builds");
const URL_TTL_S = Number(process.env.EXECUTABLE_URL_TTL_S ?? 60 * 60);
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
const DOWNLOAD_NAMES: Record<Platform, string> = {
  linux: "device-owner-installer-linux",
  windows: "device-owner-installer.exe",
  macos: "device-owner-installer-macos",
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
    (config.allowedApps === null ||
      (Array.isArray(config.allowedApps) && config.allowedApps.every((app) => typeof app === "string")));
  if (!valid) throw new HttpError(400, "Invalid config");
  const { os: mobileOs, version, privateDnsHost, allowedApps } = config as EmbeddedConfig;
  return { os: mobileOs, version, privateDnsHost, allowedApps };
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

async function createExecutable(
  platform: Platform,
  config: EmbeddedConfig,
): Promise<{ id: string; filename: string; url: string }> {
  const template = findTemplate(platform);
  const id = crypto.randomUUID();
  const file = path.join(OUTPUT_DIR, id);
  const filename = DOWNLOAD_NAMES[platform];

  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  try {
    await fs.promises.copyFile(template, file);
    await fs.promises.appendFile(file, encodeConfig(config));
    await fs.promises.chmod(file, 0o755);
    if (platform === "macos") resignMac(file);
    const url = await upload(file, `installers/${id}/${filename}`, filename);
    return { id, filename, url };
  } finally {
    await fs.promises.rm(file, { force: true });
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

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
    return;
  }

  if (req.method === "POST" && pathname === "/executables") {
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

server.listen(PORT, () =>
  console.log(`executable service listening on :${PORT} (templates: ${TEMPLATES_DIR}, bucket: ${BUCKET_NAME})`),
);
