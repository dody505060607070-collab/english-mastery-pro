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
  a.addEventListener("ended", () => emit({ status: "idle", owner: null, time: 0 }));
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
  void a.play().catch(() => emit({ status: "error", error: "تعذر تشغيل الصوت" }));
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

async function playUrlInternal(url: string, owner: string, id: number) {
  const a = element();
  if (!a) throw new Error("الصوت غير مدعوم في هذا المتصفح");
  if (id !== requestId) return;
  a.src = url;
  a.volume = state.volume;
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
    emit({ status: "error", owner, error: (e as Error).message || "تعذر تشغيل الصوت" });
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
    utter.onerror = () => emit({ status: "error", owner, error: "تعذر تشغيل الصوت" });
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

const urlCache = new Map<string, string>();

/**
 * Speaks text using a real generated MP3 (works everywhere), falling back to
 * the browser speech engine only when generation is unavailable.
 * Call `primeAudio()` synchronously in the click handler before awaiting this.
 */
export async function playText(text: string, owner = "tts", voice?: string) {
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
    emit({ status: "error", owner, error: (e as Error).message || "تعذر تشغيل الصوت" });
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
