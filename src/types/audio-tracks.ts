export type AudioTrackCategory =
  | 'Addormentamento'
  | 'Rilassamento profondo'
  | 'Visualizzazione guidata'
  | 'Preparazione al sogno'
  | 'Risveglio consapevole'
  | 'Ricordo dei sogni'
  | 'Rituali del sonno';

export type AccessTier = 'free' | 'subscriber';

export interface AudioTrack {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: AudioTrackCategory;
  cover_image_url: string | null;
  audio_path: string;
  duration_seconds: number | null;
  access_tier: AccessTier;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const AUDIO_CATEGORIES: AudioTrackCategory[] = [
  'Addormentamento',
  'Rilassamento profondo',
  'Visualizzazione guidata',
  'Preparazione al sogno',
  'Risveglio consapevole',
  'Ricordo dei sogni',
  'Rituali del sonno',
];
