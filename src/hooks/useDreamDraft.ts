import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DraftData {
  title: string;
  content: string;
  dream_date: string;
  dream_time: string;
  mood: string;
  tags: string;
}

interface LocalDraftPayload extends DraftData {
  updated_at: string;
}

const LOCAL_KEY_PREFIX = "dream_draft_local_";
const LOCAL_DEBOUNCE_MS = 800;
const REMOTE_DEBOUNCE_MS = 8000;

const isEmpty = (d: DraftData) =>
  !d.title.trim() && !d.content.trim() && !d.tags.trim() && !d.mood.trim();

const localKey = (userId: string) => `${LOCAL_KEY_PREFIX}${userId}`;

const readLocal = (userId: string): LocalDraftPayload | null => {
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalDraftPayload;
  } catch {
    return null;
  }
};

const writeLocal = (userId: string, data: DraftData) => {
  try {
    const payload: LocalDraftPayload = { ...data, updated_at: new Date().toISOString() };
    localStorage.setItem(localKey(userId), JSON.stringify(payload));
  } catch {
    // quota exceeded or unavailable — silent
  }
};

const clearLocal = (userId: string) => {
  try {
    localStorage.removeItem(localKey(userId));
  } catch {
    /* noop */
  }
};

const toFormDraft = (row: any): DraftData => ({
  title: row?.title ?? "",
  content: row?.content ?? "",
  dream_date: row?.dream_date
    ? new Date(row.dream_date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0],
  dream_time: row?.dream_time ?? "",
  mood: row?.mood ?? "",
  tags: Array.isArray(row?.tags) ? row.tags.join(", ") : (row?.tags ?? ""),
});

export const useDreamDraft = (formData: DraftData, enabled: boolean = true) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastLocalSaved, setLastLocalSaved] = useState<Date | null>(null);
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const localTimerRef = useRef<number | null>(null);
  const remoteTimerRef = useRef<number | null>(null);
  const lastSerializedRef = useRef<string>("");
  const formDataRef = useRef<DraftData>(formData);
  const userIdRef = useRef<string | null>(null);
  const draftIdRef = useRef<string | null>(null);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  // Load drafts on mount (supabase + localStorage; choose newest)
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setUserId(user.id);

        const local = readLocal(user.id);

        const { data: remote } = await (supabase as any)
          .from("dream_drafts")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (remote) {
          setDraftId(remote.id);
          setLastSaved(new Date(remote.updated_at));
        }

        const remoteTs = remote ? new Date(remote.updated_at).getTime() : 0;
        const localTs = local ? new Date(local.updated_at).getTime() : 0;

        let chosen: DraftData | null = null;
        if (localTs > remoteTs && local) {
          chosen = {
            title: local.title ?? "",
            content: local.content ?? "",
            dream_date: local.dream_date ?? new Date().toISOString().split("T")[0],
            dream_time: local.dream_time ?? "",
            mood: local.mood ?? "",
            tags: local.tags ?? "",
          };
        } else if (remote) {
          chosen = toFormDraft(remote);
        }

        if (chosen && !isEmpty(chosen)) {
          setDraft(chosen);
          setHasDraft(true);
        }
      } catch {
        // silent — never log draft content
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const saveLocalNow = useCallback(() => {
    const uid = userIdRef.current;
    const data = formDataRef.current;
    if (!uid || isEmpty(data)) return;
    writeLocal(uid, data);
    setLastLocalSaved(new Date());
  }, []);

  const saveRemoteNow = useCallback(async () => {
    const uid = userIdRef.current;
    const data = formDataRef.current;
    if (!uid || isEmpty(data)) return;

    const serialized = JSON.stringify(data);
    if (serialized === lastSerializedRef.current) return;

    setIsSaving(true);
    try {
      const draftRow = {
        user_id: uid,
        title: data.title || null,
        content: data.content || null,
        dream_date: data.dream_date
          ? new Date(data.dream_date).toISOString().split("T")[0]
          : null,
        dream_time: data.dream_time || null,
        mood: data.mood || null,
        tags: data.tags
          ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
      };

      const currentId = draftIdRef.current;
      if (currentId) {
        const { error } = await (supabase as any)
          .from("dream_drafts")
          .update(draftRow)
          .eq("id", currentId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await (supabase as any)
          .from("dream_drafts")
          .insert(draftRow)
          .select()
          .single();
        if (error) throw error;
        if (inserted) setDraftId(inserted.id);
      }

      lastSerializedRef.current = serialized;
      setLastSaved(new Date());
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile salvare la bozza nel cloud",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Debounced autosave (local fast, remote slow)
  useEffect(() => {
    if (!enabled || !userId) return;
    if (isEmpty(formData)) return;

    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);

    localTimerRef.current = window.setTimeout(() => {
      saveLocalNow();
    }, LOCAL_DEBOUNCE_MS);

    remoteTimerRef.current = window.setTimeout(() => {
      saveRemoteNow();
    }, REMOTE_DEBOUNCE_MS);

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    };
  }, [formData, enabled, userId, saveLocalNow, saveRemoteNow]);

  // Save on page hide / visibility change / beforeunload
  useEffect(() => {
    if (!enabled) return;

    const flush = () => {
      saveLocalNow();
      // best-effort async, don't block unload
      void saveRemoteNow();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, saveLocalNow, saveRemoteNow]);

  const saveDraft = useCallback(async () => {
    saveLocalNow();
    await saveRemoteNow();
  }, [saveLocalNow, saveRemoteNow]);

  const deleteDraft = useCallback(async () => {
    const uid = userIdRef.current;
    if (uid) clearLocal(uid);
    const currentId = draftIdRef.current;
    if (currentId) {
      try {
        await (supabase as any).from("dream_drafts").delete().eq("id", currentId);
      } catch {
        /* silent */
      }
      setDraftId(null);
    }
    setDraft(null);
    setHasDraft(false);
    setLastSaved(null);
    setLastLocalSaved(null);
    lastSerializedRef.current = "";
  }, []);

  const restoreDraft = useCallback((): DraftData | null => {
    if (!draft) return null;
    setHasDraft(false);
    return draft;
  }, [draft]);

  const getLastSavedText = () => {
    const ts = lastSaved ?? lastLocalSaved;
    if (!ts) return null;
    const diffSeconds = Math.floor((Date.now() - ts.getTime()) / 1000);
    const prefix = lastSaved ? "Bozza salvata" : "Salvato localmente";
    if (diffSeconds < 60) return `${prefix} · ${diffSeconds}s fa`;
    const m = Math.floor(diffSeconds / 60);
    if (m < 60) return `${prefix} · ${m} min fa`;
    const h = Math.floor(m / 60);
    return `${prefix} · ${h}h fa`;
  };

  return {
    isSaving,
    lastSaved,
    lastSavedText: getLastSavedText(),
    draft,
    hasDraft,
    saveDraft,
    deleteDraft,
    restoreDraft,
  };
};
