export type StreamPlatform = "youtube" | "tiktok" | "meet";

/** Detects the streaming platform from a URL. */
export function detectPlatform(url: string): StreamPlatform {
  const u = (url || "").toLowerCase();
  if (u.includes("tiktok.")) return "tiktok";
  if (u.includes("meet.google.com")) return "meet";
  return "youtube";
}

function normalizeUrl(url: string): string {
  const raw = (url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

/** Extracts a YouTube video/live id from any common YouTube URL shape. */
export function youtubeId(url: string): string | null {
  const raw = normalizeUrl(url);
  try {
    const u = new URL(raw);
    const host = u.hostname.replace("www.", "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (!host.includes("youtube.")) return null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["live", "embed", "shorts", "v"].includes(p));
    const next = idx >= 0 ? parts[idx + 1] : undefined;
    if (next) return next;
    return null;
  } catch {
    return null;
  }
}

/** Extracts a TikTok username (without @) from a TikTok live/profile URL. */
export function tiktokUser(url: string): string | null {
  const raw = normalizeUrl(url);
  try {
    const u = new URL(raw);
    if (!u.hostname.includes("tiktok.")) return null;
    const seg = u.pathname.split("/").filter(Boolean).find((p) => p.startsWith("@"));
    return seg ? seg.slice(1) : null;
  } catch {
    return null;
  }
}

/** Returns an in-site embeddable URL, or null when the platform can't be embedded. */
export function embedUrl(url: string): string | null {
  const platform = detectPlatform(url);
  if (platform === "youtube") {
    const id = youtubeId(url);
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    const channel = normalizeUrl(url).match(/youtube\.com\/(?:channel\/)?(UC[\w-]+)/i)?.[1];
    if (channel) return `https://www.youtube.com/embed/live_stream?channel=${channel}&autoplay=1`;
    return null;
  }
  if (platform === "tiktok") {
    const user = tiktokUser(url);
    return user ? `https://www.tiktok.com/embed/live/@${user}` : null;
  }
  return null; // Google Meet can't be embedded in an iframe
}

/** The link opened in a new tab as a fallback. */
export function watchUrl(url: string): string {
  return normalizeUrl(url);
}

export const platformLabel: Record<StreamPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  meet: "Google Meet",
};
