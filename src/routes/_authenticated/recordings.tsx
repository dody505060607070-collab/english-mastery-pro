import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Pause, Play, PlaySquare, RotateCcw, RotateCw, VideoOff, Volume2, VolumeX } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getStudentRecordings } from "@/lib/recordings.functions";
import { useMediaUrl } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/recordings")({
  head: () => ({
    meta: [
      { title: "Lecture Recordings | Blue Language" },
      { name: "description", content: "Watch full recordings of live sessions at any time inside Blue Language." },
      { property: "og:title", content: "Lecture Recordings" },
      { property: "og:description", content: "Watch re-recorded live sessions in full." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecordingsPage,
});

function fmtDuration(sec?: number | null) {
  if (!sec || !Number.isFinite(sec)) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function canPlayWebm() {
  if (typeof document === "undefined") return true;
  const v = document.createElement("video");
  return v.canPlayType("video/webm") !== "";
}

function RecordingCard({ rec }: { rec: any }) {
  const src = useMediaUrl(rec.playback_url ?? rec.video_url, "content");
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [autoSound, setAutoSound] = useState(true);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const playAfterSeekRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const path = rec.video_url ?? "";
  const isImage = /\.(png|jpe?g|webp|gif|heic)$/i.test(path);
  const isPdf = /\.pdf$/i.test(path);
  const isWebm = /\.webm$/i.test(path);
  const unsupported = isWebm && !canPlayWebm();

  // restore the student's saved sound preferences
  useEffect(() => {
    const v = Number(localStorage.getItem("rec-volume"));
    if (Number.isFinite(v) && v > 0) setVolume(Math.min(1, v));
    setAutoSound(localStorage.getItem("rec-auto-sound") !== "0");
  }, []);

  // keep the <video> element in sync with the in-app controls
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted, started]);

  useEffect(() => {
    if (!waiting) return;
    const timeout = window.setTimeout(() => {
      if (videoRef.current?.readyState === 0) setFailed(true);
      setWaiting(false);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [waiting]);

  async function startPlayback() {
    setStarted(true);
    setWaiting(true);
    setMuted(!autoSound);
    window.setTimeout(() => {
      const el = videoRef.current;
      if (!el) return;
      el.volume = volume;
      el.muted = !autoSound;
      el.play().catch(() => {
        // some browsers block audible autoplay: retry muted so the video still plays
        el.muted = true;
        setMuted(true);
        el.play().catch(() => {
          setWaiting(false);
          setFailed(true);
        });
      });
    }, 0);
  }

  function changeVolume(v: number) {
    setVolume(v);
    localStorage.setItem("rec-volume", String(v));
    if (v > 0 && muted) setMuted(false);
  }

  function toggleAutoSound(on: boolean) {
    setAutoSound(on);
    localStorage.setItem("rec-auto-sound", on ? "1" : "0");
  }

  const totalDuration = mediaDuration ?? rec.duration_seconds ?? 0;

  function seekTo(seconds: number, resumePlayback = playing) {
    const el = videoRef.current;
    if (!el || !Number.isFinite(seconds)) return;
    const bounded = Math.max(0, Math.min(totalDuration || seconds, seconds));
    pendingSeekRef.current = bounded;
    playAfterSeekRef.current = resumePlayback;
    setScrubTime(null);
    setCurrentTime(bounded);
    setWaiting(true);

    if (el.readyState === HTMLMediaElement.HAVE_NOTHING) {
      el.load();
      return;
    }

    const seekable = el.seekable;
    const canFastSeek = typeof (el as HTMLVideoElement & { fastSeek?: (time: number) => void }).fastSeek === "function";
    let target = bounded;
    if (seekable.length > 0) {
      const start = seekable.start(0);
      const end = seekable.end(seekable.length - 1);
      target = Math.max(start, Math.min(end, bounded));
    }
    if (canFastSeek) (el as HTMLVideoElement & { fastSeek: (time: number) => void }).fastSeek(target);
    else el.currentTime = target;
  }

  function togglePlayback() {
    const el = videoRef.current;
    if (!el) return;
    if (el.seeking) {
      playAfterSeekRef.current = true;
      setWaiting(true);
    } else if (el.paused) {
      setWaiting(true);
      void el.play().catch(() => setWaiting(false));
    }
    else el.pause();
  }

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-black">
        {src && isImage ? (
          <img src={src} alt={rec.title} className="w-full h-full object-contain" loading="lazy" />
        ) : src && isPdf ? (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="w-full h-full flex items-center justify-center text-primary-foreground font-black underline"
          >
            Open File
          </a>
        ) : src && (unsupported || failed) ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-4">
            <VideoOff className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-bold text-muted-foreground">
                This recording format is not supported on your phone browser.
              </p>
              <Button asChild size="sm" className="gap-2 font-black">
                <a href={src} target="_blank" rel="noreferrer" download>
                  <Download className="h-4 w-4" /> Download / Open Lecture
              </a>
            </Button>
          </div>
        ) : src && started ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={src}
              controls
              playsInline
              className="w-full h-full bg-background object-contain"
              preload="metadata"
              onLoadedMetadata={(event) => {
                const seconds = event.currentTarget.duration;
                if (Number.isFinite(seconds) && seconds > 0) setMediaDuration(Math.round(seconds));
                const pending = pendingSeekRef.current;
                if (pending !== null) event.currentTarget.currentTime = pending;
              }}
              onDurationChange={(event) => {
                const seconds = event.currentTarget.duration;
                if (Number.isFinite(seconds) && seconds > 0) setMediaDuration(Math.round(seconds));
              }}
              onTimeUpdate={(event) => {
                if (scrubTime === null) setCurrentTime(event.currentTarget.currentTime);
              }}
              onCanPlay={() => setWaiting(false)}
              onPlaying={() => { setWaiting(false); setPlaying(true); }}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onSeeking={() => setWaiting(true)}
              onSeeked={(event) => {
                pendingSeekRef.current = null;
                setCurrentTime(event.currentTarget.currentTime);
                setWaiting(false);
                if (playAfterSeekRef.current) {
                  playAfterSeekRef.current = false;
                  void event.currentTarget.play().catch(() => setWaiting(false));
                }
              }}
              onError={() => { setWaiting(false); setFailed(true); }}
              onStalled={() => setWaiting(true)}
              onWaiting={() => setWaiting(true)}
            />
            {waiting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 pointer-events-none">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="text-xs font-bold text-foreground">Loading selected minute…</span>
              </div>
            )}
          </div>
        ) : src ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-muted p-4">
            <Button type="button" size="lg" className="h-14 w-14 rounded-full p-0" onClick={() => void startPlayback()} aria-label="Play Lecture">
              <Play className="h-6 w-6 fill-current" />
            </Button>
            <p className="text-sm font-black">Tap to play lecture</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        )}
      </div>

      {started && !failed && !unsupported && !isImage && !isPdf && (
        <div className="space-y-3 border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-right text-xs font-black tabular-nums">
              {fmtDuration(scrubTime ?? currentTime) ?? "0:00"}
            </span>
            <Slider
              className="min-w-0 flex-1"
              value={[Math.min(scrubTime ?? currentTime, totalDuration || scrubTime || currentTime)]}
              max={Math.max(1, totalDuration)}
              step={1}
              onValueChange={(value) => setScrubTime(value[0] ?? 0)}
              onValueCommit={(value) => seekTo(value[0] ?? 0, true)}
              aria-label="Lecture timeline"
            />
            <span className="w-14 shrink-0 text-xs font-black tabular-nums">
              {fmtDuration(totalDuration) ?? "0:00"}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" size="icon" variant="secondary" onClick={() => seekTo(currentTime - 10)} aria-label="Back 10 seconds" title="Back 10 seconds">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </Button>
            <Button type="button" size="icon" variant="secondary" onClick={() => seekTo(currentTime + 10)} aria-label="Forward 10 seconds" title="Forward 10 seconds">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            size="icon"
            variant={muted ? "destructive" : "secondary"}
            className="h-9 w-9 shrink-0"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            className="flex-1 min-w-[120px]"
            value={[muted ? 0 : Math.round(volume * 100)]}
            max={100}
            step={5}
            onValueChange={(v) => changeVolume((v[0] ?? 0) / 100)}
            aria-label="Volume Level"
          />
          <span className="text-xs font-black w-10 text-center">{muted ? 0 : Math.round(volume * 100)}%</span>
          <div className="flex items-center gap-2">
            <Switch id={`auto-${rec.id}`} checked={autoSound} onCheckedChange={toggleAutoSound} />
            <Label htmlFor={`auto-${rec.id}`} className="text-xs font-bold">
              Autoplay sound
            </Label>
          </div>
          </div>
        </div>
      )}

      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {rec.sections?.name && <Badge variant="secondary">{rec.sections.name}</Badge>}
          {fmtDuration(mediaDuration ?? rec.duration_seconds) && (
            <Badge variant="outline">Duration {fmtDuration(mediaDuration ?? rec.duration_seconds)}</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(rec.recorded_at).toLocaleDateString("en-US")}
          </span>
        </div>
        <h2 className="text-lg font-black">{rec.title}</h2>
        {rec.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-line">{rec.description}</p>
        )}
        {src && !isImage && !isPdf && (
          <Button asChild variant="outline" size="sm" className="gap-2 font-black">
            <a href={src} target="_blank" rel="noreferrer" download>
              <Download className="h-4 w-4" /> Download Lecture to Phone
            </a>
          </Button>
        )}
      </CardContent>

    </Card>
  );
}

function RecordingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-recordings"],
    queryFn: () => getStudentRecordings(),
  });

  return (
    <div className="min-h-screen p-4 md:p-8 font-['Outfit']" dir="ltr">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1 text-left">
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <PlaySquare className="h-7 w-7 text-primary" />
            Lecture Recordings
          </h1>
          <p className="text-muted-foreground font-medium">Watch full live sessions at any time.</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !data || data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-20 flex flex-col items-center gap-3 text-center">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-black">No recordings available now</p>
              <p className="text-sm text-muted-foreground">Each lecture recording will be uploaded after it ends.</p>
            </CardContent>
          </Card>
        ) : (
          data.map((rec: any) => <RecordingCard key={rec.id} rec={rec} />)
        )}
      </div>
    </div>
  );
}
