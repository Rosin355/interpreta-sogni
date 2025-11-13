import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DraftData {
  title: string;
  content: string;
  dream_date: string;
  dream_time: string;
  mood: string;
  tags: string;
}

export const useDreamDraft = (formData: DraftData, enabled: boolean = true) => {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  // Load existing draft on mount
  useEffect(() => {
    if (!enabled) return;
    loadLatestDraft();
  }, [enabled]);

  // Auto-save every 30 seconds when form data changes
  useEffect(() => {
    if (!enabled || isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer for 30 seconds
    saveTimerRef.current = window.setTimeout(() => {
      saveDraft();
    }, 30000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [formData, enabled]);

  const loadLatestDraft = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dream_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDraftId(data.id);
        setLastSaved(new Date(data.updated_at));
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    // Don't save if content is empty
    if (!formData.content && !formData.title) {
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const draftData = {
        user_id: user.id,
        title: formData.title || null,
        content: formData.content || null,
        dream_date: formData.dream_date ? new Date(formData.dream_date).toISOString().split('T')[0] : null,
        dream_time: formData.dream_time || null,
        mood: formData.mood || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      };

      if (draftId) {
        // Update existing draft
        const { error } = await supabase
          .from('dream_drafts')
          .update(draftData)
          .eq('id', draftId);

        if (error) throw error;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('dream_drafts')
          .insert(draftData)
          .select()
          .single();

        if (error) throw error;
        if (data) setDraftId(data.id);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la bozza",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDraft = async () => {
    if (!draftId) return;

    try {
      const { error } = await supabase
        .from('dream_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      setDraftId(null);
      setLastSaved(null);
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const getLastSavedText = () => {
    if (!lastSaved) return null;

    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return `Salvato ${diffSeconds} secondi fa`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `Salvato ${diffMinutes} minuti fa`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    return `Salvato ${diffHours} ore fa`;
  };

  return {
    isSaving,
    lastSaved,
    lastSavedText: getLastSavedText(),
    saveDraft,
    deleteDraft,
  };
};
