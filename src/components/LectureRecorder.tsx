import { useEffect, useReducer, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, Circle, Download, Loader2, Mic, MicOff, MonitorUp, Pause, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveRecording } from "@/lib/recordings.functions";
import { createR2UploadUrl } from "@/lib/r2.functions";
import { getStorageBudget } from "@/lib/storage-budget.functions";

export type RecQuality = "normal" | "high" | "max";

const QUALITY: Record<RecQuality, { w: number; h: number; fps: number; video: number; audio: number; label: string }> = {
  normal: { w: 1280, h: 720, fps: 20, video: 1_100_000, audio: 96_000, label: "Normal (720p) — smallest files" },
  high: { w: 1600, h: 900, fps: 24, video: 1_800_000, audio: 128_000, label: "High (900p) — balanced" },
  max: { w: 1920, h: 1080, fps: 30, video: 3_200_000, audio: 160_000, label: "Max (1080p) — sharpest text" },
};

type RecState = {
  starting: boolean;
  recording: boolean;
  paused: boolean;
  saving: boolean;
  uploadProgress: number;
  elapsed: number;
  level: number;
  tabLevel: number;
  hasMic: boolean;
  hasSystemAudio: boolean;
  micDenied: boolean;
  silent: boolean;
  recovery: { url: string; name: string } | null;
  unfinished: { meta: BackupMeta; size: number } | null;
  recovering: boolean;
  attemptNo: number;
  micMuted: boolean;
  /** True while the browser's "share another screen/tab" picker is open. */
  switching: boolean;
  /** Which surface is currently being captured (screen / window / tab). */
  surface: string | null;
  quality: RecQuality;
  micVol: number;
  tabVol: number;
  lowSpace: string | null;
  saved: { title: string; duration: number } | null;
  pendingDuration: number;
  confirmDelete: boolean;
  /** Which recorder card owns the running session. */
  owner: string | null;
};

type DisplayAudioNodes = { src: MediaStreamAudioSourceNode; gain: GainNode; analyser: AnalyserNode };

type Compositor = {
  track: MediaStreamTrack;
  setSource: (s: MediaStream) => void;
  stop: () => void;
};

/**
 * The lecture is encoded from a canvas instead of the raw capture track, so the
 * teacher can switch between Entire screen / Window / Chrome tab in the middle of
 * a recording without ending the file (MediaRecorder cannot swap a live track).
 * The redraw timer lives in a Web Worker because background tabs throttle normal
 * timers down to 1 fps, which would freeze the video whenever the teacher moves
 * to the Meet tab.
 */
function createCompositor(source: MediaStream, q: { w: number; h: number; fps: number }): Compositor {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream(source.getVideoTracks());
  void video.play().catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = q.w;
  canvas.height = q.h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, q.w, q.h);
  }

  let stopped = false;
  const draw = () => {
    if (stopped || !ctx) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.min(q.w / vw, q.h / vh);
    const w = vw * scale;
    const h = vh * scale;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, q.w, q.h);
    ctx.drawImage(video, (q.w - w) / 2, (q.h - h) / 2, w, h);
  };

  let worker: Worker | null = null;
  let fallbackTimer: number | null = null;
  try {
    const src = "let id;onmessage=(e)=>{clearInterval(id);if(e.data>0)id=setInterval(()=>postMessage(0),e.data);};";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    worker.onmessage = draw;
    worker.postMessage(Math.max(20, Math.round(1000 / q.fps)));
  } catch {
    fallbackTimer = window.setInterval(draw, Math.max(20, Math.round(1000 / q.fps)));
  }

  const out = canvas.captureStream(q.fps);
  const track = out.getVideoTracks()[0] as MediaStreamTrack;

  return {
    track,
    setSource(s: MediaStream) {
      video.srcObject = new MediaStream(s.getVideoTracks());
      void video.play().catch(() => undefined);
    },
    stop() {
      stopped = true;
      worker?.terminate();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
      out.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

type Box<T> = { current: T };
const box = <T,>(v: T): Box<T> => ({ current: v });


type RecSession = {
  state: RecState;
  listeners: Set<() => void>;
  refs: {
    recorder: Box<MediaRecorder | null>;
    chunks: Box<Blob[]>;
    startedAt: Box<number>;
    mime: Box<string>;
    cleanup: Box<(() => void) | null>;
    raf: Box<number | null>;
    finalizing: Box<boolean>;
    mounted: Box<boolean>;
    canvas: Box<HTMLCanvasElement | null>;
    loudAt: Box<number>;
    shareEnd: Box<(() => void) | null>;
    audioCtx: Box<AudioContext | null>;
    audioDest: Box<MediaStreamAudioDestinationNode | null>;
    analyser: Box<AnalyserNode | null>;
    display: Box<MediaStream | null>;
    displayAudioNodes: Box<DisplayAudioNodes | null>;
    backupChain: Box<Promise<void>>;
    backupFailed: Box<boolean>;
    meterTimer: Box<number | null>;
    wakeLock: Box<{ release: () => Promise<void> } | null>;
    micGain: Box<GainNode | null>;
    micStream: Box<MediaStream | null>;
    pausedAt: Box<number>;
    compositor: Box<Compositor | null>;
    attachDisplayAudio: Box<((s: MediaStream) => DisplayAudioNodes | null) | null>;
  };
};

/**
 * One module-level recording session shared by every mount of the recorder, so
 * the lecture keeps recording while the admin navigates between pages.
 */
function getSession(): RecSession {
  const g = globalThis as unknown as { __lectureRecSession?: RecSession };
  if (!g.__lectureRecSession) {
    g.__lectureRecSession = {
      state: {
        starting: false,
        recording: false,
        paused: false,
        saving: false,
        uploadProgress: 0,
        elapsed: 0,
        level: 0,
        tabLevel: 0,
        hasMic: true,
        hasSystemAudio: false,
        micDenied: false,
        silent: false,
        recovery: null,
        unfinished: null,
        recovering: false,
        attemptNo: 0,
        micMuted: false,
        switching: false,
        surface: null,
        quality: "high",
        micVol: 1,
        tabVol: 2.2,
        lowSpace: null,
        saved: null,
        pendingDuration: 0,
        confirmDelete: false,
        owner: null,
      },
      listeners: new Set(),
      refs: {
        recorder: box<MediaRecorder | null>(null),
        chunks: box<Blob[]>([]),
        startedAt: box(0),
        mime: box("video/webm"),
        cleanup: box<(() => void) | null>(null),
        raf: box<number | null>(null),
        finalizing: box(false),
        mounted: box(true),
        canvas: box<HTMLCanvasElement | null>(null),
        loudAt: box(0),
        shareEnd: box<(() => void) | null>(null),
        audioCtx: box<AudioContext | null>(null),
        audioDest: box<MediaStreamAudioDestinationNode | null>(null),
        analyser: box<AnalyserNode | null>(null),
        display: box<MediaStream | null>(null),
        displayAudioNodes: box<DisplayAudioNodes | null>(null),
        backupChain: box<Promise<void>>(Promise.resolve()),
        backupFailed: box(false),
        meterTimer: box<number | null>(null),
        wakeLock: box<{ release: () => Promise<void> } | null>(null),
        micGain: box<GainNode | null>(null),
        micStream: box<MediaStream | null>(null),
        pausedAt: box(0),
        compositor: box<Compositor | null>(null),
        attachDisplayAudio: box<((s: MediaStream) => DisplayAudioNodes | null) | null>(null),
      },
    };
  }
  const session = g.__lectureRecSession;
  if (!session) throw new Error("Could not initialize lecture recorder session");
  return session;
}


function fmt(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/** Direct browser → Cloudflare R2 upload with real progress. */
function putToR2(url: string, file: File, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.send(file);
  });
}

/** Picks the best container/codec the current browser can actually record. */
function pickMime() {
  // Chromium's MP4 MediaRecorder implementation is still less reliable during
  // multi-hour screen captures. VP8/WebM is the proven long-session path; its
  // seek metadata is repaired before upload.
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

/**
 * MediaRecorder WebM files carry no duration in their header, so most players
 * (and Chrome itself) report only the first few minutes of a long lecture and
 * refuse to seek past it. We patch the real duration (measured by our own timer)
 * straight into the header — a cheap, streaming-safe operation that works for
 * multi-GB files, unlike full re-muxing which silently fails on long lectures.
 */
async function repairBlob(blob: Blob, type: string, durationMs?: number): Promise<Blob> {
  if (!type.includes("webm")) return blob;
  // MediaRecorder's timesliced WebM can already contain a short, non-zero
  // Duration copied from an early cluster. `fix-webm-duration` deliberately
  // refuses to replace that value, which made an hour-long file appear to be
  // only the first 2–5 seconds. This parser scans the clusters and rebuilds the
  // seek metadata while preserving the media bytes via Blob.slice, so it also
  // works for long recordings without flattening the whole video into memory.
  try {
    const { default: fixWebmDuration } = await import("webm-duration-fix");
    const fixed = await fixWebmDuration(new Blob([blob], { type }));
    return fixed.size >= blob.size * 0.98 ? fixed : blob;
  } catch {
    // Some browser codecs cannot be parsed by the seek-metadata repair. For
    // those, write our measured duration as a fallback when the header permits.
    if (durationMs && durationMs > 1000) {
      try {
        const { default: fixDuration } = await import("fix-webm-duration");
        const fixed = await fixDuration(new Blob([blob], { type }), Math.round(durationMs), { logger: false });
        if (fixed && fixed.size >= blob.size) return fixed;
      } catch {
        /* keep the complete original media bytes below */
      }
    }
    return blob;
  }
}





/** Paints the live waveform of the mixed audio into the preview canvas. */
function drawWave(canvas: HTMLCanvasElement | null, buf: Uint8Array, peak: number) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth * dpr;
  const h = canvas.clientHeight * dpr;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 2 * dpr;
  ctx.strokeStyle = peak > 0.02 ? "rgb(16 185 129)" : "rgb(148 163 184)";
  ctx.beginPath();
  const step = w / buf.length;
  for (let i = 0; i < buf.length; i++) {
    const v = ((buf[i] ?? 128) - 128) / 128;
    const y = h / 2 + v * (h / 2) * 0.9;
    if (i === 0) ctx.moveTo(0, y);
    else ctx.lineTo(i * step, y);
  }
  ctx.stroke();
}

// ============================================================================
// Incremental crash-safe backup (IndexedDB).
// Every MediaRecorder chunk (1/sec) is appended to IndexedDB immediately, so a
// power cut / browser crash / restart never loses more than ~1 second — and
// "stop()" is NOT required for the recording to survive.
// ============================================================================

const BACKUP_DB = "lecture-recorder-backup";

type BackupMeta = {
  mime: string;
  title: string;
  startedAt: number;
  updatedAt: number;
  liveSessionId?: string | null;
  sectionId?: string | null;
};

function openBackupDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function runTx<T>(db: IDBDatabase, stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => T | void) {
  return new Promise<T | void>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const out = fn(tx);
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Append one chunk + refresh the session meta (best-effort, never throws). */
async function backupAppendChunk(chunk: Blob, meta: BackupMeta): Promise<boolean> {
  try {
    const db = await openBackupDb();
    await runTx(db, ["meta", "chunks"], "readwrite", (tx) => {
      tx.objectStore("chunks").add(chunk);
      tx.objectStore("meta").put({ ...meta, updatedAt: Date.now() }, "active");
    });
    db.close();
    return true;
  } catch {
    // Backup is best-effort; recording itself must never fail because of it.
    return false;
  }
}

/** Returns the unfinished session (if any) with all of its saved chunks. */
async function backupRead(): Promise<{ meta: BackupMeta; chunks: Blob[] } | null> {
  try {
    const db = await openBackupDb();
    let meta: BackupMeta | undefined;
    let chunks: Blob[] = [];
    await runTx(db, ["meta", "chunks"], "readonly", (tx) => {
      const metaReq = tx.objectStore("meta").get("active");
      const chunksReq = tx.objectStore("chunks").getAll();
      metaReq.onsuccess = () => {
        meta = metaReq.result as BackupMeta | undefined;
      };
      chunksReq.onsuccess = () => {
        chunks = ((chunksReq.result as Blob[] | undefined) ?? []).filter((b) => b && b.size > 0);
      };
    });
    db.close();
    return meta && chunks.length > 0 ? { meta, chunks } : null;
  } catch {
    return null;
  }
}

async function backupClear(): Promise<void> {
  try {
    const db = await openBackupDb();
    await runTx(db, ["meta", "chunks"], "readwrite", (tx) => {
      tx.objectStore("meta").clear();
      tx.objectStore("chunks").clear();
    });
    db.close();
  } catch {
    // ignore
  }
}

function backupBlob(chunks: Blob[], mime: string) {
  const type = mime.split(";")[0] ?? "video/webm";
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  return { blob: new Blob(chunks, { type }), type, ext };
}

/**
 * Records the lecture from the admin's browser. The capture source is whatever
 * the teacher picks in the browser picker — intended to be the entire screen
 * (with system audio enabled so Meet and any shared media are recorded).
 * Nothing external (YouTube etc.) needs to be opened for audio to work.
 *
 * Audio is mixed through the Web Audio API because MediaRecorder only records
 * the FIRST audio track of a stream — simply concatenating tracks silences the mic.
 */
export function LectureRecorder({
  title,
  liveSessionId,
  sectionId,
  onSaved,
  autoStart,
}: {
  title: string;
  liveSessionId?: string | null;
  sectionId?: string | null;
  onSaved?: () => void;
  autoStart?: boolean;
}) {
  // ---- Cross-page session -------------------------------------------------
  // Everything mutable lives in one module-level session so navigating to another
  // admin page (or unmounting this component) never stops an ongoing recording.
  const S = getSession();
  const R = S.refs;
  const recorderRef = R.recorder;
  const chunksRef = R.chunks;
  const startedAtRef = R.startedAt;
  const mimeRef = R.mime;
  const cleanupRef = R.cleanup;
  const rafRef = R.raf;
  const finalizingRef = R.finalizing;
  const mountedRef = R.mounted;
  const canvasRef = R.canvas;
  const loudAtRef = R.loudAt;
  const shareEndCleanupRef = R.shareEnd;
  const audioCtxRef = R.audioCtx;
  const audioDestRef = R.audioDest;
  const analyserRef = R.analyser;
  const displayRef = R.display;
  const displayAudioNodesRef = R.displayAudioNodes;
  const backupWriteChainRef = R.backupChain;
  const backupFailedRef = R.backupFailed;
  const meterTimerRef = R.meterTimer;
  const wakeLockRef = R.wakeLock;
  const micGainRef = R.micGain;
  const micStreamRef = R.micStream;
  const pausedAtRef = R.pausedAt;
  const compositorRef = R.compositor;
  const attachDisplayAudioRef = R.attachDisplayAudio;

  const [, force] = useReducer((n: number) => n + 1, 0);
  const [micTestOn, setMicTestOn] = useState(false);
  const [micTestLevel, setMicTestLevel] = useState(0);
  const micTestRef = useRef<{ stop: () => void } | null>(null);
  const requestR2Url = useServerFn(createR2UploadUrl);
  const persistRecording = useServerFn(saveRecording);
  const checkBudget = useServerFn(getStorageBudget);
  useEffect(() => {
    S.listeners.add(force);
    return () => {
      S.listeners.delete(force);
    };
  }, [S]);

  const st = S.state;
  const {
    starting,
    recording,
    saving,
    uploadProgress,
    elapsed,
    level,
    tabLevel = 0,
    hasMic,
    hasSystemAudio,
    micDenied,
    silent,
    recovery,
    unfinished,
    recovering,
    attemptNo,
    micMuted,
    paused,
    quality,
    micVol,
    tabVol,
    lowSpace,
    saved,
    pendingDuration,
    confirmDelete,
  } = st;
  const patch = (p: Partial<RecState>) => {
    Object.assign(S.state, p);
    S.listeners.forEach((l) => l());
  };
  const ownerKey = liveSessionId ?? "default";
  const isOwner = !st.owner || st.owner === ownerKey;
  const setRecording = (v: boolean) => patch({ recording: v });
  const setSaving = (v: boolean) => patch({ saving: v });
  const setUploadProgress = (v: number) => patch({ uploadProgress: v });
  const setElapsed = (v: number) => patch({ elapsed: v });
  const setLevel = (v: number) => patch({ level: v });
  const setTabLevel = (v: number) => patch({ tabLevel: v });
  const setHasMic = (v: boolean) => patch({ hasMic: v });
  const setHasSystemAudio = (v: boolean) => patch({ hasSystemAudio: v });
  const setMicDenied = (v: boolean) => patch({ micDenied: v });
  const setSilent = (v: boolean) => patch({ silent: v });
  const setRecovery = (v: RecState["recovery"]) => patch({ recovery: v });
  const setUnfinished = (v: RecState["unfinished"]) => patch({ unfinished: v });
  const setRecovering = (v: boolean) => patch({ recovering: v });
  const setAttemptNo = (v: number) => patch({ attemptNo: v });
  const setMicMuted = (v: boolean) => patch({ micMuted: v });

  function toggleMicMute() {
    const next = !micMuted;
    setMicMuted(next);
    if (micGainRef.current) micGainRef.current.gain.value = next ? 0 : micVol;
    micStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    toast.info(next ? "Your microphone is muted — screen/tab audio is still recording." : "Your microphone is on again.");
  }

  /** Live mixing controls: fix low YouTube/Meet volume without restarting. */
  function changeMicVol(v: number) {
    patch({ micVol: v });
    if (micGainRef.current && !micMuted) micGainRef.current.gain.value = v;
  }
  function changeTabVol(v: number) {
    patch({ tabVol: v });
    const g = displayAudioNodesRef.current?.gain;
    if (g) g.gain.value = v;
  }

  /** Pause / resume without ending the session (break time). */
  function togglePause() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      try {
        rec.pause();
      } catch {
        return;
      }
      pausedAtRef.current = Date.now();
      patch({ paused: true });
      toast.info("Recording paused.");
    } else if (rec.state === "paused") {
      try {
        rec.resume();
      } catch {
        return;
      }
      if (pausedAtRef.current) startedAtRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = 0;
      patch({ paused: false });
      toast.success("Recording resumed.");
    }
  }

  // Keyboard shortcut: Ctrl/Cmd+Shift+S stops & saves, Ctrl/Cmd+Shift+P pauses.
  useEffect(() => {
    if (!recording || !isOwner) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        stopRecording();
      } else if (k === "p") {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, isOwner, paused]);

  // Disk-space watchdog: long lectures need free space for the local backup.
  useEffect(() => {
    if (!recording) return;
    let stopped = false;
    const check = async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        if (stopped || !est?.quota) return;
        const freeMb = Math.max(0, (est.quota - (est.usage ?? 0)) / (1024 * 1024));
        if (freeMb < 700) {
          patch({ lowSpace: `${Math.round(freeMb)} MB free — stop and save soon to avoid losing the lecture.` });
        } else if (S.state.lowSpace) {
          patch({ lowSpace: null });
        }
      } catch {
        /* storage estimate unsupported */
      }
    };
    void check();
    const t = setInterval(() => void check(), 60_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);


  useEffect(() => {
    if (!recording || paused) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, paused]);

  useEffect(() => {
    mountedRef.current = true;
    // Detect an unfinished recording session left behind by a crash / power cut.
    void (async () => {
      if (S.state.recording) return;
      const backup = await backupRead();
      if (!backup) return;
      const size = backup.chunks.reduce((sum, c) => sum + c.size, 0);
      if (size < 1000) {
        await backupClear();
        return;
      }
      setUnfinished({ meta: backup.meta, size });
    })();
    // NOTE: intentionally no stop on unmount — recording continues across page
    // navigation and only ends when the teacher presses Stop (or the browser/tab
    // is closed, in which case the IndexedDB backup is recovered next time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(
    () => () => {
      if (recovery) URL.revokeObjectURL(recovery.url);
    },
    [recovery],
  );

  useEffect(() => {
    if (!recording && !saving) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recording, saving]);

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    // Show the saving panel immediately: repairing a long WebM can take a while
    // before the upload percentage starts moving.
    patch({ saving: true, uploadProgress: 0 });
    try {
      recorder.requestData();
    } catch {
      // stop() below still emits the final available chunk.
    }
    try {
      recorder.stop();
    } catch {
      void finalize();
    }
  }

  function listenForShareEnd(stream: MediaStream) {
    shareEndCleanupRef.current?.();
    const screenTrack = stream.getVideoTracks()[0];
    if (!screenTrack) return;
    const onEnded = () => {
      if (finalizingRef.current) return;
      toast.info("Screen sharing ended — saving recording automatically");
      stopRecording();
    };
    screenTrack.addEventListener("ended", onEnded, { once: true });
    shareEndCleanupRef.current = () => screenTrack.removeEventListener("ended", onEnded);
  }

  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Your browser does not support screen recording. Use Chrome on a computer.");
      return;
    }
    // AudioContext must be created/resumed while the Record button's user gesture
    // is still active. Creating it after the share + microphone permission dialogs
    // can leave Chrome's mixer suspended, producing a video with a silent audio track.
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    patch({ starting: true, owner: ownerKey, saved: null });
    const ctx = new Ctx();
    const initialResume = ctx.state === "suspended" ? ctx.resume().catch(() => undefined) : Promise.resolve();
    try {
      // Ask the browser not to evict a multi-hour local backup under storage pressure.
      // Unsupported browsers simply continue with normal IndexedDB storage.
      await navigator.storage?.persist?.().catch(() => false);
      // Never silently discard an interrupted session: it must be recovered or deleted first.
      const existing = await backupRead();
      if (existing) {
        const size = existing.chunks.reduce((sum, c) => sum + c.size, 0);
        if (size >= 1000) {
          if (mountedRef.current) setUnfinished({ meta: existing.meta, size });
          toast.error("An unfinished recording backup exists — recover or delete it before starting a new one.");
          void ctx.close().catch(() => undefined);
          patch({ starting: false, owner: null });
          return;
        }
        await backupClear();
      }

      if (recovery) {
        URL.revokeObjectURL(recovery.url);
        setRecovery(null);
      }
      finalizingRef.current = false;
      const Q = QUALITY[S.state.quality];

      // Prefer a browser tab because Chrome can reliably expose that tab's audio.
      // Entire-screen/system audio is OS-dependent and is unavailable on macOS.
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: Q.fps, max: Q.fps },
          width: { ideal: Q.w },
          height: { ideal: Q.h },
          displaySurface: "browser",
        },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        ...({
          systemAudio: "include",
          windowAudio: "system",
          surfaceSwitching: "include",
          monitorTypeSurfaces: "include",
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
          suppressLocalAudioPlayback: false,
        } as Record<string, unknown>),
      } as DisplayMediaStreamOptions);

      const displayHasAudio = display.getAudioTracks().some((track) => track.readyState === "live");
      display.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setHasSystemAudio(displayHasAudio);
      const capturedSurface = display.getVideoTracks()[0]?.getSettings().displaySurface;

      // 2. Request microphone separately to avoid failing the whole capture if mic is denied.
      let mic: MediaStream | null = null;
      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        mic = null;
      }
      const micHasAudio = !!mic?.getAudioTracks().some((track) => track.readyState === "live");
      setHasMic(micHasAudio);
      setMicDenied(!mic);
      setSilent(false);
      loudAtRef.current = Date.now();
      if (!micHasAudio && !displayHasAudio) {
        display.getTracks().forEach((track) => track.stop());
        void ctx.close().catch(() => undefined);
        toast.error("No audio permission was granted. Allow the microphone, or share a Chrome tab with tab audio enabled.");
        patch({ starting: false, owner: null });
        return;
      }
      if (!micHasAudio) toast.warning("Microphone denied — recording shared audio only.");
      if (!displayHasAudio) {
        // Keep recording the selected screen and microphone. Some Chrome/OS
        // combinations do not expose a shared-audio track even after the user
        // successfully selects a screen, and aborting here made the UI appear as
        // though Record had done nothing. Warn clearly instead of cancelling.
        toast.warning(
          capturedSurface === "browser"
            ? "Recording started, but shared-tab audio is OFF. Your screen and microphone are recording. Enable 'Also share tab audio' next time to capture Meet/YouTube audio."
            : "Recording started, but screen audio is OFF. Your screen and microphone are recording. Enable 'Share system audio' next time to capture computer sound.",
          { duration: 12_000 },
        );
      }

      // 3. Mix audio tracks properly (MediaRecorder only supports ONE audio track)
      await initialResume;
      if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
      const dest = ctx.createMediaStreamDestination();
      // Keeps the boosted tab/YouTube audio loud without clipping the mix.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 20;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      comp.connect(dest);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      audioCtxRef.current = ctx;
      audioDestRef.current = dest;
      analyserRef.current = analyser;
      displayRef.current = display;

      const attach = (s: MediaStream, gain: number, withOwnAnalyser = false) => {
        if (s.getAudioTracks().length === 0) return null;
        const audioOnlyStream = new MediaStream(s.getAudioTracks());
        const src = ctx.createMediaStreamSource(audioOnlyStream);
        const g = ctx.createGain();
        const sourceAnalyser = ctx.createAnalyser();
        sourceAnalyser.fftSize = 512;
        g.gain.value = gain;
        src.connect(g);
        g.connect(comp);
        g.connect(analyser);
        if (withOwnAnalyser) g.connect(sourceAnalyser);
        return { src, gain: g, analyser: sourceAnalyser };
      };

      setMicMuted(false);
      micStreamRef.current = mic;
      micGainRef.current = micHasAudio && mic ? attach(mic, S.state.micVol)?.gain ?? null : null;

      // Attach the shared tab/system audio (Google Meet tab sound) if it exists.
      displayAudioNodesRef.current = attach(display, S.state.tabVol, true);

      const mixed = dest.stream.getAudioTracks();
      if (mixed.length === 0 || ctx.state === "closed") {
        toast.error("No audio sources available. Allow the microphone or enable 'Also share tab audio'.");
        display.getTracks().forEach((t) => t.stop());
        void ctx.close();
        patch({ starting: false, owner: null });
        return;
      }

      // If Chrome still refuses to run Web Audio, never create a known-silent
      // recording: use Meet/system audio directly, or the microphone as fallback.
      // Chrome MediaRecorder reliably records the first audio track in this stream.
      const recorderAudio =
        ctx.state === "running"
          ? mixed
          : displayHasAudio
            ? display.getAudioTracks().slice(0, 1)
            : mic?.getAudioTracks().slice(0, 1) ?? [];
      if (ctx.state !== "running") {
        toast.warning(
          displayHasAudio
            ? "Audio mixer was blocked by Chrome — recording Google Meet audio directly."
            : "Audio mixer was blocked by Chrome — recording microphone audio directly.",
        );
      }
      const compositor = createCompositor(display, Q);
      compositorRef.current = compositor;
      attachDisplayAudioRef.current = (s: MediaStream) => attach(s, S.state.tabVol, true);
      patch({ surface: capturedSurface ?? null });
      const stream = new MediaStream([compositor.track, ...recorderAudio]);

       // A low-frequency meter confirms audio without a 60fps animation competing
       // with Meet/video playback and the encoder.
      const buf = new Uint8Array(analyser.fftSize);
      const tabBuf = new Uint8Array(512);
      let wasSilent = false;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs((buf[i] ?? 128) - 128) / 128);
        if (peak > 0.02) {
          loudAtRef.current = Date.now();
        }
        const isSilent = Date.now() - loudAtRef.current > 5000;
        setLevel(peak);
        const tabAnalyser = displayAudioNodesRef.current?.analyser;
        let sharedPeak = 0;
        if (tabAnalyser) {
          tabAnalyser.getByteTimeDomainData(tabBuf);
          for (let i = 0; i < tabBuf.length; i++) {
            sharedPeak = Math.max(sharedPeak, Math.abs((tabBuf[i] ?? 128) - 128) / 128);
          }
        }
        setTabLevel(sharedPeak);
        if (isSilent !== wasSilent) {
          setSilent(isSilent);
          wasSilent = isSilent;
        }
        drawWave(canvasRef.current, buf, peak);
         meterTimerRef.current = window.setTimeout(tick, 250);
      };
      tick();

      const mime = pickMime();
      if (!mime) {
        toast.error("MediaRecorder is not supported on this browser.");
        display.getTracks().forEach((t) => t.stop());
        void ctx.close();
        patch({ starting: false, owner: null });
        return;
      }
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, {
        mimeType: mime,
        audioBitsPerSecond: Q.audio,
        // Slides/screen stay readable at this rate while an hour-long lecture stays
        // around ~300MB, so it uploads reliably and streams on phones.
        videoBitsPerSecond: Q.video,

      });

      chunksRef.current = [];

      cleanupRef.current = () => {
        compositorRef.current?.stop();
        compositorRef.current = null;
        attachDisplayAudioRef.current = null;
        shareEndCleanupRef.current?.();
        shareEndCleanupRef.current = null;
        displayRef.current?.getTracks().forEach((t) => t.stop());
        display.getTracks().forEach((t) => t.stop());
        mic?.getTracks().forEach((t) => t.stop());
        dest.stream.getTracks().forEach((t) => t.stop());
        void ctx.close().catch(() => undefined);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (meterTimerRef.current) window.clearTimeout(meterTimerRef.current);
        rafRef.current = null;
        meterTimerRef.current = null;
        void wakeLockRef.current?.release().catch(() => undefined);
        wakeLockRef.current = null;
        displayRef.current = null;
        displayAudioNodesRef.current = null;
        audioCtxRef.current = null;
        audioDestRef.current = null;
        analyserRef.current = null;
        setLevel(0);
        setTabLevel(0);
      };


      const backupMeta: BackupMeta = {
        mime,
        title: title?.trim() || `Lecture ${new Date().toLocaleDateString()}`,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        liveSessionId: liveSessionId || null,
        sectionId: sectionId || null,
      };

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // Serialize disk writes and do not retain successful chunks in RAM. This
          // prevents memory growth and lag during multi-hour lectures.
          backupWriteChainRef.current = backupWriteChainRef.current.then(async () => {
            const saved = await backupAppendChunk(e.data, backupMeta);
            if (!saved) {
              chunksRef.current.push(e.data);
              if (!backupFailedRef.current) {
                backupFailedRef.current = true;
                toast.warning("Local backup storage is full; keep this page open until recording is stopped.");
              }
            }
          });
        }
      };
      rec.onstop = () => {
        // Ensure all chunks are collected before finalizing
        if (chunksRef.current.length > 0) {
          void finalize();
        } else {
          // Wait a brief moment for any final chunks
          setTimeout(() => void finalize(), 100);
        }
      };
      rec.onerror = () => {
        toast.error("Recording error occurred — saved chunks are safe in the backup");
        stopRecording();
      };
      // 3s slices: less data at risk, smaller memory spikes, and Chrome keeps
      // flushing even when the tab is in the background.
      rec.start(3000);
      recorderRef.current = rec;
      backupFailedRef.current = false;
      const requestWakeLock = () => {
        if (!("wakeLock" in navigator) || wakeLockRef.current) return;
        void (navigator as Navigator & { wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> } & { addEventListener?: (t: string, cb: () => void) => void }> } }).wakeLock
          .request("screen")
          .then((lock) => {
            wakeLockRef.current = lock;
            lock.addEventListener?.("release", () => {
              wakeLockRef.current = null;
            });
          })
          .catch(() => undefined);
      };
      requestWakeLock();
      const onVisible = () => {
        if (document.visibilityState === "visible") requestWakeLock();
      };
      document.addEventListener("visibilitychange", onVisible);

      // Watchdog: detect if the browser/OS killed a long recording. MediaRecorder's
      // own 3-second timeslice already flushes continuously; extra requestData calls
      // can create unnecessary WebM boundaries in some Chrome versions.
      const watchdog = window.setInterval(() => {
        const current = recorderRef.current;
        if (!current) return;
        if (current.state === "inactive" && !finalizingRef.current) {
          toast.error("Recording was interrupted by the system — saving what was recorded.");
          void finalize();
        }
      }, 10_000);
      const prevCleanup = cleanupRef.current;
      cleanupRef.current = () => {
        window.clearInterval(watchdog);
        document.removeEventListener("visibilitychange", onVisible);
        prevCleanup?.();
      };

      startedAtRef.current = Date.now();
      setElapsed(0);
      pausedAtRef.current = 0;
      patch({ starting: false, recording: true, paused: false, owner: ownerKey, lowSpace: null, saved: null });

      // Listen for screen share ending to auto-stop, except during intentional tab switching.
      listenForShareEnd(display);

      toast.success(
        displayHasAudio && micHasAudio
          ? "Recording started with microphone and shared audio"
          : micHasAudio
            ? "Screen recording started with microphone audio"
            : "Recording started with Google Meet tab audio",
      );
    } catch (error) {
      void ctx.close().catch(() => undefined);
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Screen share was cancelled or denied"
          : "Could not start recording. Close any other screen sharing and try again";
      toast.error(message);
      patch({ starting: false, owner: null });
    }
  }

  /** Change the captured screen / window / tab WITHOUT stopping the recording. */
  async function switchShare() {
    const compositor = compositorRef.current;
    if (!compositor || !S.state.recording || S.state.switching) return;
    patch({ switching: true });
    const Q = QUALITY[S.state.quality];
    try {
      const next = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: Q.fps, max: Q.fps }, width: { ideal: Q.w }, height: { ideal: Q.h } },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        ...({
          systemAudio: "include",
          windowAudio: "system",
          surfaceSwitching: "include",
          monitorTypeSurfaces: "include",
          selfBrowserSurface: "exclude",
          suppressLocalAudioPlayback: false,
        } as Record<string, unknown>),
      } as DisplayMediaStreamOptions);

      const previous = displayRef.current;
      compositor.setSource(next);

      // Swap the shared-audio branch of the mixer over to the new surface.
      const nodes = displayAudioNodesRef.current;
      try {
        nodes?.gain.disconnect();
        nodes?.src.disconnect();
      } catch {
        /* already disconnected */
      }
      displayAudioNodesRef.current = attachDisplayAudioRef.current?.(next) ?? null;
      setHasSystemAudio(next.getAudioTracks().some((t) => t.readyState === "live"));

      previous?.getTracks().forEach((t) => t.stop());
      displayRef.current = next;
      patch({ surface: next.getVideoTracks()[0]?.getSettings().displaySurface ?? null });
      listenForShareEnd(next);
      toast.success("Switched — the recording continues on the newly selected screen.");
    } catch {
      toast.info("Screen switch cancelled — still recording the previous screen.");
    } finally {
      patch({ switching: false });
    }
  }

  async function finalize() {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    recorderRef.current = null;
    patch({ recording: false, paused: false, silent: false, lowSpace: null, saving: true, uploadProgress: 0 });
    cleanupRef.current?.();
    cleanupRef.current = null;
    await backupWriteChainRef.current;
    const durationMs = Date.now() - startedAtRef.current;
    const duration = Math.floor(durationMs / 1000);
    const mime = mimeRef.current;
    const savedBackup = await backupRead();
    const persistedChunks = savedBackup?.chunks ?? [];
    const allChunks = persistedChunks.length > 0 ? [...persistedChunks, ...chunksRef.current] : chunksRef.current;
    const { blob: rawBlob, type, ext } = backupBlob(allChunks, mime);
    const blob = await repairBlob(rawBlob, type, durationMs);

    chunksRef.current = [];
    if (blob.size < 1000) {
      toast.error("No content was recorded");
      if (mountedRef.current) setSaving(false);
      finalizingRef.current = false;
      return;
    }
    const fileName = `lecture-${Date.now()}.${ext}`;
    const recoveryUrl = URL.createObjectURL(blob);
    if (mountedRef.current) {
      setRecovery({ url: recoveryUrl, name: fileName });
      setUnfinished(null);
      setSaving(false);
      setUploadProgress(0);
      setAttemptNo(0);
      patch({ owner: null, pendingDuration: Math.max(1, duration) });
    }
    toast.info("Recording stopped — choose: Save & publish to Cloudflare R2, Continue, or Delete.");
    finalizingRef.current = false;
  }

  /** Discard the just-finished recording (with confirmation in the UI). */
  async function discardRecording() {
    if (recovery) URL.revokeObjectURL(recovery.url);
    setRecovery(null);
    setUnfinished(null);
    await backupClear();
    patch({ confirmDelete: false, pendingDuration: 0 });
    toast.success("Recording deleted — nothing was published.");
  }


  async function recoverBackup(continueAfter = false) {
    setRecovering(true);
    setUploadProgress(0);
    try {
      const backup = await backupRead();
      if (!backup) {
        toast.error("No backup found");
        if (mountedRef.current) setUnfinished(null);
        return;
      }
      const { blob: rawBlob, type, ext } = backupBlob(backup.chunks, backup.meta.mime);
      const blob = await repairBlob(
        rawBlob,
        type,
        Math.max(1000, backup.meta.updatedAt - backup.meta.startedAt),
      );

      if (blob.size < 1000) {
        toast.error("The backup is empty");
        return;
      }
      const fileName = `lecture-recovered-${Date.now()}.${ext}`;
      const file = new File([blob], fileName, { type });
      try {
        const budget = await checkBudget();
        const fileMb = file.size / (1024 * 1024);
        if (budget.available && (budget.blocked || fileMb > budget.totalRemainingMb)) {
          toast.error(
            "Your free 10GB of Cloudflare storage is full. Download this recording and upload it to YouTube as Unlisted, then paste the link in Recordings.",
          );
          return;
        }
      } catch {
        /* budget unavailable — continue */
      }
      const { uploadUrl, storedValue } = await requestR2Url({
        data: { filename: file.name, contentType: file.type || null, folder: "recordings" },
      });
      await putToR2(uploadUrl, file, (progress) => {
        if (mountedRef.current) setUploadProgress(progress);
      });
      const path = storedValue;
      const duration = Math.max(1, Math.floor((backup.meta.updatedAt - backup.meta.startedAt) / 1000));
      await persistRecording({
        data: {
          title: recovery ? backup.meta.title || "Lecture" : `${backup.meta.title || "Lecture"} (recovered)`,
          liveSessionId: backup.meta.liveSessionId || null,
          sectionId: backup.meta.sectionId || null,
          videoUrl: path,
          durationSeconds: duration,
          status: "ready",
          isPublished: true,
        },
      });
      await backupClear();
      if (mountedRef.current) {
        if (recovery) URL.revokeObjectURL(recovery.url);
        setRecovery(null);
        setUnfinished(null);
        patch({ saved: { title: backup.meta.title || "Lecture", duration }, owner: null });
      }
      toast.success(recovery ? "Recording saved and published to Cloudflare R2" : "Recovered recording uploaded and published to Cloudflare R2");
      onSaved?.();
      if (continueAfter) await start();
    } catch (e) {
      toast.error(`Recovery failed: ${(e as Error).message}. The backup was kept — try again.`);
    } finally {
      if (mountedRef.current) {
        setRecovering(false);
        setUploadProgress(0);
      }
    }
  }

  /** Mic tester: shows a live moving level bar before recording starts. */
  function stopMicTest() {
    micTestRef.current?.stop();
    micTestRef.current = null;
    setMicTestOn(false);
    setMicTestLevel(0);
  }

  async function startMicTest() {
    if (micTestRef.current) {
      stopMicTest();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let raf = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs((buf[i] ?? 128) - 128) / 128);
        setMicTestLevel(peak);
        raf = requestAnimationFrame(tick);
      };
      tick();
      micTestRef.current = {
        stop: () => {
          cancelAnimationFrame(raf);
          stream.getTracks().forEach((t) => t.stop());
          void ctx.close();
        },
      };
      setMicTestOn(true);
    } catch {
      toast.error("Microphone blocked — click the lock icon next to the URL and allow Microphone.");
    }
  }

  // Auto-start the live mic meter when permission was already granted, so the bar
  // moves as soon as the page opens (no click needed).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await (navigator.permissions as any)?.query?.({ name: "microphone" as PermissionName });
        if (!cancelled && perm?.state === "granted" && !micTestRef.current && !recording) {
          void startMicTest();
        }
      } catch {
        /* permissions API unavailable — user can press "Test my mic" */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopMicTest(), []);

  async function downloadBackup() {
    setRecovering(true);
    try {
      const backup = await backupRead();
      if (!backup) {
        toast.error("No backup found");
        return;
      }
      const { blob: rawBlob, type, ext } = backupBlob(backup.chunks, backup.meta.mime);
      const durationMs = Math.max(1000, backup.meta.updatedAt - backup.meta.startedAt);
      const blob = await repairBlob(rawBlob, type, durationMs);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lecture-${backup.meta.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "recording"}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(`Complete recording prepared (${fmt(Math.floor(durationMs / 1000))})`);
    } catch (e) {
      toast.error(`Download failed: ${(e as Error).message}. The backup was kept.`);
    } finally {
      setRecovering(false);
    }
  }

  useEffect(() => {
    if (autoStart) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  if (saving && isOwner) {
    return (
      <div className="w-full space-y-2 rounded-lg border bg-muted/40 p-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Loader2 className="h-4 w-4 animate-spin" />
          {uploadProgress > 0
            ? `Uploading and publishing… ${uploadProgress}%`
            : "Stop received — preparing the video file (this can take a minute for long lectures)…"}
          {attemptNo > 1 ? ` (retry ${attemptNo - 1})` : ""}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${uploadProgress}%` }} />
        </div>
        {recovery && (
          <video
            src={recovery.url}
            controls
            className="w-full rounded-lg border bg-black"
            preload="metadata"
          />
        )}
        <p className="text-xs text-muted-foreground">
          Preview the recording above (audio + quality) while it uploads. Do not close the page until the upload
          completes.
        </p>
      </div>
    );
  }

  return recording && isOwner ? (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3">
        <span className="flex items-center gap-2 text-sm font-black text-destructive">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-destructive" />
          {paused ? "Screen recording paused" : "Screen recording in progress"}
        </span>
        <span className="rounded-lg bg-background px-3 py-1 font-mono text-lg font-black tabular-nums">
          {fmt(elapsed)}
        </span>
      </div>
      <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black flex items-center gap-1.5">
            {hasMic ? (
              <Mic className="h-4 w-4 text-emerald-600" />
            ) : (
              <MicOff className="h-4 w-4 text-muted-foreground" />
            )}
            {hasMic ? "Microphone connected" : "Microphone not connected"} ·{" "}
            {hasSystemAudio ? "Meet / tab audio connected" : "Shared audio unavailable"}
          </span>
          <span className="text-[11px] font-bold text-muted-foreground">
            Level: {Math.min(100, Math.round(level * 160))}%
          </span>
        </div>
        <canvas ref={canvasRef} className="w-full h-14 rounded-lg bg-background" />
        {hasMic && (
          <Button
            type="button"
            size="sm"
            variant={micMuted ? "destructive" : "secondary"}
            className="w-full gap-2 font-black"
            onClick={toggleMicMute}
          >
            {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {micMuted ? "My mic is muted (screen audio still recording)" : "Mute my mic only"}
          </Button>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] font-bold space-y-1">
            <span>My mic volume: {Math.round(micVol * 100)}%</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={micVol}
              onChange={(e) => changeMicVol(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
          <label className="text-[11px] font-bold space-y-1">
            <span>Meet / YouTube volume: {Math.round(tabVol * 100)}%</span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={tabVol}
              onChange={(e) => changeTabVol(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-[width] duration-75 ${level > 0.6 ? "bg-destructive" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, Math.round(level * 160))}%` }}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span>Meet / YouTube audio input</span>
            <span>{hasSystemAudio ? `${Math.min(100, Math.round(tabLevel * 160))}%` : "Not connected"}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-75"
              style={{ width: `${Math.min(100, Math.round(tabLevel * 160))}%` }}
            />
          </div>
        </div>
        {!hasSystemAudio && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs font-bold text-destructive">
            Tab audio is NOT being recorded. Stop and start again, choose the YouTube/Meet tab (not Window or Entire
            Screen), then enable “Also share tab audio” before pressing Share.
          </div>
        )}
        {(micDenied || silent) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold space-y-1">
            <p className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {micDenied
                ? "Microphone denied — mic audio will not be recorded."
                : silent
                  ? "No audio input for several seconds."
                  : "No shared audio input is being detected."}
            </p>
            <p>To fix microphone access:</p>
            <p>1) Click the lock icon next to the site URL in the browser.</p>
            <p>2) Enable "Microphone" and choose Allow.</p>
            <p>3) Make sure the mic is not muted in device settings.</p>
            <p>4) Select the Google Meet or YouTube Chrome tab and enable "Also share tab audio".</p>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-bold">
        <p className="flex items-center gap-1.5">
          <MonitorUp className="h-4 w-4 text-primary" /> Recording now — a local backup is saved automatically.
        </p>
         <p className="mt-1 text-muted-foreground">
           {hasSystemAudio
             ? "Meet/tab audio is connected and being recorded."
             : "Your screen and microphone are recording, but Meet/tab audio is not connected. To capture students next time, share the Google Meet tab with “Also share tab audio” enabled."}
         </p>
      </div>
      {lowSpace && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs font-bold flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-600" /> Low device storage: {lowSpace}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="destructive" className="gap-2" onClick={stopRecording}>
          <Square className="h-4 w-4" /> Stop recording ({fmt(elapsed)}) · Ctrl+Shift+S
        </Button>
        <Button size="sm" variant="secondary" className="gap-2" onClick={togglePause}>
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          {paused ? "Resume" : "Pause"} · Ctrl+Shift+P
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => void switchShare()}
          disabled={st.switching}
        >
          {st.switching ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorUp className="h-4 w-4" />}
          Change screen / tab
        </Button>
      </div>
      <p className="text-[11px] font-bold text-muted-foreground">
        Currently recording:{" "}
        {st.surface === "browser" ? "a Chrome tab" : st.surface === "window" ? "an app window" : "the entire screen"} —
        use “Change screen / tab” to switch source without stopping the recording.
      </p>

    </div>
  ) : (
    <div className="space-y-3">
      {saved && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 space-y-2">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            Saved and published: "{saved.title}" ({fmt(saved.duration)}) — students can watch it now from the
            Recordings page.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <a href="/recordings">Open Recordings page</a>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => patch({ saved: null })}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      {unfinished && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
          <p className="text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Unfinished recording found (session interrupted unexpectedly) —{" "}
            {(unfinished.size / (1024 * 1024)).toFixed(1)} MB were backed up. Do you want to recover it?
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="gap-1.5" disabled={recovering} onClick={() => void recoverBackup()}>
              {recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {recovering ? `Recovering… ${uploadProgress}%` : "Recover & Publish"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={recovering} onClick={() => void downloadBackup()}>
              {recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download full video
            </Button>
            <Button size="sm" variant="secondary" disabled={recovering} onClick={() => void recoverBackup(true)}>
              Recover, Publish &amp; Start Next Part
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void backupClear();
                setUnfinished(null);
              }}
            >
              Delete Backup
            </Button>
          </div>
        </div>
      )}
      {recovery && isOwner && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-3">
          <p className="text-xs font-bold">
            Recording finished{pendingDuration ? ` (${fmt(pendingDuration)})` : ""} — nothing is published yet. Save
            uploads the video to Cloudflare R2; Continue uploads then starts the next part; Delete removes the local
            copy.
          </p>
          <video src={recovery.url} controls preload="metadata" className="w-full rounded-lg border bg-black" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-2" disabled={recovering} onClick={() => void recoverBackup(false)}>
              {recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {recovering ? `Saving… ${uploadProgress}%` : "Save & Publish"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={recovering}
              onClick={() => void recoverBackup(true)}
            >
              <RotateCcw className="h-4 w-4" /> Save &amp; Continue recording
            </Button>
            {confirmDelete ? (
              <>
                <Button size="sm" variant="destructive" className="gap-2" onClick={() => void discardRecording()}>
                  <Trash2 className="h-4 w-4" /> Yes, delete permanently
                </Button>
                <Button size="sm" variant="ghost" onClick={() => patch({ confirmDelete: false })}>
                  No, keep it
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="gap-2"
                disabled={recovering}
                onClick={() => patch({ confirmDelete: true })}
              >
                <Trash2 className="h-4 w-4" /> Delete this video
              </Button>
            )}
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href={recovery.url} download={recovery.name}>
                <Download className="h-4 w-4" /> Download backup copy
              </a>
            </Button>
          </div>
        </div>
      )}
      <div className="rounded-lg border bg-background p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-black">
            {starting ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <MonitorUp className="h-4 w-4 text-primary" />}
            {starting ? "Opening screen and microphone…" : "Lecture recording setup"}
          </p>
          <span className="rounded-full border bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground">
            {starting ? "Waiting for browser permission" : "Ready"}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2 rounded-md border bg-muted/30 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-black">
                <Mic className="h-4 w-4 text-primary" /> Microphone
              </span>
              <Button
                type="button"
                size="sm"
                variant={micTestOn ? "destructive" : "secondary"}
                className="h-7 px-2 text-[11px] font-black"
                onClick={() => void startMicTest()}
              >
                {micTestOn ? "Stop mic test" : "Test my mic"}
              </Button>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-[width] duration-75 ${micTestLevel > 0.6 ? "bg-destructive" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, Math.round(micTestLevel * 160))}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {micTestOn
                ? micTestLevel > 0.03
                  ? `Mic is working — level ${Math.min(100, Math.round(micTestLevel * 160))}%`
                  : "Speak now — the bar should move."
                : "Press “Test my mic” and speak to check it works."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2.5">
            <MonitorUp className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-black">Meet / YouTube audio</p>
              <p className="text-[11px] text-muted-foreground">
                Choose the Chrome Tab category, select the playing tab, then enable “Also share tab audio”.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-bold space-y-1">
            <span>My mic volume: {Math.round(micVol * 100)}%</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={micVol}
              onChange={(e) => changeMicVol(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
          <label className="text-[11px] font-bold space-y-1">
            <span>Meet / YouTube volume: {Math.round(tabVol * 100)}%</span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={tabVol}
              onChange={(e) => changeTabVol(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
        </div>

        <label className="block text-[11px] font-bold space-y-1">
          <span>Recording quality</span>
          <select
            value={quality}
            onChange={(e) => patch({ quality: e.target.value as RecQuality })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-bold"
          >
            {(Object.keys(QUALITY) as RecQuality[]).map((k) => (
              <option key={k} value={k}>
                {QUALITY[k].label}
              </option>
            ))}
          </select>
        </label>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full gap-2"
          disabled={starting || !!unfinished || (!!st.owner && !isOwner)}
          onClick={() => {
            stopMicTest();
            void start();
          }}
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4 fill-destructive text-destructive" />}
          {starting
            ? "Opening screen and microphone…"
            : unfinished
              ? "Finish the unfinished recording above first"
              : recording && !isOwner
                ? "Another lecture is recording…"
                : "Record lecture screen"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {unfinished
            ? "There is an unfinished recording backup above — choose Recover & Publish, Download, or Delete Backup to unlock recording."
            : "After Stop you get a preview. Save & publish uploads the video to Cloudflare R2 (not site storage)."}
        </p>

      </div>
    </div>
  );
}
