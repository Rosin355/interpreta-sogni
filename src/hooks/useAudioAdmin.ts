import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AudioTrack, AudioTrackCategory, AccessTier } from '@/types/audio-tracks';

interface TrackFormData {
  title: string;
  subtitle: string;
  description: string;
  preface: string;
  category: AudioTrackCategory;
  access_tier: AccessTier;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
}

export function useAudioAdmin() {
  const [saving, setSaving] = useState(false);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const uploadAudio = async (file: File): Promise<string | null> => {
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error } = await supabase.storage.from('ritual-audio').upload(path, file);
    return error ? null : path;
  };

  const uploadCover = async (file: File): Promise<string | null> => {
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error } = await supabase.storage.from('ritual-audio-covers').upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from('ritual-audio-covers').getPublicUrl(path);
    return data.publicUrl;
  };

  const createTrack = async (
    form: TrackFormData,
    audioFile: File,
    coverFile?: File | null
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const audioPath = await uploadAudio(audioFile);
      if (!audioPath) return false;

      let coverUrl: string | null = null;
      if (coverFile) {
        coverUrl = await uploadCover(coverFile);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get audio duration
      const duration = await getAudioDuration(audioFile);

      const { error } = await supabase.from('audio_tracks').insert({
        title: form.title,
        subtitle: form.subtitle?.trim() || null,
        slug: generateSlug(form.title),
        description: form.description || null,
        preface: form.preface?.trim() || null,
        category: form.category,
        cover_image_url: coverUrl,
        audio_path: audioPath,
        duration_seconds: duration,
        access_tier: form.access_tier,
        is_published: form.is_published,
        is_featured: form.is_featured,
        sort_order: form.sort_order,
        created_by: user.id,
      } as any);

      return !error;
    } finally {
      setSaving(false);
    }
  };

  const updateTrack = async (
    id: string,
    form: Partial<TrackFormData>,
    audioFile?: File | null,
    coverFile?: File | null
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const updates: any = { ...form };

      if (form.title) {
        updates.slug = generateSlug(form.title);
      }

      if (audioFile) {
        const audioPath = await uploadAudio(audioFile);
        if (audioPath) {
          updates.audio_path = audioPath;
          updates.duration_seconds = await getAudioDuration(audioFile);
        }
      }

      if (coverFile) {
        const coverUrl = await uploadCover(coverFile);
        if (coverUrl) updates.cover_image_url = coverUrl;
      }

      const { error } = await supabase
        .from('audio_tracks')
        .update(updates)
        .eq('id', id);

      return !error;
    } finally {
      setSaving(false);
    }
  };

  const deleteTrack = async (track: AudioTrack): Promise<boolean> => {
    // Delete audio file
    await supabase.storage.from('ritual-audio').remove([track.audio_path]);

    const { error } = await supabase.from('audio_tracks').delete().eq('id', track.id);
    return !error;
  };

  return { createTrack, updateTrack, deleteTrack, saving };
}

function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(Math.round(audio.duration));
      URL.revokeObjectURL(audio.src);
    });
    audio.addEventListener('error', () => resolve(null));
    audio.src = URL.createObjectURL(file);
  });
}
