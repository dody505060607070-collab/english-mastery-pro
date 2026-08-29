/** Helpers for embedding YouTube (including unlisted) lecture links. */

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null;
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return null;
    const v = parsed.searchParams.get("v");
    if (v) return v;
    const match = parsed.pathname.match(/\/(embed|shorts|live|v)\/([^/?#]+)/);
    return match?.[2] ?? null;
  } catch {
    return null;
  }
}

export function isYouTubeUrl(url?: string | null) {
  return !!getYouTubeId(url);
}

/** Privacy-friendly embed URL; works for unlisted videos too. */
export function youTubeEmbedUrl(url?: string | null) {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null;
}

export function youTubeThumbnail(url?: string | null) {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
