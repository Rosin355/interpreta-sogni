import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Share2, Mail, Link2, Copy, Trash2, UserCheck } from "lucide-react";
import { z } from "zod";

interface ShareDreamUnifiedProps {
  dreamId: string;
  dreamTitle: string;
  shareToken: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareTokenChange: (token: string | null) => void;
}

// ─── Tab: Professionista ───────────────────────────────────────

interface Professional {
  id: string;
  user_id: string;
  specialization: string;
  profiles?: { username: string };
}

function TabProfessional({ dreamId, dreamTitle, onDone }: { dreamId: string; dreamTitle: string; onDone: () => void }) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setLoadingList(true);
        const { data, error } = await supabase
          .from("professional_profiles")
          .select("id, user_id, specialization")
          .eq("status", "approved");
        if (error) throw error;

        const enriched = await Promise.all(
          (data || []).map(async (p) => {
            const { data: profile } = await supabase.from("profiles").select("username").eq("id", p.user_id).single();
            return { ...p, profiles: profile || { username: "Professionista" } };
          })
        );
        setProfessionals(enriched);
      } catch {
        toast({ title: "Errore", description: "Impossibile caricare i professionisti", variant: "destructive" });
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  const handleShare = async () => {
    if (!selected) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const { error } = await supabase.from("dream_shares").insert({
        dream_id: dreamId, user_id: user.id, professional_id: selected, message: message.trim() || null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Hai già condiviso questo sogno con questo professionista");
        throw error;
      }

      const prof = professionals.find((p) => p.user_id === selected);
      await supabase.functions.invoke("send-email-notification", {
        body: {
          type: "dream_shared", recipientUserId: selected, recipientName: prof?.profiles?.username,
          data: { dreamTitle, dreamId, userName: user.user_metadata?.username || user.email, message: message.trim() || undefined },
        },
      });

      toast({ title: "✅ Sogno condiviso!", description: "Il professionista riceverà una notifica" });
      setMessage(""); setSelected(""); onDone();
    } catch (e: any) {
      toast({ title: "Errore", description: e.message || "Impossibile condividere", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loadingList) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!professionals.length) return <p className="text-center text-sm text-muted-foreground py-4">Nessun professionista disponibile</p>;

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Seleziona Professionista</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue placeholder="Scegli un professionista..." /></SelectTrigger>
          <SelectContent>
            {professionals.map((p) => (
              <SelectItem key={p.user_id} value={p.user_id}>
                {p.profiles?.username || "Professionista"} - {p.specialization}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Messaggio Opzionale</Label>
        <Textarea placeholder="Aggiungi un messaggio..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} />
        <p className="text-xs text-muted-foreground mt-1">{message.length}/500</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={handleShare} disabled={loading || !selected}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Condividi
        </Button>
      </div>
    </div>
  );
}

// ─── Tab: Email ────────────────────────────────────────────────

const emailSchema = z.object({ email: z.string().email("Email non valida"), message: z.string().max(500).optional() });

function TabEmail({ dreamId, dreamTitle, onDone }: { dreamId: string; dreamTitle: string; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    const v = emailSchema.safeParse({ email, message });
    if (!v.success) { toast({ title: "Errore", description: v.error.errors[0].message, variant: "destructive" }); return; }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      const { data: recipientId, error: lookupErr } = await supabase.rpc("find_user_by_email", { user_email: email });
      if (lookupErr) throw new Error("Errore nella ricerca utente");

      if (!recipientId) {
        await supabase.functions.invoke("send-email-notification", {
          body: { type: "user_invitation", recipientEmail: email, data: { dreamTitle, userName: profile?.username || "Un utente", message: message || "", inviterName: profile?.username || "Un utente" } },
        });
        toast({ title: "Invito inviato", description: "L'utente non è registrato. Gli è stato inviato un invito." });
        onDone(); setEmail(""); setMessage(""); return;
      }

      if (recipientId === user.id) { toast({ title: "Errore", description: "Non puoi condividere con te stesso", variant: "destructive" }); return; }

      const { error: shareErr } = await supabase.from("dream_shares").insert({
        dream_id: dreamId, user_id: user.id, shared_with_user_id: recipientId, message: message || null, status: "pending",
      });
      if (shareErr) throw shareErr;

      await supabase.functions.invoke("send-email-notification", {
        body: { type: "dream_shared_user_request", recipientEmail: email, data: { dreamTitle, dreamId, userName: profile?.username || "Un utente", message: message || "" } },
      });

      toast({ title: "Richiesta inviata", description: "L'utente ha ricevuto un'email di notifica." });
      onDone(); setEmail(""); setMessage("");
    } catch (e: any) {
      toast({ title: "Errore", description: e.message || "Impossibile condividere", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Email destinatario *</Label>
        <Input type="email" placeholder="esempio@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
      </div>
      <div className="space-y-2">
        <Label>Messaggio (opzionale)</Label>
        <Textarea placeholder="Aggiungi un messaggio personale..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} disabled={loading} />
        <p className="text-xs text-muted-foreground">{message.length}/500</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={handleShare} disabled={loading || !email}>
          {loading ? "Invio..." : "Condividi"}
        </Button>
      </div>
    </div>
  );
}

// ─── Tab: Link ─────────────────────────────────────────────────

function TabLink({ dreamId, shareToken, onShareTokenChange }: { dreamId: string; shareToken: string | null; onShareTokenChange: (t: string | null) => void }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const publicUrl = shareToken ? `${window.location.origin}/dream/shared/${shareToken}` : null;

  const generateToken = async () => {
    try {
      setLoading(true);
      const token = crypto.randomUUID();
      const { error } = await supabase.from("dreams").update({ share_token: token } as any).eq("id", dreamId);
      if (error) throw error;
      onShareTokenChange(token);
      toast({ title: "Link generato!", description: "Puoi copiarlo e condividerlo con chiunque" });
    } catch {
      toast({ title: "Errore", description: "Impossibile generare il link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const revokeToken = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.from("dreams").update({ share_token: null } as any).eq("id", dreamId);
      if (error) throw error;
      onShareTokenChange(null);
      toast({ title: "Link revocato", description: "Il link pubblico non è più attivo" });
    } catch {
      toast({ title: "Errore", description: "Impossibile revocare il link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copiato!" });
  };

  if (!shareToken) {
    return (
      <div className="text-center py-6 space-y-4">
        <Link2 className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Genera un link pubblico per condividere il sogno con chiunque, anche senza account.</p>
        <Button onClick={generateToken} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Genera Link Pubblico
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input value={publicUrl || ""} readOnly className="text-xs" />
        <Button variant="outline" size="icon" onClick={copyLink}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {copied && <p className="text-xs text-green-500">Copiato!</p>}
      <p className="text-xs text-muted-foreground">Chiunque abbia questo link può visualizzare il sogno in modalità di sola lettura.</p>
      <Button variant="destructive" size="sm" onClick={revokeToken} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Trash2 className="mr-2 h-4 w-4" />Revoca Link
      </Button>
    </div>
  );
}

// ─── Main Dialog ───────────────────────────────────────────────

export function ShareDreamUnified({ dreamId, dreamTitle, shareToken, open, onOpenChange, onShareTokenChange }: ShareDreamUnifiedProps) {
  const handleDone = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />Condividi Sogno
          </DialogTitle>
          <DialogDescription>Condividi "{dreamTitle}"</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="professional" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="professional" className="gap-1 text-xs"><UserCheck className="h-3.5 w-3.5" />Professionista</TabsTrigger>
            <TabsTrigger value="email" className="gap-1 text-xs"><Mail className="h-3.5 w-3.5" />Email</TabsTrigger>
            <TabsTrigger value="link" className="gap-1 text-xs"><Link2 className="h-3.5 w-3.5" />Link</TabsTrigger>
          </TabsList>

          <TabsContent value="professional">
            <TabProfessional dreamId={dreamId} dreamTitle={dreamTitle} onDone={handleDone} />
          </TabsContent>
          <TabsContent value="email">
            <TabEmail dreamId={dreamId} dreamTitle={dreamTitle} onDone={handleDone} />
          </TabsContent>
          <TabsContent value="link">
            <TabLink dreamId={dreamId} shareToken={shareToken} onShareTokenChange={onShareTokenChange} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
