import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Sparkles, AlertTriangle, CheckCircle } from "lucide-react";

const MAX_CHARS = 500;
const WARNING_THRESHOLD = 450;

interface CustomPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  useAiAuto: boolean;
  onAiAutoChange: (value: boolean) => void;
}

export const CustomPromptInput = ({
  value,
  onChange,
  disabled = false,
  useAiAuto,
  onAiAutoChange,
}: CustomPromptInputProps) => {
  const charCount = value.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount >= WARNING_THRESHOLD && charCount <= MAX_CHARS;
  const isValid = charCount <= MAX_CHARS;

  const getStatusColor = () => {
    if (isOverLimit) return "text-destructive";
    if (isNearLimit) return "text-yellow-500";
    return "text-green-500";
  };

  const getStatusBorderColor = () => {
    if (isOverLimit) return "border-destructive focus-visible:ring-destructive";
    if (isNearLimit) return "border-yellow-500 focus-visible:ring-yellow-500";
    if (charCount > 0) return "border-green-500 focus-visible:ring-green-500";
    return "";
  };

  const getStatusIcon = () => {
    if (isOverLimit) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (isNearLimit) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    if (charCount > 0) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Toggle AI automatico */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Lascia che l'AI crei il prompt</span>
        </div>
        <Switch
          checked={useAiAuto}
          onCheckedChange={onAiAutoChange}
          disabled={disabled}
        />
      </div>

      {/* Input manuale */}
      {!useAiAuto && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="customPrompt">Suggerimenti Personalizzati</Label>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={cn("text-xs font-medium", getStatusColor())}>
                {charCount} / {MAX_CHARS}
              </span>
            </div>
          </div>
          
          <Textarea
            id="customPrompt"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="es: ambiente più scuro, scena più semplice, focus su un particolare elemento..."
            rows={3}
            disabled={disabled}
            className={cn(
              "transition-colors duration-200",
              getStatusBorderColor()
            )}
          />

          {/* Messaggi di stato */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Descrivi come vorresti che fosse l'immagine
            </p>
            
            {isOverLimit && (
              <p className="text-xs text-destructive font-medium animate-pulse">
                Superi il limite di {charCount - MAX_CHARS} caratteri
              </p>
            )}
            
            {isNearLimit && !isOverLimit && (
              <p className="text-xs text-yellow-500 font-medium">
                Quasi al limite
              </p>
            )}
          </div>
        </div>
      )}

      {useAiAuto && (
        <p className="text-xs text-muted-foreground italic flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          L'AI creerà automaticamente il prompt migliore basandosi sul contenuto del sogno
        </p>
      )}
    </div>
  );
};

// Funzione helper per verificare se il prompt è valido
export const isCustomPromptValid = (value: string, useAiAuto: boolean): boolean => {
  if (useAiAuto) return true;
  return value.length <= MAX_CHARS;
};
