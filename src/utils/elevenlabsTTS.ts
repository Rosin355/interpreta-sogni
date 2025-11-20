import { supabase } from "@/integrations/supabase/client";

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

// IndexedDB management
const DB_NAME = 'TTSAudioCache';
const DB_VERSION = 1;
const STORE_NAME = 'audios';

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
    };
  });
}

async function saveToIndexedDB(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(blob, key);
    
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
  private currentText: string = '';
  private isCurrentlyPlaying: boolean = false;
  private isCurrentlyPaused: boolean = false;
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
    
    return chunks.filter(chunk => chunk.length > 0);
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
        const cachedBlob = audioCache.get(textHash)!;
        const audioUrl = URL.createObjectURL(cachedBlob);
        
        this.audio = new Audio(audioUrl);
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
        // Also save to memory cache for faster access
        audioCache.set(textHash, cachedBlob);
        
        const audioUrl = URL.createObjectURL(cachedBlob);
        this.audio = new Audio(audioUrl);
        this.setupAudioListeners();
        await this.audio.play();
        this.isCurrentlyPlaying = true;
        this.isCurrentlyPaused = false;
        console.log('ElevenLabsTTS: Riproduzione da IndexedDB avviata');
        return;
      }

      const chunks = this.splitTextIntoChunks(text);

      console.log(`ElevenLabsTTS: Generazione audio per ${text.length} caratteri in ${chunks.length} blocchi...`);

      // Generate audio for all chunks
      const audioBlobs: Blob[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`ElevenLabsTTS: Generazione blocco ${i + 1}/${chunks.length}`);
        
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
          throw new Error(error.message || 'Errore nella generazione audio');
        }

        if (!data?.audioContent) {
          throw new Error('Nessun audio ricevuto');
        }

        const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mpeg');
        audioBlobs.push(audioBlob);
      }

      // Concatenate all audio blobs
      const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
      
      // Save to memory cache
      audioCache.set(textHash, combinedBlob);
      console.log('ElevenLabsTTS: Audio salvato in cache memoria');
      
      // Save to IndexedDB for persistence
      await saveToIndexedDB(textHash, combinedBlob);
      console.log('ElevenLabsTTS: Audio salvato in IndexedDB');
      
      const audioUrl = URL.createObjectURL(combinedBlob);

      this.audio = new Audio(audioUrl);
      this.setupAudioListeners();
      await this.audio.play();
      this.isCurrentlyPlaying = true;
      this.isCurrentlyPaused = false;

      console.log('ElevenLabsTTS: Riproduzione avviata');

    } catch (error) {
      console.error('ElevenLabsTTS speak error:', error);
      throw error;
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
    if (this.audio) {
      const url = this.audio.src;
      this.audio.src = '';
      this.audio = null;
      
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
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
