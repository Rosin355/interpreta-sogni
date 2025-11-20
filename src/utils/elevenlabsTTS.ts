import { supabase } from "@/integrations/supabase/client";

export class ElevenLabsTTS {
  private audio: HTMLAudioElement | null = null;
  private currentText: string = '';
  private isCurrentlyPlaying: boolean = false;
  private isCurrentlyPaused: boolean = false;
  private onEndedCallback?: () => void;
  private onProgressCallback?: (progress: number) => void;

  setOnEndedCallback(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  setOnProgressCallback(callback: (progress: number) => void): void {
    this.onProgressCallback = callback;
  }

  async speak(text: string, voiceId: string = 'cnDF6tD6CWVBeLKYlCXW'): Promise<void> {
    try {
      this.stop();

      if (!text || text.trim().length === 0) {
        throw new Error('Testo vuoto');
      }

      const truncatedText = text.length > 500 ? text.substring(0, 497) + '...' : text;
      this.currentText = truncatedText;

      console.log(`ElevenLabsTTS: Generazione audio per ${truncatedText.length} caratteri...`);

      const { data, error } = await supabase.functions.invoke('text-to-speech-elevenlabs', {
        body: { 
          text: truncatedText,
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
      const audioUrl = URL.createObjectURL(audioBlob);

      this.audio = new Audio(audioUrl);
      
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
        if (this.audio && this.onProgressCallback) {
          const progress = (this.audio.currentTime / this.audio.duration) * 100;
          this.onProgressCallback(progress);
        }
      };

      await this.audio.play();
      this.isCurrentlyPlaying = true;
      this.isCurrentlyPaused = false;

      console.log('ElevenLabsTTS: Riproduzione avviata');

    } catch (error) {
      console.error('ElevenLabsTTS speak error:', error);
      throw error;
    }
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
