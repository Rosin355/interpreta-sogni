import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Static cache for generated audio
const audioCache = new Map<string, Blob>();

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

// IndexedDB management with limits
const DB_NAME = 'TTSAudioCache';
const DB_VERSION = 2;
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
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
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
            toast({
              title: "Cache TTS pulita",
              description: `${deletedCount} file audio più vecchi sono stati rimossi`,
              duration: 3000,
            });
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

async function saveToIndexedDB(key: string, blob: Blob): Promise<void> {
  try {
    const stats = await getCacheStats();
    
    // Check if cleanup is needed
    if (stats.count >= MAX_CACHE_FILES || stats.totalSize + blob.size > MAX_CACHE_SIZE_BYTES) {
      console.log(`Limite cache raggiunto (${stats.count} file, ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB). Avvio pulizia...`);
      toast({
        title: "Pulizia cache in corso",
        description: "Rimozione file audio più vecchi per fare spazio...",
        duration: 2000,
      });
      await cleanupOldestEntries(blob.size);
    }
    
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    const audioStore = transaction.objectStore(STORE_NAME);
    const metadataStore = transaction.objectStore(METADATA_STORE);
    
    // Save audio blob
    audioStore.put(blob, key);
    
    // Save metadata
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

async function getFromIndexedDB(key: string): Promise<Blob | null> {
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

export class ElevenLabsTTS {
  private audio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private currentAudioBlob: Blob | null = null;
  private currentText: string = '';
  private isCurrentlyPlaying: boolean = false;
  private isCurrentlyPaused: boolean = false;
  private playbackRate: number = 1.0;
  private onEndedCallback?: () => void;
  private onProgressCallback?: (progress: number) => void;
  private onGenerationProgressCallback?: (current: number, total: number) => void;
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;

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

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  getCurrentAudioBlob(): Blob | null {
    return this.currentAudioBlob;
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
    try {
      this.stop();

      if (!text || text.trim().length === 0) {
        throw new Error('Testo vuoto');
      }

      this.currentText = text;
      const textHash = hashText(text + voiceId);

      // Check memory cache first
      if (audioCache.has(textHash)) {
        console.log('ElevenLabsTTS: Audio trovato in cache memoria');
        toast({
          title: "Audio caricato",
          description: "Audio trovato in cache, riproduzione immediata",
          duration: 2000,
        });
        const cachedBlob = audioCache.get(textHash)!;
        this.currentAudioBlob = cachedBlob;
        const audioUrl = URL.createObjectURL(cachedBlob);
        
        this.audioUrl = audioUrl;
        this.audio = new Audio(audioUrl);
        this.audio.playbackRate = this.playbackRate;
        this.setupAudioListeners();
        await this.audio.play();
        this.isCurrentlyPlaying = true;
        this.isCurrentlyPaused = false;
        console.log('ElevenLabsTTS: Riproduzione da cache avviata');
        return;
      }

      // Check IndexedDB cache
      const cachedBlob = await getFromIndexedDB(textHash);
      if (cachedBlob) {
        console.log('ElevenLabsTTS: Audio trovato in IndexedDB');
        toast({
          title: "Audio caricato",
          description: "Audio recuperato dalla cache locale",
          duration: 2000,
        });
        // Also save to memory cache for faster access
        audioCache.set(textHash, cachedBlob);
        this.currentAudioBlob = cachedBlob;
        
        const audioUrl = URL.createObjectURL(cachedBlob);
        this.audioUrl = audioUrl;
        this.audio = new Audio(audioUrl);
        this.audio.playbackRate = this.playbackRate;
        this.setupAudioListeners();
        await this.audio.play();
        this.isCurrentlyPlaying = true;
        this.isCurrentlyPaused = false;
        console.log('ElevenLabsTTS: Riproduzione da IndexedDB avviata');
        return;
      }

      const chunks = this.splitTextIntoChunks(text);

      console.log(`ElevenLabsTTS: Generazione audio per ${text.length} caratteri in ${chunks.length} blocchi...`);
      
      toast({
        title: "Generazione audio",
        description: `Generazione di ${chunks.length} ${chunks.length === 1 ? 'blocco' : 'blocchi'} audio...`,
        duration: 3000,
      });

      // Generate audio for all chunks
      const audioBlobs: Blob[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`ElevenLabsTTS: Generazione blocco ${i + 1}/${chunks.length}`);
        
        if (chunks.length > 1) {
          toast({
            title: "Generazione in corso",
            description: `Blocco ${i + 1} di ${chunks.length}`,
            duration: 2000,
          });
        }
        
        // Notify generation progress
        if (this.onGenerationProgressCallback) {
          this.onGenerationProgressCallback(i + 1, chunks.length);
        }
        
        const { data, error } = await supabase.functions.invoke('text-to-speech-elevenlabs', {
          body: { 
            text: chunks[i],
            voiceId 
          }
        });

        if (error) {
          // Check for 401 specifically
          const errMsg = error?.message || '';
          if (errMsg.includes('non-2xx') || errMsg.includes('401') || errMsg.includes('Unauthorized')) {
            // Try to read the response body for details
            const bodyError = (error as any)?.context?.body?.error || '';
            if (bodyError.toLowerCase().includes('sessione') || errMsg.includes('401')) {
              throw new Error('Devi effettuare l\'accesso per usare la lettura audio.');
            }
          }
          throw this.mapErrorToUserFriendly(error);
        }

        if (!data?.audioContent) {
          throw new Error('Non è stato possibile generare l\'audio per questo testo.');
        }

        const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mpeg');
        audioBlobs.push(audioBlob);
      }

      // Concatenate all audio blobs
      const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
      this.currentAudioBlob = combinedBlob;
      
      toast({
        title: "Salvataggio audio",
        description: "Audio salvato nella cache locale per riproduzione offline",
        duration: 2000,
      });
      
      // Save to memory cache
      audioCache.set(textHash, combinedBlob);
      console.log('ElevenLabsTTS: Audio salvato in cache memoria');
      
      // Save to IndexedDB for persistence
      await saveToIndexedDB(textHash, combinedBlob);
      console.log('ElevenLabsTTS: Audio salvato in IndexedDB');
      
      const audioUrl = URL.createObjectURL(combinedBlob);
      this.audioUrl = audioUrl;

      this.audio = new Audio(audioUrl);
      this.audio.playbackRate = this.playbackRate;
      this.setupAudioListeners();
      await this.audio.play();
      this.isCurrentlyPlaying = true;
      this.isCurrentlyPaused = false;

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

  private setupAudioListeners(): void {
    if (!this.audio) return;

    this.audio.onended = () => {
      console.log('ElevenLabsTTS: Riproduzione terminata');
      this.isCurrentlyPlaying = false;
      this.isCurrentlyPaused = false;
      this.cleanup();
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    };

    this.audio.onerror = (e) => {
      console.error('ElevenLabsTTS: Errore riproduzione audio', e);
      this.isCurrentlyPlaying = false;
      this.isCurrentlyPaused = false;
    };

    this.audio.ontimeupdate = () => {
      if (this.audio) {
        if (this.onProgressCallback) {
          const progress = (this.audio.currentTime / this.audio.duration) * 100;
          this.onProgressCallback(progress);
        }
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.audio.currentTime, this.audio.duration);
        }
      }
    };
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
      this.audio.play();
      this.isCurrentlyPaused = false;
      console.log('ElevenLabsTTS: Ripresa');
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.cleanup();
      this.isCurrentlyPlaying = false;
      this.isCurrentlyPaused = false;
      console.log('ElevenLabsTTS: Stop');
    }
  }

  isSpeaking(): boolean {
    return this.isCurrentlyPlaying && !this.isCurrentlyPaused;
  }

  isPaused(): boolean {
    return this.isCurrentlyPaused;
  }

  seek(percentage: number): void {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = (percentage / 100) * this.audio.duration;
    }
  }

  private cleanup(): void {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  private mapErrorToUserFriendly(error: any): Error {
    const msg = error?.message || error?.context?.body?.error || String(error);
    return new Error(this.getUserFriendlyMessage(msg));
  }

  private getUserFriendlyMessage(msg: string): string {
    const lower = msg.toLowerCase();
    
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
