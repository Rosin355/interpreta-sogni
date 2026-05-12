import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAudioTracks } from '@/hooks/useAudioTracks';
import { useAudioAdmin } from '@/hooks/useAudioAdmin';
import { AUDIO_CATEGORIES, type AudioTrackCategory, type AccessTier, type AudioTrack } from '@/types/audio-tracks';
import { Plus, Trash2, Edit2, Music, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AudioAdmin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { tracks, loading, refetch } = useAudioTracks();
  const { createTrack, updateTrack, deleteTrack, saving } = useAudioAdmin();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [preface, setPreface] = useState('');
  const [category, setCategory] = useState<AudioTrackCategory>('Rilassamento profondo');
  const [accessTier, setAccessTier] = useState<AccessTier>('free');
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
        setIsAdmin(!!data);
      }
      setCheckingAuth(false);
    })();
  }, []);

  if (checkingAuth) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Accesso non autorizzato.</p>
      </div>
    );
  }

  const resetForm = () => {
    setTitle(''); setSubtitle(''); setDescription(''); setPreface('');
    setCategory('Rilassamento profondo');
    setAccessTier('free'); setIsPublished(false); setIsFeatured(false);
    setSortOrder(0); setAudioFile(null); setCoverFile(null);
    setEditingTrack(null); setShowForm(false);
  };

  const handleEdit = (track: AudioTrack) => {
    setEditingTrack(track);
    setTitle(track.title);
    setSubtitle(track.subtitle || '');
    setDescription(track.description || '');
    setPreface(track.preface || '');
    setCategory(track.category);
    setAccessTier(track.access_tier);
    setIsPublished(track.is_published);
    setIsFeatured(track.is_featured);
    setSortOrder(track.sort_order);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    const formData = { title, description, category, access_tier: accessTier, is_published: isPublished, is_featured: isFeatured, sort_order: sortOrder };

    let success: boolean;
    if (editingTrack) {
      success = await updateTrack(editingTrack.id, formData, audioFile, coverFile);
    } else {
      if (!audioFile) {
        toast({ title: 'File audio richiesto', variant: 'destructive' });
        return;
      }
      success = await createTrack(formData, audioFile, coverFile);
    }

    if (success) {
      toast({ title: editingTrack ? 'Traccia aggiornata' : 'Traccia creata' });
      resetForm();
      refetch();
    } else {
      toast({ title: 'Errore nel salvataggio', variant: 'destructive' });
    }
  };

  const handleDelete = async (track: AudioTrack) => {
    if (!confirm(`Eliminare "${track.title}"?`)) return;
    const ok = await deleteTrack(track);
    if (ok) {
      toast({ title: 'Traccia eliminata' });
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-12 container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bodoni-heading text-foreground">Gestione Audio</h1>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuova Traccia
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingTrack ? 'Modifica Traccia' : 'Nuova Traccia'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Titolo</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meditazione per il sonno..." />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Una breve descrizione..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as AudioTrackCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIO_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Accesso</Label>
                  <Select value={accessTier} onValueChange={(v) => setAccessTier(v as AccessTier)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="subscriber">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Ordine</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>File Audio (MP3)</Label>
                  <Input type="file" accept="audio/mpeg,audio/mp3" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <Label>Immagine Cover</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                  <Label>Pubblicato</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                  <Label>In Evidenza</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Salvataggio...' : editingTrack ? 'Aggiorna' : 'Crea'}
                </Button>
                <Button variant="outline" onClick={resetForm}>Annulla</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Track list */}
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Caricamento...</p>
        ) : tracks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nessuna traccia audio. Crea la prima!</p>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
                  {track.cover_image_url ? (
                    <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music className="h-5 w-5 text-muted-foreground/40" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground">{track.category}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={track.is_published ? 'default' : 'secondary'} className="text-[10px]">
                    {track.is_published ? 'Pubblicato' : 'Bozza'}
                  </Badge>
                  <Badge variant={track.access_tier === 'subscriber' ? 'default' : 'secondary'} className="text-[10px]">
                    {track.access_tier === 'subscriber' ? 'Premium' : 'Free'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(track)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(track)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioAdmin;
