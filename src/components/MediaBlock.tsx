import { useMediaUrl } from "@/lib/storage";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function isYoutube(u: string) {
  return /youtube\.com|youtu\.be/.test(u);
}

function youtubeEmbed(u: string) {
  const id = u.includes("youtu.be")
    ? u.split("youtu.be/")[1]?.split(/[?&]/)[0]
    : new URL(u).searchParams.get("v");
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** Renders uploaded lesson media (video, audio, pdf, image) from storage or an external link. */
export function MediaBlock({ path, kind }: { path?: string | null; kind?: string }) {
  const url = useMediaUrl(path);
  if (!path) return null;
  if (!url)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل الملف...
      </div>
    );

  const lower = (path.split("?")[0] || "").toLowerCase();
  const ext = lower.split(".").pop() || "";

  if (isYoutube(url)) {
    const embed = youtubeEmbed(url);
    if (embed)
      return (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border">
          <iframe src={embed} className="h-full w-full" allowFullScreen title="video" />
        </div>
      );
  }

  if (kind === "video" || ["mp4", "webm", "mov", "m4v"].includes(ext)) {
    return <video src={url} controls playsInline className="w-full rounded-2xl border bg-black" />;
  }

  if (kind === "listening" || ["mp3", "wav", "m4a", "ogg", "aac"].includes(ext)) {
    return <audio src={url} controls className="w-full" />;
  }

  if (["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext)) {
    return <img src={url} alt="" className="w-full rounded-2xl border object-contain" />;
  }

  if (ext === "pdf") {
    return (
      <div className="space-y-2">
        <iframe src={url} className="h-[70vh] w-full rounded-2xl border" title="pdf" />
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            فتح الملف في نافذة جديدة
          </a>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild variant="outline">
      <a href={url} target="_blank" rel="noreferrer" className="gap-2">
        <FileText className="h-4 w-4" /> تحميل الملف
      </a>
    </Button>
  );
}
