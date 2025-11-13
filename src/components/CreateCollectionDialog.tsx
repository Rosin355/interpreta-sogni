import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
  } | null;
}

const CreateCollectionDialog = ({
  open,
  onOpenChange,
  onSuccess,
  initialData = null,
}: CreateCollectionDialogProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.cover_image_url || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Il nome è obbligatorio");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      if (initialData?.id) {
        // Update existing collection
        const { error } = await supabase
          .from("dream_collections")
          .update({
            name: name.trim(),
            description: description.trim() || null,
            cover_image_url: coverImageUrl.trim() || null,
          })
          .eq("id", initialData.id);

        if (error) throw error;
        toast.success("Collezione aggiornata");
      } else {
        // Create new collection
        const { error } = await supabase
          .from("dream_collections")
          .insert({
            user_id: user.id,
            name: name.trim(),
            description: description.trim() || null,
            cover_image_url: coverImageUrl.trim() || null,
          });

        if (error) throw error;
        toast.success("Collezione creata");
      }

      onSuccess();
      onOpenChange(false);
      // Reset form
      setName("");
      setDescription("");
      setCoverImageUrl("");
    } catch (error: any) {
      toast.error("Errore nel salvataggio");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {initialData ? "Modifica Collezione" : "Nuova Collezione"}
            </DialogTitle>
            <DialogDescription>
              Crea un album tematico per organizzare i tuoi sogni correlati
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="es. Sogni Lucidi, Incubi, Viaggi..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                placeholder="Descrivi il tema di questa collezione..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cover">URL Immagine di Copertina</Label>
              <Input
                id="cover"
                type="url"
                placeholder="https://..."
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
              />
              {coverImageUrl && (
                <div className="mt-2 rounded-md overflow-hidden border">
                  <img
                    src={coverImageUrl}
                    alt="Anteprima"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      toast.error("URL immagine non valido");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Aggiorna" : "Crea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCollectionDialog;
