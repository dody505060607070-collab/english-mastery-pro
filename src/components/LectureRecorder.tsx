import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Circle, Download, Loader2, Mic, MicOff, MonitorUp, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/storage";
import { saveRecording } from "@/lib/recordings.functions";

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
  const candidates = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
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
async function backupAppendChunk(chunk: Blob, meta: BackupMeta): Promise<void> {
  try {
    const db = await openBackupDb();
    await runTx(db, ["meta", "chunks"], "readwrite", (tx) => {
      tx.objectStore("chunks").add(chunk);
      tx.objectStore("meta").put({ ...meta, updatedAt: Date.now() }, "active");
    });
    db.close();
  } catch {
    // Backup is best-effort; recording itself must never fail because of it.
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
      tx.oncomplete = () => {
        meta = metaReq.result as BackupMeta | undefined;
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
 * the teacher picks in the browser picker — intended to be the Google Meet tab
 * (with "Also share tab audio" enabled so Meet's own sound is recorded).
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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const mimeRef = useRef<string>("video/webm");
  const cleanupRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  const finalizingRef = useRef(false);
  const mountedRef = useRef(true);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [hasMic, setHasMic] = useState(true);
  const [micDenied, setMicDenied] = useState(false);
  const [silent, setSilent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loudAtRef = useRef<number>(0);
  const [recovery, setRecovery] = useState<{ url: string; name: string } | null>(null);
  const [unfinished, setUnfinished] = useState<{ meta: BackupMeta; size: number } | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [attemptNo, setAttemptNo] = useState(0);
  const [switching, setSwitching] = useState(false);
  // Live capture pipeline refs — allow swapping the shared tab mid-recording.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const displayRef = useRef<MediaStream | null>(null);
  const displayAudioNodesRef = useRef<{ src: MediaStreamAudioSourceNode; gain: GainNode } | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const paintRef = useRef<number | null>(null);


  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    mountedRef.current = true;
    // Detect an unfinished recording session left behind by a crash / power cut.
    void (async () => {
      const backup = await backupRead();
      if (!mountedRef.current) return;
      if (!backup) return;
      const size = backup.chunks.reduce((sum, c) => sum + c.size, 0);
      if (size < 1000) {
        await backupClear();
        return;
      }
      setUnfinished({ meta: backup.meta, size });
    })();
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        try {
          recorder.requestData();
          recorder.stop();
        } catch {
          cleanupRef.current?.();
        }
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
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

  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Your browser does not support screen recording. Use Chrome on a computer.");
      return;
    }
    try {
      // Never silently discard an interrupted session: it must be recovered or deleted first.
      const existing = await backupRead();
      if (existing) {
        const size = existing.chunks.reduce((sum, c) => sum + c.size, 0);
        if (size >= 1000) {
          if (mountedRef.current) setUnfinished({ meta: existing.meta, size });
          toast.error("An unfinished recording backup exists — recover or delete it before starting a new one.");
          return;
        }
        await backupClear();
      }

      if (recovery) {
        URL.revokeObjectURL(recovery.url);
        setRecovery(null);
      }
      finalizingRef.current = false;

      // 1. Obtain the actual screen media stream. The teacher picks the Google Meet
      // tab in the browser picker; "Also share tab audio" captures Meet's own sound.
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        // Newer Chrome options: prefer including system/tab audio when available.
        ...({
          systemAudio: "include",
          surfaceSwitching: "include",
        } as Record<string, unknown>),
      } as DisplayMediaStreamOptions);

      // 2. Request microphone separately to avoid failing the whole capture if mic is denied.
      let mic: MediaStream | null = null;
      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        mic = null;
      }
      setHasMic(!!mic);
      setMicDenied(!mic);
      setSilent(false);
      loudAtRef.current = Date.now();
      if (!mic) toast.warning("Microphone denied — recording screen/tab audio only.");

      // 3. Mix audio tracks properly (MediaRecorder only supports ONE audio track)
      const Ctx: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      await ctx.resume().catch(() => undefined);
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

      if (mic) attach(mic, 1.6);
      // Attach the shared tab/system audio (Google Meet tab sound) if it exists.
      displayAudioNodesRef.current = attach(display, 0.8);

      const mixed = dest.stream.getAudioTracks();
      if (mixed.length === 0) {
        toast.error("No audio sources available. Allow the microphone or enable 'Also share tab audio'.");
        display.getTracks().forEach((t) => t.stop());
        void ctx.close();
        return;
      }

      // Video goes through a canvas so the shared tab can be swapped mid-recording
      // (Google Meet -> YouTube -> Google Meet) without restarting the recorder.
      const videoEl = document.createElement("video");
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.srcObject = new MediaStream(display.getVideoTracks());
      await videoEl.play().catch(() => undefined);
      videoElRef.current = videoEl;

      const frame = document.createElement("canvas");
      frame.width = 1280;
      frame.height = 720;
      const fctx = frame.getContext("2d");
      const paint = () => {
        if (fctx && videoElRef.current && videoElRef.current.videoWidth > 0) {
          const v = videoElRef.current;
          const scale = Math.min(frame.width / v.videoWidth, frame.height / v.videoHeight);
          const w = v.videoWidth * scale;
          const h = v.videoHeight * scale;
          fctx.fillStyle = "#000";
          fctx.fillRect(0, 0, frame.width, frame.height);
          fctx.drawImage(v, (frame.width - w) / 2, (frame.height - h) / 2, w, h);
        }
        paintRef.current = requestAnimationFrame(paint);
      };
      paint();

      const canvasStream = frame.captureStream(30);
      const stream = new MediaStream([...canvasStream.getVideoTracks(), ...mixed]);

      // live mic level meter so the admin can confirm the sound is captured
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs((buf[i] ?? 128) - 128) / 128);
        setLevel(peak);
        if (peak > 0.02) {
          loudAtRef.current = Date.now();
          setSilent(false);
        } else if (Date.now() - loudAtRef.current > 5000) {
          setSilent(true);
        }
        drawWave(canvasRef.current, buf, peak);
        rafRef.current = requestAnimationFrame(tick);
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
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2_500_000,
      });
      chunksRef.current = [];

      cleanupRef.current = () => {
        displayRef.current?.getTracks().forEach((t) => t.stop());
        display.getTracks().forEach((t) => t.stop());
        mic?.getTracks().forEach((t) => t.stop());
        dest.stream.getTracks().forEach((t) => t.stop());
        canvasStream.getTracks().forEach((t) => t.stop());
        void ctx.close().catch(() => undefined);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (paintRef.current) cancelAnimationFrame(paintRef.current);
        rafRef.current = null;
        paintRef.current = null;
        videoElRef.current = null;
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
          chunksRef.current.push(e.data);
          // Incremental backup: every chunk (1/sec) is persisted immediately, so a
          // crash or power cut loses at most ~1 second — stop() is not required.
          void backupAppendChunk(e.data, backupMeta);
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
      rec.start(1000);
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);

      // Listen for screen share ending to auto-stop
      const screenTrack = display.getVideoTracks()[0];
      screenTrack?.addEventListener(
        "ended",
        () => {
          toast.info("Screen sharing ended — saving recording automatically");
          stopRecording();
        },
        { once: true },
      );

      toast.success(
        mic ? "Recording started — backup is being saved continuously 🎙️" : "Recording started (no microphone)",
      );
    } catch (error) {
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
    const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const mime = mimeRef.current;
    const { blob, type, ext } = backupBlob(chunksRef.current, mime);
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
      const { blob, type, ext } = backupBlob(backup.chunks, backup.meta.mime);
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
            Live audio preview while recording
          </span>
          <span className="text-[11px] font-bold text-muted-foreground">
            Level: {Math.min(100, Math.round(level * 160))}%
          </span>
        </div>
        <canvas ref={canvasRef} className="w-full h-14 rounded-lg bg-background" />
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-[width] duration-75 ${level > 0.6 ? "bg-destructive" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, Math.round(level * 160))}%` }}
          />
        </div>
        {(micDenied || silent) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold space-y-1">
            <p className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {micDenied ? "Microphone denied — mic audio will not be recorded." : "No audio input for several seconds."}
            </p>
            <p>To fix microphone access:</p>
            <p>1) Click the lock icon next to the site URL in the browser.</p>
            <p>2) Enable "Microphone" and choose Allow.</p>
            <p>3) Make sure the mic is not muted in device settings.</p>
            <p>4) Stop and start the recording again, and when sharing pick the Google Meet tab with "Also share tab audio" enabled.</p>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-bold">
        <p className="flex items-center gap-1.5">
          <MonitorUp className="h-4 w-4 text-primary" /> Recording now — every second is backed up automatically.
        </p>
        <p className="mt-1 text-muted-foreground">
          The recording captures the tab you shared (your Google Meet tab). No external site such as YouTube is needed
          for audio — Meet sound comes from the shared tab itself when "Also share tab audio" is enabled.
        </p>
      </div>
      <Button size="sm" variant="destructive" className="gap-2" onClick={stopRecording}>
        <Square className="h-4 w-4" /> Stop recording ({fmt(elapsed)})
      </Button>
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
        <Circle className="h-4 w-4 text-destructive fill-destructive" /> Record lecture (Google Meet tab)
      </Button>
    </div>
  );
}
