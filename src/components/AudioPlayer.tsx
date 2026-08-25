import { useId, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useMediaUrl } from "@/lib/storage";
import {
  pauseAudio,
  playText,
  playUrl,
  primeAudio,
  resumeAudio,
  seekAudio,
  setAudioVolume,
  stopAudio,
  useAudioState,
} from "@/lib/audio";
import { cn } from "@/lib/utils";

function fmt(s: number) {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Unified audio player used across the whole platform.
 * Plays a real audio file when one exists, otherwise generates a real MP3
 * from the transcript (with browser speech as a last-resort fallback).
 */
export function AudioPlayer({
  path,
  text,
  maxPlays,
  className,
}: {
  path?: string | null | undefined;
  text?: string | null | undefined;
  maxPlays?: number | null | undefined;
  className?: string | undefined;
}) {
  const owner = useId();
  const url = useMediaUrl(path);
  const audio = useAudioState();
  const [plays, setPlays] = useState(0);

  const mine = audio.owner === owner;
  const playing = mine && audio.status === "playing";
  const loading = mine && audio.status === "loading";
  const errored = mine && audio.status === "error";
  const limitReached = !!maxPlays && plays >= maxPlays;
  const canPlay = !!url || !!text;

  const time = mine ? audio.time : 0;
  const duration = mine ? audio.duration : 0;

  async function start() {
    // Must run synchronously inside the tap for iOS / Android to allow playback.
    primeAudio();
    setPlays((p) => p + 1);
    try {
      if (url) await playUrl(url, owner);
      else if (text) await playText(text, owner);
    } catch {
      /* state already reflects the error */
    }
  }

  function toggle() {
    if (playing) {
      pauseAudio();
      return;
    }
    if (mine && audio.status === "paused") {
      primeAudio();
      resumeAudio();
      return;
    }
    if (limitReached || !canPlay) return;
    void start();
  }

  function restart() {
    if (mine && (playing || audio.status === "paused")) {
      seekAudio(0);
      if (!playing) resumeAudio();
      return;
    }
    stopAudio();
    if (!limitReached && canPlay) void start();
  }

  return (
    <div className={cn("rounded-2xl border bg-card p-4 space-y-3", className)} dir="ltr">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          onClick={toggle}
          disabled={limitReached || !canPlay}
          className="h-14 w-14 sm:h-12 sm:w-12 rounded-full shrink-0 touch-manipulation"
          aria-label={playing ? "Pause" : "Play"}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : playing ? (
            <Pause className="h-6 w-6 sm:h-5 sm:w-5" />
          ) : (
            <Play className="h-6 w-6 sm:h-5 sm:w-5" />
          )}
        </Button>

        <div className="flex-1 space-y-1">
          <Slider
            value={[time]}
            max={duration || 100}
            step={0.1}
            disabled={!duration}
            onValueChange={([v]) => {
              if (v !== undefined) seekAudio(v);
            }}
          />
          <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
            <span>{fmt(time)}</span>
            <span>{duration ? fmt(duration) : url ? "--:--" : "Audio"}</span>
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={restart}
          className="h-11 w-11 sm:h-10 sm:w-10 touch-manipulation"
          aria-label="Replay"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 w-28">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setAudioVolume(audio.volume > 0 ? 0 : 1)}
            aria-label="Volume"
          >
            {audio.volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Slider
            value={[audio.volume * 100]}
            max={100}
            step={1}
            onValueChange={([v]) => setAudioVolume((v ?? 0) / 100)}
          />
        </div>
      </div>

      {errored && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-destructive/10 px-3 py-2" dir="rtl">
          <p className="text-xs font-bold text-destructive">
            {audio.error || "Could not play the audio, try again"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => void start()}>
            Try again
          </Button>
        </div>
      )}

      {maxPlays ? (
        <p className="text-[11px] font-bold text-muted-foreground text-center" dir="rtl">
          {limitReached ? "The allowed number of listens has ended" : `Listens remaining: ${maxPlays - plays}`}
        </p>
      ) : null}
    </div>
  );
}
