import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AudioTrack } from '@/types/audio-tracks';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('durationchange', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('playing', () => setLoading(false));
    audio.addEventListener('waiting', () => setLoading(true));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const play = useCallback(async (track: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
      return;
    }

    // Get signed URL for private bucket
    const { data } = await supabase.storage
      .from('ritual-audio')
      .createSignedUrl(track.audio_path, 3600);

    if (data?.signedUrl) {
      audio.src = data.signedUrl;
      setCurrentTrack(track);
      setCurrentTime(0);
      setLoading(true);
      await audio.play();
      setIsPlaying(true);
    }
  }, [currentTrack, isPlaying]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  return { currentTrack, isPlaying, currentTime, duration, loading, play, pause, seek };
}
