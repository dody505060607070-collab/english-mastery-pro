import { useSyncExternalStore } from "react";
import { synthesizeSpeech } from "@/lib/tts.functions";

/**
 * Cross-device audio engine.
 *
 * Why a single shared <audio> element?
 *  - iOS Safari / Android Chrome only allow playback on an element that was
 *    "activated" inside a real user gesture. Creating `new Audio()` after an
 *    `await` (e.g. after fetching a signed URL) is blocked on mobile.
 *  - So we keep ONE element, unlock it synchronously on the first tap with a
 *    tiny silent WAV, then simply swap `src` for every later sound.
 *  - It also guarantees only one sound plays at a time across the whole app.
 */

const SILENT_WAV =
  "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type AudioState = {
  status: AudioStatus;
  /** Identifier of the component/sound that currently owns the player. */
  owner: string | null;
  error: string | null;
  time: number;
  duration: number;
  volume: number;
};

let state: AudioState = {
  status: "idle",
  owner: null,
  error: null,
  time: 0,
  duration: 0,
  volume: 1,
};

const listeners = new Set<() => void>();

function emit(patch: Partial<AudioState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let el: HTMLAudioElement | null = null;
let unlocked = false;
let requestId = 0;
/** True while a multi-segment dialogue is being played back-to-back. */
let chainActive = false;

function element(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (el) return el;
  const a = new Audio();
  a.preload = "auto";
  a.setAttribute("playsinline", "true");
  // iOS needs this to avoid taking over the screen for audio-only media.
  (a as unknown as { playsInline: boolean }).playsInline = true;
  a.addEventListener("timeupdate", () => emit({ time: a.currentTime }));
  a.addEventListener("durationchange", () =>
    emit({ duration: Number.isFinite(a.duration) ? a.duration : 0 }),
  );
  a.addEventListener("playing", () => emit({ status: "playing", error: null }));
  a.addEventListener("pause", () => {
    if (!a.ended && state.status === "playing") emit({ status: "paused" });
  });
  a.addEventListener("ended", () => {
    // During a dialogue chain the chain handler advances to the next segment.
    if (chainActive) return;
    emit({ status: "idle", owner: null, time: 0 });
  });
  el = a;
  return a;
}

/**
 * MUST be called synchronously inside a click/tap handler before any await.
 * Unlocks mobile audio so a later `src` swap can start playing.
 */
export function primeAudio() {
  const a = element();
  if (!a || unlocked) return;
  try {
    a.src = SILENT_WAV;
    a.volume = 0;
    const p = a.play();
    if (p && typeof p.then === "function") {
      void p
        .then(() => {
          unlocked = true;
          a.pause();
          a.currentTime = 0;
          a.volume = state.volume;
        })
        .catch(() => {
          a.volume = state.volume;
        });
    } else {
      unlocked = true;
      a.volume = state.volume;
    }
  } catch {
    /* ignore */
  }
}

export function stopAudio() {
  chainActive = false;
  const a = element();
  if (a) {
    a.pause();
    try {
      a.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  emit({ status: "idle", owner: null, time: 0 });
}

export function pauseAudio() {
  const a = element();
  if (a && !a.paused) a.pause();
  emit({ status: "paused" });
}

export function resumeAudio() {
  const a = element();
  if (!a) return;
  void a.play().catch(() => emit({ status: "error", error: "Could not play the audio" }));
}

export function setAudioVolume(v: number) {
  const a = element();
  if (a) a.volume = v;
  emit({ volume: v });
}

export function seekAudio(t: number) {
  const a = element();
  if (a) {
    try {
      a.currentTime = t;
    } catch {
      /* ignore */
    }
  }
  emit({ time: t });
}

/**
 * Global playback speed. Listening material gets faster as the CEFR level
 * rises, so C2 learners hear near-native pace and A1 learners hear slow speech.
 */
let playbackRate = 1;

/** Sets the speaking speed used by the next playback (0.7 - 1.4). */
export function setPlaybackRate(rate: number) {
  playbackRate = Math.min(1.4, Math.max(0.7, rate));
}

/** Maps a CEFR level label (e.g. "B2.1") to a natural speaking speed. */
export function rateForLevel(level?: string | null): number {
  const m = /^(A1|A2|B1|B2|C1|C2)(?:\.(\d))?/i.exec((level ?? "").trim());
  if (!m) return 1;
  const base: Record<string, number> = { a1: 0.82, a2: 0.88, b1: 0.95, b2: 1.02, c1: 1.1, c2: 1.18 };
  const step = m[2] === "2" ? 0.03 : 0;
  return (base[m[1]!.toLowerCase()] ?? 1) + step;
}

async function playUrlInternal(url: string, owner: string, id: number) {
  const a = element();
  if (!a) throw new Error("Audio is not supported in this browser");
  if (id !== requestId) return;
  a.src = url;
  a.volume = state.volume;
  a.playbackRate = playbackRate;
  a.currentTime = 0;
  emit({ status: "loading", owner, error: null, time: 0, duration: 0 });
  await a.play();
  if (id === requestId) emit({ status: "playing", owner, error: null });
}

/** Plays a real audio file (storage/CDN URL). */
export async function playUrl(url: string, owner = "url") {
  const id = ++requestId;
  stopSpeech();
  try {
    await playUrlInternal(url, owner, id);
  } catch (e) {
    if (id !== requestId) return;
    emit({ status: "error", owner, error: (e as Error).message || "Could not play the audio" });
    throw e;
  }
}

function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Last-resort fallback: the browser's own speech engine (unreliable on iOS). */
function browserSpeak(text: string, owner: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
    if (voice) utter.voice = voice;
    utter.onstart = () => emit({ status: "playing", owner, error: null });
    utter.onend = () => emit({ status: "idle", owner: null });
    utter.onerror = () => emit({ status: "error", owner, error: "Could not play the audio" });
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

const urlCache = new Map<string, string>();

type DialogueSegment = { speaker: string; text: string };

/**
 * Detects "A: ... / B: ..." dialogue transcripts. Speaker labels are stripped
 * from what is spoken and each speaker gets a distinct voice, so listening
 * passages sound like two people talking instead of one voice reading "A, B".
 */
function parseDialogue(raw: string): DialogueSegment[] | null {
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const parts: DialogueSegment[] = [];
  let labelled = 0;
  for (const line of lines) {
    // Markdown headings are section boundaries: ignore ones before the
    // dialogue ("## Before you listen") and stop at ones after it
    // ("## Key phrases", "## Comprehension").
    if (/^#{1,4}\s/.test(line)) {
      if (parts.length) break;
      continue;
    }
    const m = line.match(/^([A-Za-z][A-Za-z ]{0,18})\s*[:：]\s*(.+)$/);
    if (m) {
      labelled++;
      const speaker = m[1]!.trim();
      const last = parts[parts.length - 1];
      if (last && last.speaker === speaker) last.text += " " + m[2]!.trim();
      else parts.push({ speaker, text: m[2]!.trim() });
    } else if (parts.length) {
      parts[parts.length - 1]!.text += " " + line;
    }
  }
  if (labelled < 2) return null;
  if (new Set(parts.map((p) => p.speaker)).size < 2) return null;
  return parts;
}

const DIALOGUE_VOICES = ["alloy", "nova", "echo", "shimmer"];

/** Synthesizes each dialogue turn with its speaker's voice and plays them in order. */
async function playDialogue(segments: DialogueSegment[], owner: string, id: number) {
  const voiceOf = new Map<string, string>();
  for (const seg of segments) {
    if (!voiceOf.has(seg.speaker)) {
      voiceOf.set(seg.speaker, DIALOGUE_VOICES[voiceOf.size % DIALOGUE_VOICES.length]!);
    }
  }

  const urls: string[] = [];
  for (const seg of segments) {
    if (id !== requestId) return;
    const voice = voiceOf.get(seg.speaker)!;
    const clean = seg.text.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const key = `${voice}::${clean}`;
    let url = urlCache.get(key);
    if (!url) {
      const res = await synthesizeSpeech({ data: { text: clean, voice } });
      if (id !== requestId) return;
      url = res.url;
      urlCache.set(key, url);
    }
    urls.push(url);
  }
  if (!urls.length || id !== requestId) return;

  const a = element();
  if (!a) throw new Error("Audio is not supported in this browser");

  let i = 0;
  const playNext = async () => {
    if (id !== requestId || i >= urls.length) {
      if (id === requestId) {
        chainActive = false;
        emit({ status: "idle", owner: null, time: 0 });
      }
      return;
    }
    chainActive = true;
    a.src = urls[i]!;
    a.volume = state.volume;
    a.playbackRate = playbackRate;
    a.currentTime = 0;
    const onEnded = () => {
      a.removeEventListener("ended", onEnded);
      i++;
      void playNext();
    };
    a.addEventListener("ended", onEnded);
    try {
      await a.play();
    } catch (e) {
      a.removeEventListener("ended", onEnded);
      chainActive = false;
      if (id === requestId) {
        emit({ status: "error", owner, error: (e as Error).message || "Could not play the audio" });
      }
    }
  };

  emit({ status: "playing", owner, error: null });
  await playNext();
}

/**
 * Speaks text using a real generated MP3 (works everywhere), falling back to
 * the browser speech engine only when generation is unavailable.
 * Call `primeAudio()` synchronously in the click handler before awaiting this.
 */
export async function playText(text: string, owner = "tts", voice?: string) {
  const dialogue = parseDialogue(text);
  if (dialogue && !voice) {
    const id = ++requestId;
    stopSpeech();
    emit({ status: "loading", owner, error: null });
    try {
      await playDialogue(dialogue, owner, id);
    } catch (e) {
      if (id !== requestId) return;
      chainActive = false;
      // Fall back to one-voice playback of the stripped text below.
      const flat = dialogue.map((s) => s.text).join(" ");
      if (browserSpeak(flat, owner)) return;
      emit({ status: "error", owner, error: (e as Error).message || "Could not play the audio" });
    }
    return;
  }

  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return;
  const id = ++requestId;
  const key = `${voice ?? "alloy"}::${clean}`;
  stopSpeech();
  emit({ status: "loading", owner, error: null });

  const cachedUrl = urlCache.get(key);
  if (cachedUrl) {
    try {
      await playUrlInternal(cachedUrl, owner, id);
      return;
    } catch {
      urlCache.delete(key);
    }
  }

  try {
    const res = await synthesizeSpeech({ data: { text: clean, ...(voice ? { voice } : {}) } });
    if (id !== requestId) return;
    urlCache.set(key, res.url);
    await playUrlInternal(res.url, owner, id);
  } catch (e) {
    if (id !== requestId) return;
    if (browserSpeak(clean, owner)) return;
    emit({ status: "error", owner, error: (e as Error).message || "Could not play the audio" });
  }
}

export function useAudioState(): AudioState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

/** True when the given owner id currently controls the player. */
export function isOwnerActive(owner: string, s: AudioState) {
  return s.owner === owner && (s.status === "playing" || s.status === "loading");
}
