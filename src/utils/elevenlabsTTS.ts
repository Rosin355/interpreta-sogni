import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getUserFacingMessage } from "@/utils/edge-error-codes";

// ---------------------------------------------------------------------------
// Caching
//
// Long interpretations exceed the edge function's ~450-char cap, so audio is
// generated per sentence-boundary CHUNK. We cache EACH chunk blob individually
// plus a small MANIFEST that lists the chunk keys and their durations, both
// keyed off a hash of (text + voiceId). Replaying a cached dream therefore
// costs zero network calls.
//
// Playback plays the chunks as a QUEUE (chunk i, then i+1 on `ended`) through a
// single reusable <audio> element. This replaces the old approach of byte-
// concatenating the MP3 blobs into ONE blob — a format iOS Safari only plays
// for the first segment (~30s). Cache keys are versioned (v3); the v3 IndexedDB
// upgrade drops the old stores so those broken concatenated blobs are never
// served again.
// ---------------------------------------------------------------------------

const CACHE_VERSION = 3;
const manifestKey = (textHash: string) => `v${CACHE_VERSION}:${textHash}:manifest`;
const chunkKey = (textHash: string, i: number) => `v${CACHE_VERSION}:${textHash}:c${i}`;

interface ChunkManifest {
  version: number;
  voiceId: string;
  chunkKeys: string[];
  durations: number[]; // seconds, per chunk (estimated if metadata was unavailable)
}

// Memory caches (per page session; persistence lives in IndexedDB).
const memChunks = new Map<string, Blob>(); // chunkKey -> blob
const memManifests = new Map<string, ChunkManifest>(); // textHash -> manifest

// Simple hash function for caching
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// A short, silent WAV used to UNLOCK the audio element inside a user gesture on
// iOS Safari. Playing it during the tap ties the element to the gesture, so the
// real (async-loaded) audio can start later without a NotAllowedError.
function buildSilentWavDataUri(): string {
  const sampleRate = 8000;
  const numSamples = 400; // ~50ms
  const dataSize = numSamples; // 8-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < dataSize; i++) view.setUint8(44 + i, 128); // 8-bit silence
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(binary);
}
const SILENT_AUDIO = buildSilentWavDataUri();

// IndexedDB management with limits
const DB_NAME = 'TTSAudioCache';
const DB_VERSION = 3;
const STORE_NAME = 'audios';
const METADATA_STORE = 'metadata';
const MAX_CACHE_FILES = 100;
const MAX_CACHE_SIZE_MB = 50;
const MAX_CACHE_SIZE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;

interface CacheMetadata {
  key: string;
  size: number;
  timestamp: number;
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      // Discard any pre-v3 stores (the old single-blob format) so the broken
      // concatenated audio is never served from cache after this fix.
      if (db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
      if (db.objectStoreNames.contains(METADATA_STORE)) db.deleteObjectStore(METADATA_STORE);

      db.createObjectStore(STORE_NAME);
      const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
    };
  });
}

async function getCacheStats(): Promise<{ count: number; totalSize: number }> {
  try {
    const db = await openDB();
    const transaction = db.transaction(METADATA_STORE, 'readonly');
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const metadata: CacheMetadata[] = request.result;
        const totalSize = metadata.reduce((sum, item) => sum + item.size, 0);
        db.close();
        resolve({ count: metadata.length, totalSize });
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { count: 0, totalSize: 0 };
  }
}

async function cleanupOldestEntries(requiredSpace: number): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    const metadataStore = transaction.objectStore(METADATA_STORE);
    const audioStore = transaction.objectStore(STORE_NAME);

    const index = metadataStore.index('timestamp');
    const request = index.openCursor();

    let freedSpace = 0;
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor && (freedSpace < requiredSpace || deletedCount < 10)) {
          const metadata: CacheMetadata = cursor.value;

          audioStore.delete(metadata.key);
          cursor.delete();

          freedSpace += metadata.size;
          deletedCount++;

          cursor.continue();
        } else {
          transaction.oncomplete = () => {
            db.close();
            console.log(`Pulizia cache completata: ${deletedCount} file rimossi, ${(freedSpace / 1024 / 1024).toFixed(2)}MB liberati`);
            resolve();
          };
        }
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
}

async function saveBlobToIndexedDB(key: string, blob: Blob): Promise<void> {
  try {
    const stats = await getCacheStats();

    // Check if cleanup is needed
    if (stats.count >= MAX_CACHE_FILES || stats.totalSize + blob.size > MAX_CACHE_SIZE_BYTES) {
      console.log(`Limite cache raggiunto (${stats.count} file, ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB). Avvio pulizia...`);
      await cleanupOldestEntries(blob.size);
    }

    const db = await openDB();
    const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    const audioStore = transaction.objectStore(STORE_NAME);
    const metadataStore = transaction.objectStore(METADATA_STORE);

    audioStore.put(blob, key);

    const metadata: CacheMetadata = {
      key,
      size: blob.size,
      timestamp: Date.now(),
    };
    metadataStore.put(metadata);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB save error:', error);
  }
}

async function getBlobFromIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB get error:', error);
    return null;
  }
}

async function saveManifestToIndexedDB(textHash: string, manifest: ChunkManifest): Promise<void> {
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  await saveBlobToIndexedDB(manifestKey(textHash), blob);
}

async function getManifestFromIndexedDB(textHash: string): Promise<ChunkManifest | null> {
  const blob = await getBlobFromIndexedDB(manifestKey(textHash));
  if (!blob) return null;
  try {
    return JSON.parse(await blob.text()) as ChunkManifest;
  } catch {
    return null;
  }
}

export class ElevenLabsTTS {
  // Single reusable audio element. Created lazily and UNLOCKED within a user
  // gesture (primeAudio), then re-used for every chunk so iOS keeps allowing
  // programmatic play() across the queue.
  private audio: HTMLAudioElement | null = null;
  // Marks that the element is currently holding the silent unlock clip, so its
  // ended/timeupdate/error events are ignored.
  private currentSrcIsSilent = false;

  // The current chunk queue.
  private chunkBlobs: Blob[] = [];
  private chunkUrls: (string | null)[] = [];
  private chunkDurations: number[] = []; // seconds per chunk
  private currentIndex = 0;
  // Hash (text + voiceId) of the queue currently loaded, so a replay of the
  // same text restarts the queue instead of re-fetching.
  private loadedTextHash: string | null = null;

  private isCurrentlyPlaying = false;
  private isCurrentlyPaused = false;
  private playbackRate = 1.0;

  private onEndedCallback?: () => void;
  private onProgressCallback?: (progress: number) => void;
  private onGenerationProgressCallback?: (current: number, total: number) => void;
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private onErrorCallback?: (message?: string) => void;

  setOnEndedCallback(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  setOnProgressCallback(callback: (progress: number) => void): void {
    this.onProgressCallback = callback;
  }

  setOnGenerationProgressCallback(callback: (current: number, total: number) => void): void {
    this.onGenerationProgressCallback = callback;
  }

  setOnTimeUpdateCallback(callback: (currentTime: number, duration: number) => void): void {
    this.onTimeUpdateCallback = callback;
  }

  setOnErrorCallback(callback: (message?: string) => void): void {
    this.onErrorCallback = callback;
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  // Concatenated blob, built on demand ONLY for the download button. (External
  // players tolerate concatenated MP3 frames; playback in-app uses the queue.)
  getCurrentAudioBlob(): Blob | null {
    if (this.chunkBlobs.length === 0) return null;
    return new Blob(this.chunkBlobs, { type: 'audio/mpeg' });
  }

  private ensureAudioEl(): void {
    if (this.audio) return;
    const a = new Audio();
    a.preload = 'auto';
    a.addEventListener('ended', () => this.onChunkEnded());
    a.addEventListener('timeupdate', () => this.onChunkTimeUpdate());
    a.addEventListener('error', () => {
      if (this.currentSrcIsSilent) return; // ignore the unlock clip
      this.isCurrentlyPlaying = false;
      this.isCurrentlyPaused = false;
      if (this.onErrorCallback) this.onErrorCallback();
    });
    this.audio = a;
  }

  /**
   * Unlock audio within a user gesture (iOS Safari). Plays a silent clip on the
   * element during the tap so the real audio — loaded later, after awaited
   * cache/network work — can start without a NotAllowedError. Idempotent; safe
   * to call on every tap.
   */
  primeAudio(): void {
    this.ensureAudioEl();
    const a = this.audio!;
    // Don't disrupt audio that is actively playing.
    if (this.isCurrentlyPlaying && !this.currentSrcIsSilent) return;
    try {
      this.currentSrcIsSilent = true;
      a.src = SILENT_AUDIO;
      a.playbackRate = 1;
      const p = a.play();
      if (p && typeof p.then === 'function') p.catch(() => { /* unlock attempt */ });
    } catch {
      /* ignore */
    }
  }

  private splitTextIntoChunks(text: string, maxLength: number = 450): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const sentences = text.split(/([.!?]\s+)/);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          // Sentence is longer than maxLength, split by words
          const words = sentence.split(' ');
          for (const word of words) {
            if ((currentChunk + ' ' + word).length <= maxLength) {
              currentChunk += (currentChunk ? ' ' : '') + word;
            } else {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = word;
            }
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    // Final safety check: force split any chunk > maxLength
    const finalChunks: string[] = [];
    for (const chunk of chunks) {
      if (chunk.length <= maxLength) {
        finalChunks.push(chunk);
      } else {
        // Force split by character if necessary
        for (let i = 0; i < chunk.length; i += maxLength) {
          finalChunks.push(chunk.slice(i, i + maxLength));
        }
      }
    }

    return finalChunks.filter(chunk => chunk.length > 0);
  }

  async speak(text: string, voiceId: string = 'cnDF6tD6CWVBeLKYlCXW'): Promise<void> {
    if (!text || text.trim().length === 0) {
      toast({
        title: "Errore audio",
        description: "Nessun testo da leggere.",
        variant: "destructive",
      });
      throw new Error('Testo vuoto');
    }

    // Capture the user gesture immediately, before any await, so playback
    // started later (after cache/network) is still tied to this tap.
    this.primeAudio();

    const textHash = hashText(text + voiceId);

    try {
      // Instant replay: the same queue is already loaded in memory (after a
      // stop or a natural end). Restart from the beginning — no cache lookup,
      // no TTS request.
      if (this.loadedTextHash === textHash && this.chunkBlobs.length > 0) {
        this.startQueue(0);
        console.log('ElevenLabsTTS: Replay istantaneo da 0:00');
        return;
      }

      // Cached (memory or IndexedDB) → zero network.
      const cached = await this.loadFromCache(textHash);
      if (cached) {
        console.log('ElevenLabsTTS: Audio trovato in cache');
        toast({
          title: "Audio caricato",
          description: "Audio recuperato dalla cache locale",
          duration: 2000,
        });
        this.setQueue(cached.blobs, cached.durations, textHash);
        this.startQueue(0);
        return;
      }

      // Generate.
      const generated = await this.generate(text, voiceId, textHash);
      this.setQueue(generated.blobs, generated.durations, textHash);
      this.startQueue(0);
      console.log('ElevenLabsTTS: Riproduzione avviata');
    } catch (error) {
      console.error('ElevenLabsTTS speak error:', error);
      const userMessage = error instanceof Error ? error.message : "Impossibile generare l'audio";
      toast({
        title: "Errore audio",
        description: this.getUserFriendlyMessage(userMessage),
        variant: "destructive",
        duration: 5000,
      });
      throw new Error(this.getUserFriendlyMessage(userMessage));
    }
  }

  /**
   * Load a cached chunk queue for this text, or null on a miss. Checks memory
   * first, then IndexedDB. A partially-evicted set (manifest present but a chunk
   * blob missing) is treated as a miss so the caller regenerates cleanly.
   */
  private async loadFromCache(
    textHash: string,
  ): Promise<{ blobs: Blob[]; durations: number[] } | null> {
    const mem = memManifests.get(textHash);
    if (mem) {
      const blobs = mem.chunkKeys.map((k) => memChunks.get(k));
      if (blobs.every(Boolean)) {
        return { blobs: blobs as Blob[], durations: mem.durations ?? [] };
      }
    }

    const manifest = await getManifestFromIndexedDB(textHash);
    if (!manifest || !manifest.chunkKeys?.length) return null;

    const blobs: Blob[] = [];
    for (const k of manifest.chunkKeys) {
      const b = await getBlobFromIndexedDB(k);
      if (!b) return null; // partially evicted → regenerate
      blobs.push(b);
      memChunks.set(k, b);
    }
    memManifests.set(textHash, manifest);
    return { blobs, durations: manifest.durations ?? [] };
  }

  /**
   * Synthesize every chunk sequentially (one edge call each), measure their
   * durations, and persist chunk blobs + a manifest to memory and IndexedDB.
   */
  private async generate(
    text: string,
    voiceId: string,
    textHash: string,
  ): Promise<{ blobs: Blob[]; durations: number[] }> {
    const chunks = this.splitTextIntoChunks(text);

    console.log(`ElevenLabsTTS: Generazione audio per ${text.length} caratteri in ${chunks.length} blocchi...`);
    toast({
      title: "Generazione audio",
      description: `Generazione di ${chunks.length} ${chunks.length === 1 ? 'blocco' : 'blocchi'} audio...`,
      duration: 3000,
    });

    const blobs: Blob[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`ElevenLabsTTS: Generazione blocco ${i + 1}/${chunks.length}`);

      if (this.onGenerationProgressCallback) {
        this.onGenerationProgressCallback(i + 1, chunks.length);
      }

      const { data, error } = await supabase.functions.invoke('text-to-speech-elevenlabs', {
        body: {
          text: chunks[i],
          voiceId,
        },
      });

      if (error || data?.errorCode) {
        // Read the structured { errorCode, error } the edge function returns.
        // supabase.functions.invoke exposes the error body as a Response on
        // error.context, so parse that (not error.message, which is only the
        // generic "non-2xx status code").
        const parsed = data?.errorCode
          ? { errorCode: data.errorCode as string, status: undefined as number | undefined }
          : await this.extractInvokeError(error);

        // The function's own 401 (expired user session) — distinct from an
        // upstream ElevenLabs key failure (UPSTREAM_AUTH).
        if (parsed.status === 401 && parsed.errorCode !== 'UPSTREAM_AUTH') {
          throw new Error('Devi effettuare l\'accesso per usare la lettura audio.');
        }

        if (parsed.errorCode) {
          // Neutral, user-safe message per code (never raw upstream detail).
          throw new Error(
            getUserFacingMessage(parsed.errorCode, {
              fallback: 'Servizio audio temporaneamente non disponibile. Riprova tra poco.',
            })
          );
        }

        // Nothing parseable → generic fallback.
        throw this.mapErrorToUserFriendly(error);
      }

      if (!data?.audioContent) {
        throw new Error('Non è stato possibile generare l\'audio per questo testo.');
      }

      blobs.push(this.base64ToBlob(data.audioContent, 'audio/mpeg'));
    }

    // Measure per-chunk durations (metadata reads on local blobs; no gesture
    // needed). Fall back to a rate estimate when metadata is unavailable.
    const measureUrls = blobs.map((b) => URL.createObjectURL(b));
    const measured = await this.measureDurations(measureUrls);
    measureUrls.forEach((u) => URL.revokeObjectURL(u));
    const durations = measured.map((d, i) =>
      d > 0 ? d : Math.max(1, chunks[i].length / 15) // ~15 chars/sec Italian
    );

    // Persist (memory + IndexedDB).
    const keys = blobs.map((_, i) => chunkKey(textHash, i));
    const manifest: ChunkManifest = {
      version: CACHE_VERSION,
      voiceId,
      chunkKeys: keys,
      durations,
    };
    blobs.forEach((b, i) => memChunks.set(keys[i], b));
    memManifests.set(textHash, manifest);

    toast({
      title: "Salvataggio audio",
      description: "Audio salvato nella cache locale per riproduzione offline",
      duration: 2000,
    });
    try {
      await Promise.all(blobs.map((b, i) => saveBlobToIndexedDB(keys[i], b)));
      await saveManifestToIndexedDB(textHash, manifest);
      console.log('ElevenLabsTTS: Audio + manifest salvati in IndexedDB');
    } catch (e) {
      console.warn('ElevenLabsTTS: salvataggio cache non riuscito', e);
    }

    return { blobs, durations };
  }

  private measureDurations(urls: string[]): Promise<number[]> {
    return Promise.all(
      urls.map(
        (url) =>
          new Promise<number>((resolve) => {
            const a = new Audio();
            a.preload = 'metadata';
            const finish = (d: number) => {
              a.onloadedmetadata = null;
              a.onerror = null;
              a.src = '';
              resolve(isFinite(d) && d > 0 ? d : 0);
            };
            a.onloadedmetadata = () => finish(a.duration);
            a.onerror = () => finish(0);
            a.src = url;
          })
      )
    );
  }

  /** Install a new chunk queue, releasing any previous object URLs. */
  private setQueue(blobs: Blob[], durations: number[], textHash: string): void {
    this.disposeQueue();
    this.chunkBlobs = blobs;
    this.chunkDurations = durations.length === blobs.length ? durations : blobs.map(() => 0);
    this.chunkUrls = blobs.map((b) => URL.createObjectURL(b));
    this.loadedTextHash = textHash;
    this.currentIndex = 0;
  }

  private startQueue(from: number): void {
    this.currentIndex = from;
    this.isCurrentlyPlaying = true;
    this.isCurrentlyPaused = false;
    this.loadChunk(from, true);
  }

  private loadChunk(i: number, play: boolean): void {
    if (!this.audio || !this.chunkUrls[i]) return;
    this.currentSrcIsSilent = false;
    this.audio.src = this.chunkUrls[i]!;
    this.audio.playbackRate = this.playbackRate;
    if (play) {
      const p = this.audio.play();
      if (p && typeof p.then === 'function') p.catch((err) => this.handlePlayError(err));
    }
  }

  private handlePlayError(err: unknown): void {
    this.isCurrentlyPlaying = false;
    this.isCurrentlyPaused = false;
    const name = (err as { name?: string })?.name;
    // Genuinely blocked playback (no gesture): surface a friendly message only,
    // never the raw platform DOMException text.
    const message =
      name === 'NotAllowedError'
        ? "Tocca di nuovo il pulsante per avviare l'audio."
        : undefined;
    if (name !== 'NotAllowedError') console.error('ElevenLabsTTS play error:', err);
    if (this.onErrorCallback) this.onErrorCallback(message);
  }

  private onChunkEnded(): void {
    if (this.currentSrcIsSilent) return; // ignore the unlock clip

    if (this.currentIndex < this.chunkUrls.length - 1) {
      // Advance to the next chunk (its object URL is already created).
      this.currentIndex++;
      this.loadChunk(this.currentIndex, true);
      return;
    }

    // Whole queue finished. Rewind to the start so pressing play replays
    // instantly from 0:00 (no re-fetch).
    console.log('ElevenLabsTTS: Riproduzione terminata');
    this.isCurrentlyPlaying = false;
    this.isCurrentlyPaused = false;
    this.currentIndex = 0;
    if (this.audio && this.chunkUrls[0]) {
      this.currentSrcIsSilent = false;
      this.audio.src = this.chunkUrls[0]!;
    }
    if (this.onEndedCallback) this.onEndedCallback();
  }

  private onChunkTimeUpdate(): void {
    if (!this.audio || this.currentSrcIsSilent) return;
    const total = this.totalDuration();
    const combined = this.elapsedBefore(this.currentIndex) + (this.audio.currentTime || 0);
    if (this.onTimeUpdateCallback) this.onTimeUpdateCallback(combined, total);
    if (this.onProgressCallback && total > 0) {
      this.onProgressCallback(Math.min(100, (combined / total) * 100));
    }
  }

  private elapsedBefore(index: number): number {
    let sum = 0;
    for (let k = 0; k < index && k < this.chunkDurations.length; k++) {
      sum += this.chunkDurations[k] || 0;
    }
    return sum;
  }

  private totalDuration(): number {
    return this.chunkDurations.reduce((a, b) => a + (b || 0), 0);
  }

  pause(): void {
    if (this.audio && this.isCurrentlyPlaying && !this.isCurrentlyPaused) {
      this.audio.pause();
      this.isCurrentlyPaused = true;
      console.log('ElevenLabsTTS: Pausa');
    }
  }

  resume(): void {
    if (this.audio && this.isCurrentlyPaused) {
      const p = this.audio.play();
      if (p && typeof p.then === 'function') p.catch((err) => this.handlePlayError(err));
      this.isCurrentlyPaused = false;
      console.log('ElevenLabsTTS: Ripresa');
    }
  }

  stop(): void {
    this.isCurrentlyPlaying = false;
    this.isCurrentlyPaused = false;
    this.currentIndex = 0;
    if (this.audio) {
      this.audio.pause();
      // Reset to the first chunk at 0:00 but KEEP the queue for instant replay.
      this.currentSrcIsSilent = false;
      if (this.chunkUrls[0]) this.audio.src = this.chunkUrls[0]!;
      try {
        this.audio.currentTime = 0;
      } catch {
        /* currentTime not settable until metadata; harmless */
      }
      console.log('ElevenLabsTTS: Stop (posizione azzerata, audio mantenuto per replay)');
    }
  }

  isSpeaking(): boolean {
    return this.isCurrentlyPlaying && !this.isCurrentlyPaused;
  }

  isPaused(): boolean {
    return this.isCurrentlyPaused;
  }

  /** Seek across the COMBINED timeline (percentage 0-100 of total duration). */
  seek(percentage: number): void {
    const total = this.totalDuration();
    if (!this.audio || total <= 0) return;

    const target = Math.max(0, Math.min(total, (percentage / 100) * total));

    // Map the global position to (chunk index, offset within chunk).
    let acc = 0;
    let idx = this.chunkDurations.length - 1;
    for (let i = 0; i < this.chunkDurations.length; i++) {
      const d = this.chunkDurations[i] || 0;
      if (target < acc + d || i === this.chunkDurations.length - 1) {
        idx = i;
        break;
      }
      acc += d;
    }
    const offset = target - acc;
    const wasPlaying = this.isCurrentlyPlaying && !this.isCurrentlyPaused;

    this.currentIndex = idx;
    if (!this.chunkUrls[idx]) return;

    this.currentSrcIsSilent = false;
    this.audio.src = this.chunkUrls[idx]!;
    this.audio.playbackRate = this.playbackRate;
    const applyOffset = () => {
      try {
        this.audio!.currentTime = offset;
      } catch {
        /* ignore */
      }
    };
    // currentTime only sticks once metadata is available for the new src.
    this.audio.onloadedmetadata = () => {
      applyOffset();
      if (this.audio) this.audio.onloadedmetadata = null;
    };
    if (wasPlaying) {
      const p = this.audio.play();
      if (p && typeof p.then === 'function') p.then(applyOffset).catch((err) => this.handlePlayError(err));
    } else {
      applyOffset();
    }
  }

  /** Release the current queue's object URLs. Keeps cached blobs (memory/IDB). */
  private disposeQueue(): void {
    this.chunkUrls.forEach((u) => {
      if (u) URL.revokeObjectURL(u);
    });
    this.chunkUrls = [];
    this.chunkBlobs = [];
    this.chunkDurations = [];
    this.currentIndex = 0;
    this.loadedTextHash = null;
  }

  /** Full teardown for component unmount. Cached blobs are preserved. */
  dispose(): void {
    this.isCurrentlyPlaying = false;
    this.isCurrentlyPaused = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.disposeQueue();
  }

  /**
   * Extracts the structured { errorCode, error } body from a
   * supabase.functions.invoke error. The body is exposed as a Response on
   * error.context; clone() so we never consume the original stream. Returns the
   * HTTP status too, so callers can tell a user-session 401 from an upstream
   * failure. Never returns raw upstream detail — only the errorCode.
   */
  private async extractInvokeError(
    error: unknown
  ): Promise<{ errorCode?: string; status?: number }> {
    const ctx = (error as { context?: Response })?.context;
    const status: number | undefined = ctx?.status;
    if (ctx && typeof ctx.clone === 'function') {
      try {
        const body = (await ctx.clone().json()) as { errorCode?: string };
        return { errorCode: body?.errorCode, status };
      } catch {
        // Body was not JSON — fall through to status-only.
      }
    }
    return { status };
  }

  private mapErrorToUserFriendly(error: unknown): Error {
    const msg = (error as { message?: string })?.message || String(error);
    return new Error(this.getUserFriendlyMessage(msg));
  }

  private getUserFriendlyMessage(msg: string): string {
    const lower = msg.toLowerCase();

    // Blocked autoplay / lost user gesture — never surface the raw platform text.
    if (lower.includes('not allowed') || lower.includes('user agent') || lower.includes('notallowed') || lower.includes('gesture')) {
      return 'Tocca di nuovo il pulsante per avviare l\'audio.';
    }
    if (lower.includes('dns') || lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch') || lower.includes('networkerror')) {
      return 'Problema di connessione. Controlla la tua connessione internet e riprova.';
    }
    if (lower.includes('429') || lower.includes('troppe richieste') || lower.includes('rate limit') || lower.includes('limite')) {
      return 'Troppe richieste. Attendi qualche minuto e riprova.';
    }
    if (lower.includes('401') || lower.includes('sessione scaduta') || lower.includes('autenticazione') || lower.includes('unauthorized') || lower.includes('accesso')) {
      return 'Devi effettuare l\'accesso per usare la lettura audio.';
    }
    if (lower.includes('non configurato') || lower.includes('api key') || lower.includes('not configured')) {
      return 'Servizio audio non configurato. Contatta l\'assistenza.';
    }
    if (lower.includes('500') || lower.includes('server') || lower.includes('non disponibile') || lower.includes('internal')) {
      return 'Servizio audio temporaneamente non disponibile. Riprova tra poco.';
    }
    if (lower.includes('nessun audio') || lower.includes('empty') || lower.includes('non è stato possibile')) {
      return 'Non è stato possibile generare l\'audio per questo testo.';
    }
    if (lower.includes('non valido') || lower.includes('validation')) {
      return 'Il testo inserito non è valido. Verifica e riprova.';
    }

    // If the message is already user-friendly (Italian), return as-is
    if (/^[A-ZÀ-Ú]/.test(msg) && !lower.includes('error') && !lower.includes('exception')) {
      return msg;
    }

    return 'Errore durante la generazione audio. Riprova.';
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }
}
