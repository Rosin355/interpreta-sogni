import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MysticLoader } from "@/components/ui/MysticLoader";
import ReactMarkdown from "react-markdown";
import { Moon, Calendar, Sparkles } from "lucide-react";

interface SharedDream {
  title: string;
  content: string;
  mood: string | null;
  tags: string[] | null;
  image_url: string | null;
  dream_date: string;
  interpretation: string | null;
  interpretation_summary: string | null;
  created_at: string;
}

const SharedDreamPublic = () => {
  const { token } = useParams();
  const [dream, setDream] = useState<SharedDream | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }

    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_dream_by_share_token", { token });
        if (error || !data) { setNotFound(true); return; }
        setDream(data as unknown as SharedDream);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <MysticLoader fullScreen size="lg" text="Caricamento sogno..." />;

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="text-center py-12 space-y-4">
            <Moon className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Sogno non disponibile</h2>
            <p className="text-sm text-muted-foreground">Questo link non è più valido o il sogno è stato rimosso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <Moon className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Sogno condiviso</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{dream!.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(dream!.dream_date), "d MMMM yyyy", { locale: it })}
              {dream!.mood && <Badge variant="secondary">{dream!.mood}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {dream!.image_url && (
              <div className="aspect-video rounded-lg overflow-hidden">
                <img src={dream!.image_url} alt={dream!.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{dream!.content}</ReactMarkdown>
            </div>

            {dream!.tags && dream!.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dream!.tags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}

            {dream!.interpretation && (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />Interpretazione
                </h3>
                {dream!.interpretation_summary && (
                  <p className="text-sm text-muted-foreground italic">{dream!.interpretation_summary}</p>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{dream!.interpretation}</ReactMarkdown>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Condiviso tramite Interpreta Sogni
        </p>
      </div>
    </div>
  );
};

export default SharedDreamPublic;
