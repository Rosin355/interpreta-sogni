import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MysticLoader } from "@/components/ui/MysticLoader";
import { PaywallBlur } from "@/components/marketing/PaywallBlur";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Moon, Sparkles, Eye } from "lucide-react";

interface PublicDream {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  mood: string | null;
  tags: string[] | null;
  image_url: string | null;
  interpretation: string | null;
  interpretation_summary: string | null;
  user_id: string;
  created_at: string;
}

interface AuthorProfile {
  username: string | null;
  avatar_url: string | null;
}

const PREVIEW_RATIO = 0.4;

const SharedDreamPublicFull = () => {
  const { id } = useParams();
  const [dream, setDream] = useState<PublicDream | null>(null);
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);

        const { data, error } = await supabase
          .from("dreams")
          .select("id,title,content,dream_date,mood,tags,image_url,interpretation,interpretation_summary,user_id,created_at,visibility,is_private")
          .eq("id", id)
          .eq("visibility", "public")
          .eq("is_private", false)
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
          return;
        }
        setDream(data as PublicDream);

        const { data: profile } = await supabase
          .from("profiles")
          .select("username,avatar_url")
          .eq("id", data.user_id)
          .maybeSingle();
        if (profile) setAuthor(profile as AuthorProfile);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <MysticLoader fullScreen size="lg" text="Caricamento visione..." />;

  if (notFound || !dream) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-24 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="text-center py-12 space-y-4">
              <Moon className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold">Visione non disponibile</h2>
              <p className="text-sm text-muted-foreground">
                Questo sogno non è più pubblico o è stato rimosso.
              </p>
              <Button asChild variant="outline">
                <Link to="/explore">Torna alla Community</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Spezza l'interpretazione: 40% visibile, resto sotto paywall
  const fullInterpretation = dream.interpretation || "";
  const splitIndex = Math.max(
    120,
    Math.min(fullInterpretation.length, Math.floor(fullInterpretation.length * PREVIEW_RATIO))
  );
  const visiblePart = fullInterpretation.slice(0, splitIndex);
  const hiddenPart = fullInterpretation.slice(splitIndex);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main
        className="container mx-auto px-4 py-12"
        style={{ paddingTop: "calc(7rem + var(--safe-area-inset-top, 0px))" }}
      >
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Eyebrow */}
          <div
            className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.32em]"
            style={{ color: "hsl(var(--mystic-glow))" }}
          >
            <span>✦</span>
            <span>Visione Condivisa</span>
            <span>✦</span>
          </div>

          {/* Autore */}
          {author && (
            <div className="flex items-center justify-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={author.avatar_url || ""} />
                <AvatarFallback>
                  {author.username?.slice(0, 2).toUpperCase() || "AN"}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium">{author.username || "Anonimo"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(dream.dream_date), "d MMMM yyyy", { locale: it })}
                </p>
              </div>
            </div>
          )}

          <Card className="border-border/80 bg-card/70 overflow-hidden">
            {dream.image_url && (
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={dream.image_url}
                  alt={dream.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-3xl font-bodoni-heading leading-tight">
                {dream.title}
              </CardTitle>
              {dream.mood && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="secondary">{dream.mood}</Badge>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Contenuto del sogno */}
              <section className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{dream.content}</ReactMarkdown>
              </section>

              {dream.tags && dream.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {dream.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Interpretazione */}
              {dream.interpretation && (
                <section className="border-t pt-6 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Interpretazione dell'Alchimista
                  </h3>

                  {dream.interpretation_summary && (
                    <p className="text-sm text-muted-foreground italic">
                      {dream.interpretation_summary}
                    </p>
                  )}

                  {/* Parte visibile */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{visiblePart}</ReactMarkdown>
                  </div>

                  {/* Paywall */}
                  {hiddenPart.trim().length > 0 && (
                    <PaywallBlur
                      hiddenPreview={hiddenPart}
                      dreamId={dream.id}
                      isAuthenticated={isAuthenticated}
                    />
                  )}
                </section>
              )}
            </CardContent>
          </Card>

          {/* Hook marketing finale */}
          {!isAuthenticated && (
            <Card className="border-mystic-violet/30 bg-gradient-to-br from-mystic-deep/40 to-background">
              <CardContent className="py-8 text-center space-y-4">
                <p
                  className="text-[11px] uppercase tracking-[0.32em]"
                  style={{ color: "hsl(var(--mystic-glow))" }}
                >
                  La tua Opera ti aspetta
                </p>
                <h3 className="font-bodoni-heading text-2xl leading-tight max-w-lg mx-auto">
                  Il tuo sogno di stanotte potrebbe contenere lo stesso simbolo.
                  <em> Scoprilo.</em>
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Registra i tuoi sogni, ricevi interpretazioni alchemiche personalizzate
                  e segui la tua trasformazione attraverso le tre fasi della Grande Opera.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button asChild size="lg">
                    <Link to={`/auth?mode=signup&from=visione&dream=${dream.id}`}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Inizia gratis
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/explore">
                      <Eye className="h-4 w-4 mr-2" />
                      Esplora altre visioni
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default SharedDreamPublicFull;
