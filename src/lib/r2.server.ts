/** Minimal AWS SigV4 presigner for Cloudflare R2 (S3 API), Worker-safe (Web Crypto only). */

const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(data)));
}

const encodeKey = (key: string) =>
  key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string | null;
}

export function readR2Config(): R2Config {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];
  const bucket = process.env["R2_BUCKET"];
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Video storage (R2) is not configured yet");
  }
  const publicBaseUrl = (process.env["R2_PUBLIC_BASE_URL"] || "").trim().replace(/\/$/, "");
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl: publicBaseUrl || null };
}

/** Builds a presigned S3 URL (query-signed) valid for `expiresIn` seconds. */
export async function presignR2(
  method: "PUT" | "GET",
  key: string,
  expiresIn = 3600,
  cfg: R2Config = readR2Config(),
): Promise<string> {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const path = `/${cfg.bucket}/${encodeKey(key)}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${cfg.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  });
  params.sort();

  const canonicalRequest = [
    method,
    path,
    params.toString(),
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(enc.encode(`AWS4${cfg.secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, "auto");
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, stringToSign));

  return `https://${host}${path}?${params.toString()}&X-Amz-Signature=${signature}`;
}

/** Public URL when a custom R2 domain is set, otherwise a temporary signed link. */
export async function r2PlaybackUrl(key: string, expiresIn = 60 * 60 * 6): Promise<string> {
  const cfg = readR2Config();
  if (cfg.publicBaseUrl) return `${cfg.publicBaseUrl}/${encodeKey(key)}`;
  return presignR2("GET", key, expiresIn, cfg);
}

export async function deleteR2Object(key: string): Promise<void> {
  const url = await presignR2("PUT", key, 300); // presign shape reused for DELETE below
  void url;
  const cfg = readR2Config();
  const signed = await presignR2("GET", key, 300, cfg);
  void signed;
  // DELETE needs its own signature.
  const del = await presignDelete(key, cfg);
  const res = await fetch(del, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Could not delete the video file (${res.status})`);
}

async function presignDelete(key: string, cfg: R2Config): Promise<string> {
  // Same algorithm with the DELETE verb.
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const path = `/${cfg.bucket}/${encodeKey(key)}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${cfg.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": "300",
    "X-Amz-SignedHeaders": "host",
  });
  params.sort();
  const canonicalRequest = ["DELETE", path, params.toString(), `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
  const kDate = await hmac(enc.encode(`AWS4${cfg.secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, "auto");
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, stringToSign));
  return `https://${host}${path}?${params.toString()}&X-Amz-Signature=${signature}`;
}
