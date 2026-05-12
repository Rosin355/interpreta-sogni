import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
}

const ComingSoonDialog = ({
  open,
  onOpenChange,
  title = "Percorsi Sonori",
  message = "I Percorsi Sonori stanno prendendo forma nel laboratorio onirico. Arriveranno presto.",
}: ComingSoonDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0610]/95 backdrop-blur-2xl border border-mystic-violet/20 shadow-[0_0_60px_rgba(168,85,247,0.15)] sm:max-w-md">
        <DialogHeader className="space-y-6 text-center sm:text-center">
          <div className="ed-asterism">
            <span className="ed-line" />
            <span style={{ color: "hsl(var(--mystic-glow))" }}>※</span>
            <span className="ed-line" />
          </div>
          <DialogTitle
            className="font-editorial uppercase tracking-[0.22em] text-foreground text-center"
            style={{ fontSize: "18px" }}
          >
            {title}
          </DialogTitle>
          <DialogDescription className="font-editorial italic text-base leading-relaxed text-foreground/70 text-center px-2">
            {message}
          </DialogDescription>
          <div className="ed-meta text-center" style={{ color: "hsl(var(--mystic-glow))" }}>
            MMXXVI · In cantiere
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-editorial uppercase tracking-[0.18em] text-xs text-foreground/60 hover:text-mystic-pink"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComingSoonDialog;
