import { useEffect, useReducer } from "react";
import { AlertTriangle, Circle, Download, Loader2, Mic, MicOff, MonitorUp, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/storage";
import { saveRecording } from "@/lib/recordings.functions";

type RecState = {
  recording: boolean;
  saving: boolean;
  uploadProgress: number;
  elapsed: number;
  level: number;
  hasMic: boolean;
  hasSystemAudio: boolean;
  micDenied: boolean;
  silent: boolean;
  recovery: { url: string; name: string } | null;
  unfinished: { meta: BackupMeta; size: number } | null;
  recovering: boolean;
  attemptNo: number;
  micMuted: boolean;
};

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
    displayAudioNodes: Box<{ src: MediaStreamAudioSourceNode; gain: GainNode } | null>;
    backupChain: Box<Promise<void>>;
    backupFailed: Box<boolean>;
    meterTimer: Box<number | null>;
    wakeLock: Box<{ release: () => Promise<void> } | null>;
    micGain: Box<GainNode | null>;
    micStream: Box<MediaStream | null>;
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
        recording: false,
        saving: false,
        uploadProgress: 0,
        elapsed: 0,
        level: 0,
        hasMic: true,
        hasSystemAudio: false,
        micDenied: false,
        silent: false,
        recovery: null,
        unfinished: null,
        recovering: false,
        attemptNo: 0,
        micMuted: false,
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
        displayAudioNodes: box<{ src: MediaStreamAudioSourceNode; gain: GainNode } | null>(null),
        backupChain: box<Promise<void>>(Promise.resolve()),
        backupFailed: box(false),
        meterTimer: box<number | null>(null),
        wakeLock: box<{ release: () => Promise<void> } | null>(null),
        micGain: box<GainNode | null>(null),
        micStream: box<MediaStream | null>(null),
      },
    };
  }
  return g.__lectureRecSession;
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

/** Picks the best container/codec the current browser can actually record. */
function pickMime() {
  // Chromium's MP4 MediaRecorder implementation is still less reliable during
  // multi-hour screen captures. VP8/WebM is the proven long-session path; its
  // seek metadata is repaired before upload.
  const candidates = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
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
 * MediaRecorder WebM files have no duration/Cues, so players buffer forever a few
 * minutes in. This rewrites the metadata so long recordings stream and seek fine.
 */
async function repairBlob(blob: Blob, type: string): Promise<Blob> {
  if (!type.includes("webm")) return blob;
  // Rewriting metadata loads the whole file in memory. Above ~700MB (≈2h) that
  // can crash the tab and lose the lecture, so the raw blob is kept instead.
  if (blob.size > 700 * 1024 * 1024) return blob;
  try {
    const { default: fixWebmDuration } = await import("webm-duration-fix");
    const fixed = await fixWebmDuration(new Blob([blob], { type }));
    return fixed.size > 1000 ? fixed : blob;
  } catch {
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

  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    S.listeners.add(force);
    return () => {
      S.listeners.delete(force);
    };
  }, [S]);

  const st = S.state;
  const {
    recording,
    saving,
    uploadProgress,
    elapsed,
    level,
    hasMic,
    hasSystemAudio,
    micDenied,
    silent,
    recovery,
    unfinished,
    recovering,
    attemptNo,
    micMuted,
  } = st;
  const patch = (p: Partial<RecState>) => {
    Object.assign(S.state, p);
    S.listeners.forEach((l) => l());
  };
  const setRecording = (v: boolean) => patch({ recording: v });
  const setSaving = (v: boolean) => patch({ saving: v });
  const setUploadProgress = (v: number) => patch({ uploadProgress: v });
  const setElapsed = (v: number) => patch({ elapsed: v });
  const setLevel = (v: number) => patch({ level: v });
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
    if (micGainRef.current) micGainRef.current.gain.value = next ? 0 : 1.35;
    micStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    toast.info(next ? "Your microphone is muted — screen/tab audio is still recording." : "Your microphone is on again.");
  }

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

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
    const ctx = new Ctx();
    const initialResume = ctx.state === "suspended" ? ctx.resume().catch(() => undefined) : Promise.resolve();
    try {
      // Never silently discard an interrupted session: it must be recovered or deleted first.
      const existing = await backupRead();
      if (existing) {
        const size = existing.chunks.reduce((sum, c) => sum + c.size, 0);
        if (size >= 1000) {
          if (mountedRef.current) setUnfinished({ meta: existing.meta, size });
          toast.error("An unfinished recording backup exists — recover or delete it before starting a new one.");
          void ctx.close().catch(() => undefined);
          return;
        }
        await backupClear();
      }

      if (recovery) {
        URL.revokeObjectURL(recovery.url);
        setRecovery(null);
      }
      finalizingRef.current = false;

      // One Entire Screen permission keeps capture alive while moving between
      // Meet, YouTube and other tabs. The microphone is captured independently,
      // so muting the microphone inside Meet does not mute this recording.
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 20 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          displaySurface: "monitor",
        },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        ...({
          systemAudio: "include",
          surfaceSwitching: "exclude",
          monitorTypeSurfaces: "include",
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
        } as Record<string, unknown>),
      } as DisplayMediaStreamOptions);

      const displayHasAudio = display.getAudioTracks().some((track) => track.readyState === "live");
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
        return;
      }
      if (!micHasAudio) toast.warning("Microphone denied — recording shared audio only.");
      if (!displayHasAudio) {
        toast.warning(
          capturedSurface === "browser"
            ? "Tab audio was not enabled. Enable 'Also share tab audio' in Chrome."
            : "System audio was not shared. On Windows, select Entire Screen and enable 'Also share system audio'. On macOS, Chrome cannot capture all system audio; share the Meet tab instead.",
        );
      }

      // 3. Mix audio tracks properly (MediaRecorder only supports ONE audio track)
      await initialResume;
      if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
      const dest = ctx.createMediaStreamDestination();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      audioCtxRef.current = ctx;
      audioDestRef.current = dest;
      analyserRef.current = analyser;
      displayRef.current = display;

      const attach = (s: MediaStream, gain: number) => {
        if (s.getAudioTracks().length === 0) return null;
        const src = ctx.createMediaStreamSource(s);
        const g = ctx.createGain();
        g.gain.value = gain;
        src.connect(g);
        g.connect(dest);
        g.connect(analyser);
        return { src, gain: g };
      };

      setMicMuted(false);
      micStreamRef.current = mic;
      micGainRef.current = micHasAudio && mic ? attach(mic, 1.35)?.gain ?? null : null;

      // Attach the shared tab/system audio (Google Meet tab sound) if it exists.
      displayAudioNodesRef.current = attach(display, 0.8);

      const mixed = dest.stream.getAudioTracks();
      if (mixed.length === 0 || ctx.state === "closed") {
        toast.error("No audio sources available. Allow the microphone or enable 'Also share tab audio'.");
        display.getTracks().forEach((t) => t.stop());
        void ctx.close();
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
      const stream = new MediaStream([...display.getVideoTracks(), ...recorderAudio]);

       // A low-frequency meter confirms audio without a 60fps animation competing
       // with Meet/video playback and the encoder.
      const buf = new Uint8Array(analyser.fftSize);
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
        return;
      }
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, {
        mimeType: mime,
        audioBitsPerSecond: 64_000,
        // Slides/screen stay readable at this rate while an hour-long lecture stays
        // around ~300MB, so it uploads reliably and streams on phones.
        videoBitsPerSecond: 700_000,

      });

      chunksRef.current = [];

      cleanupRef.current = () => {
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

      // Watchdog: long lectures can be killed by the OS/tab throttling. Every 10s
      // we force a flush and, if the recorder died silently, we save what exists
      // instead of losing the lecture.
      const watchdog = window.setInterval(() => {
        const current = recorderRef.current;
        if (!current) return;
        if (current.state === "recording") {
          try {
            current.requestData();
          } catch {
            // ignore — the timeslice keeps producing chunks
          }
          return;
        }
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
      setRecording(true);

      // Listen for screen share ending to auto-stop, except during intentional tab switching.
      listenForShareEnd(display);

      toast.success(
        displayHasAudio && micHasAudio
          ? "Recording started with microphone and shared audio"
          : micHasAudio
            ? "Recording started with microphone audio"
            : "Recording started with Google Meet tab audio",
      );
    } catch (error) {
      void ctx.close().catch(() => undefined);
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Screen share was cancelled or denied"
          : "Could not start recording. Close any other screen sharing and try again";
      toast.error(message);
    }
  }

  async function finalize() {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    recorderRef.current = null;
    if (mountedRef.current) {
      setRecording(false);
      setSilent(false);
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
    await backupWriteChainRef.current;
    const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const mime = mimeRef.current;
    const savedBackup = await backupRead();
    const persistedChunks = savedBackup?.chunks ?? [];
    const allChunks = persistedChunks.length > 0 ? [...persistedChunks, ...chunksRef.current] : chunksRef.current;
    const { blob: rawBlob, type, ext } = backupBlob(allChunks, mime);
    const blob = await repairBlob(rawBlob, type);

    chunksRef.current = [];
    if (blob.size < 1000) {
      toast.error("No content was recorded");
      finalizingRef.current = false;
      return;
    }
    const fileName = `lecture-${Date.now()}.${ext}`;
    const recoveryUrl = URL.createObjectURL(blob);
    if (mountedRef.current) {
      setRecovery({ url: recoveryUrl, name: fileName });
      setSaving(true);
      setUploadProgress(0);
    }
    // Auto-upload with retries so the teacher never has to download + re-upload manually.
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        if (mountedRef.current) setAttemptNo(attempt);
        const file = new File([blob], fileName, { type });
        const path = await uploadFile("content", file, "recordings", (progress) => {
          if (mountedRef.current) setUploadProgress(progress);
        });
        await saveRecording({
          data: {
            title: title?.trim() || `Lecture ${new Date().toLocaleDateString()}`,
            liveSessionId: liveSessionId || null,
            sectionId: sectionId || null,
            videoUrl: path,
            durationSeconds: duration,
            status: "ready",
            isPublished: true,
          },
        });
        await backupClear();
        URL.revokeObjectURL(recoveryUrl);
        if (mountedRef.current) {
          setRecovery(null);
          setUnfinished(null);
        }
        toast.success("Lecture recording uploaded and published automatically");
        onSaved?.();
        lastError = null;
        break;
      } catch (e) {
        lastError = e as Error;
        if (attempt < 4) {
          toast.warning(`Upload attempt ${attempt} failed — retrying automatically…`);
          await new Promise((r) => setTimeout(r, attempt * 3000));
        }
      }
    }
    if (lastError) {
      // All retries failed: surface the on-device backup so it can be retried or downloaded.
      const backup = await backupRead();
      if (backup && mountedRef.current) {
        setUnfinished({ meta: backup.meta, size: backup.chunks.reduce((s, c) => s + c.size, 0) });
      }
      toast.error(
        `Automatic upload failed. Use "Retry upload" — the recording is safe on this device. ${lastError.message}`,
      );
    }
    if (mountedRef.current) {
      setSaving(false);
      setUploadProgress(0);
      setAttemptNo(0);
    }
    finalizingRef.current = false;
  }

  async function recoverBackup() {
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
      const blob = await repairBlob(rawBlob, type);

      if (blob.size < 1000) {
        toast.error("The backup is empty");
        return;
      }
      const fileName = `lecture-recovered-${Date.now()}.${ext}`;
      const file = new File([blob], fileName, { type });
      const path = await uploadFile("content", file, "recordings", (progress) => {
        if (mountedRef.current) setUploadProgress(progress);
      });
      const duration = Math.max(1, Math.floor((backup.meta.updatedAt - backup.meta.startedAt) / 1000));
      await saveRecording({
        data: {
          title: `${backup.meta.title || "Lecture"} (recovered)`,
          liveSessionId: backup.meta.liveSessionId || null,
          sectionId: backup.meta.sectionId || null,
          videoUrl: path,
          durationSeconds: duration,
          status: "ready",
          isPublished: true,
        },
      });
      await backupClear();
      if (mountedRef.current) setUnfinished(null);
      toast.success("Recovered recording uploaded and published");
      onSaved?.();
    } catch (e) {
      toast.error(`Recovery failed: ${(e as Error).message}. The backup was kept — try again.`);
    } finally {
      if (mountedRef.current) {
        setRecovering(false);
        setUploadProgress(0);
      }
    }
  }

  async function downloadBackup() {

    const backup = await backupRead();
    if (!backup) return;
    const { blob, ext } = backupBlob(backup.chunks, backup.meta.mime);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lecture-backup-${Date.now()}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  useEffect(() => {
    if (autoStart) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  if (saving) {
    return (
      <div className="w-full space-y-2 rounded-lg border bg-muted/40 p-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading the recording automatically… {uploadProgress}%
          {attemptNo > 1 ? ` (retry ${attemptNo - 1})` : ""}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${uploadProgress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">Do not close the page until the upload completes.</p>
      </div>
    );
  }

  return recording ? (
    <div className="w-full space-y-3">
      <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black flex items-center gap-1.5">
            {hasMic ? (
              <Mic className="h-4 w-4 text-emerald-600" />
            ) : (
              <MicOff className="h-4 w-4 text-muted-foreground" />
            )}
            {hasMic ? "Microphone connected" : "Microphone not connected"} ·{" "}
            {hasSystemAudio ? "Screen audio connected" : "Screen audio unavailable"}
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

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-[width] duration-75 ${level > 0.6 ? "bg-destructive" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, Math.round(level * 160))}%` }}
          />
        </div>
        {(!hasSystemAudio || micDenied || silent) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold space-y-1">
            <p className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {micDenied
                ? "Microphone denied — mic audio will not be recorded."
                : silent
                  ? "No audio input for several seconds."
                  : "This screen source did not provide system audio; microphone audio is still recording."}
            </p>
            <p>To fix microphone access:</p>
            <p>1) Click the lock icon next to the site URL in the browser.</p>
            <p>2) Enable "Microphone" and choose Allow.</p>
            <p>3) Make sure the mic is not muted in device settings.</p>
            <p>4) Select the Google Meet Chrome tab — not Entire Screen or Window — and enable "Also share tab audio".</p>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-bold">
        <p className="flex items-center gap-1.5">
          <MonitorUp className="h-4 w-4 text-primary" /> Recording now — a local backup is saved automatically.
        </p>
        <p className="mt-1 text-muted-foreground">
           Select Entire Screen once to move between tabs without new access prompts. The recording microphone stays
           active even if your microphone is muted inside Google Meet.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" className="gap-2" onClick={stopRecording}>
          <Square className="h-4 w-4" /> Stop recording ({fmt(elapsed)})
        </Button>
      </div>

    </div>
  ) : (
    <div className="space-y-2">
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
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void downloadBackup()}>
              <Download className="h-4 w-4" /> Download
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
      {recovery && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-2">
          <p className="text-xs font-bold">
            Automatic upload did not succeed. Press "Retry upload" to publish it now — the recording is also kept in
            the on-device backup.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-2" disabled={recovering} onClick={() => void recoverBackup()}>
              {recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {recovering ? `Uploading… ${uploadProgress}%` : "Retry upload"}
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href={recovery.url} download={recovery.name}>
                <Download className="h-4 w-4" /> Download backup copy
              </a>
            </Button>
          </div>
        </div>
      )}
      <Button size="sm" variant="outline" className="gap-2" onClick={() => void start()}>
        <Circle className="h-4 w-4 text-destructive fill-destructive" /> Record lecture screen
      </Button>
    </div>
  );
}
