import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { buildErrorReportAction } from "@/utils/error-toast-action";
import { supabase } from "@/integrations/supabase/client";
import { searchPlaces, getTimezone, GeocodingResult } from "@/utils/geocoding";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const birthDataSchema = z.object({
  birthDate: z.date({
    required_error: "La data di nascita è obbligatoria",
  }).refine((date) => {
    const year = date.getFullYear();
    return year >= 1900 && year <= new Date().getFullYear();
  }, {
    message: "La data deve essere tra il 1900 e l'anno corrente",
  }).refine((date) => {
    return date <= new Date();
  }, {
    message: "La data non può essere nel futuro",
  }),
  birthTime: z.string()
    .min(1, "L'ora di nascita è obbligatoria")
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Formato ora non valido. Usa HH:MM (es. 09:30 o 14:45)",
    }),
  birthPlace: z.string()
    .min(3, "Il luogo deve contenere almeno 3 caratteri")
    .max(200, "Il luogo non può superare i 200 caratteri"),
});

type BirthDataFormValues = z.infer<typeof birthDataSchema>;

interface BirthDataFormProps {
  onSuccess?: () => void;
  initialData?: {
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    latitude?: number;
    longitude?: number;
  };
}

export function BirthDataForm({ onSuccess, initialData }: BirthDataFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [placeSearch, setPlaceSearch] = useState(initialData?.birthPlace || "");
  const [places, setPlaces] = useState<GeocodingResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GeocodingResult | null>(
    initialData?.latitude && initialData?.longitude
      ? {
          name: initialData.birthPlace?.split(',')[0] || "",
          displayName: initialData.birthPlace || "",
          latitude: initialData.latitude,
          longitude: initialData.longitude
        }
      : null
  );
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [openPlaceCombobox, setOpenPlaceCombobox] = useState(false);

  const form = useForm<BirthDataFormValues>({
    resolver: zodResolver(birthDataSchema),
    defaultValues: {
      birthDate: initialData?.birthDate ? new Date(initialData.birthDate) : undefined,
      birthTime: initialData?.birthTime || "12:00",
      birthPlace: initialData?.birthPlace || "",
    },
  });

  const handlePlaceSearch = async (query: string) => {
    setPlaceSearch(query);
    if (query.length >= 3) {
      setSearchingPlaces(true);
      const results = await searchPlaces(query);
      setPlaces(results);
      setSearchingPlaces(false);
    } else {
      setPlaces([]);
    }
  };

  const handlePlaceSelect = (place: GeocodingResult) => {
    setSelectedPlace(place);
    form.setValue("birthPlace", place.displayName);
    setOpenPlaceCombobox(false);
  };

  const onSubmit = async (data: BirthDataFormValues) => {
    // Validazione place selezionato
    if (!selectedPlace) {
      toast.error("Seleziona un luogo dalla lista dei risultati");
      return;
    }

    // Validazione coordinate
    const lat = selectedPlace.latitude;
    const lon = selectedPlace.longitude;
    
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      toast.error("Coordinate del luogo non valide. Seleziona un altro luogo.");
      return;
    }

    if (lat < -90 || lat > 90) {
      toast.error("Latitudine non valida. Deve essere tra -90 e 90 gradi.");
      return;
    }

    if (lon < -180 || lon > 180) {
      toast.error("Longitudine non valida. Deve essere tra -180 e 180 gradi.");
      return;
    }

    // Toast iniziale
    toast.info("Calcolo del tema natale in corso...", { 
      description: "Sto elaborando i dati di nascita",
      duration: 2000 
    });

    setIsLoading(true);

    const MAX_RETRIES = 2;
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= MAX_RETRIES) {
      try {
        if (attempt > 0) {
          toast.loading(`Nuovo tentativo ${attempt + 1} di ${MAX_RETRIES + 1}...`, { 
            id: 'retry-toast',
            description: "Riprovo a contattare il servizio di calcolo"
          });
        }

        const timezone = getTimezone(selectedPlace.latitude, selectedPlace.longitude);
        
        // Validazione timezone
        if (!timezone || !timezone.startsWith('UTC')) {
          toast.error("Impossibile determinare il fuso orario per questo luogo");
          setIsLoading(false);
          return;
        }

        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'calculate-natal-chart',
          {
            body: {
              birthDate: format(data.birthDate, "yyyy-MM-dd"),
              birthTime: data.birthTime,
              birthPlace: {
                latitude: selectedPlace.latitude,
                longitude: selectedPlace.longitude,
                placeName: selectedPlace.displayName,
                timezone,
              },
            },
          }
        );

        if (functionError) {
          lastError = functionError;
          console.error(`Tentativo ${attempt + 1} fallito:`, functionError);
          
          if (attempt < MAX_RETRIES) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          
          toast.dismiss('retry-toast');
          
          // Messaggi di errore specifici in italiano
          const errorMsg = functionError.message || '';
          if (errorMsg.includes('Invalid request')) {
            toast.error("Dati di nascita non validi", {
              description: "Verifica che data, ora e luogo siano corretti",
              duration: 6000
            });
          } else if (errorMsg.includes('No planets')) {
            toast.error("Errore nel calcolo delle posizioni planetarie", {
              description: "Il servizio di calcolo astrologico ha riscontrato un problema",
              duration: 6000
            });
          } else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
            toast.error("Problema di connessione", {
              description: "Verifica la tua connessione internet e riprova",
              duration: 6000
            });
          } else {
            toast.error("Impossibile calcolare il tema natale", {
              description: errorMsg || 'Errore del server',
              duration: 6000
            });
          }
          break;
        }

        if (!functionData?.success) {
          lastError = functionData;
          console.error(`Tentativo ${attempt + 1} - risposta non valida:`, functionData);
          
          if (attempt < MAX_RETRIES) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          
          toast.dismiss('retry-toast');
          const errorDetail = functionData?.error || 'Risposta non valida';
          if (errorDetail.includes('planets')) {
            toast.error("Dati planetari incompleti", {
              description: "Il servizio non ha restituito tutte le posizioni necessarie",
              duration: 6000
            });
          } else {
            toast.error("Errore nel calcolo", {
              description: errorDetail,
              duration: 6000
            });
          }
          break;
        }

        // Successo!
        toast.dismiss('retry-toast');
        console.log('Natal chart calculated successfully:', functionData);
        toast.success("Tema natale calcolato con successo!", {
          description: "I dati astrologici sono stati elaborati correttamente"
        });
        
        setTimeout(() => {
          form.reset();
          setSelectedPlace(null);
          setPlaceSearch("");
          
          if (onSuccess) {
            onSuccess();
          }
        }, 500);
        
        setIsLoading(false);
        return;

      } catch (error: any) {
        lastError = error;
        console.error(`Tentativo ${attempt + 1} - eccezione:`, error);
        
        if (attempt < MAX_RETRIES) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        toast.dismiss('retry-toast');
        const errorMsg = error.message || 'Errore di connessione';
        if (errorMsg.includes('fetch')) {
          toast.error("Errore di connessione", {
            description: "Impossibile contattare il servizio. Riprova tra qualche minuto.",
            duration: 6000
          });
        } else if (errorMsg.includes('auth') || errorMsg.includes('unauthorized')) {
          toast.error("Errore di autenticazione", {
            description: "La tua sessione potrebbe essere scaduta. Ricarica la pagina.",
            duration: 6000
          });
        } else {
          toast.error("Errore imprevisto", {
            description: errorMsg,
            duration: 6000
          });
        }
        break;
      }
    }
    
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data di Nascita</FormLabel>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Seleziona la data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    className="pointer-events-auto"
                    captionLayout="dropdown-buttons"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
                </Popover>
                <Input
                  type="date"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined;
                    field.onChange(date);
                  }}
                  min="1900-01-01"
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="w-36"
                />
              </div>
              <FormDescription>
                Seleziona dal calendario o inserisci manualmente
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birthTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ora di Nascita</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  {...field}
                  className="w-full"
                />
              </FormControl>
              <FormDescription>
                L'ora esatta della tua nascita (formato 24h)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birthPlace"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Luogo di Nascita</FormLabel>
              <Popover open={openPlaceCombobox} onOpenChange={setOpenPlaceCombobox}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        <span className="truncate">{field.value}</span>
                      ) : (
                        "Cerca il tuo luogo di nascita..."
                      )}
                      <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Cerca città..."
                      value={placeSearch}
                      onValueChange={handlePlaceSearch}
                    />
                    <CommandList>
                      {searchingPlaces && (
                        <CommandEmpty>
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </CommandEmpty>
                      )}
                      {!searchingPlaces && places.length === 0 && placeSearch.length >= 3 && (
                        <CommandEmpty>Nessun luogo trovato</CommandEmpty>
                      )}
                      {!searchingPlaces && placeSearch.length > 0 && placeSearch.length < 3 && (
                        <CommandEmpty>Digita almeno 3 caratteri</CommandEmpty>
                      )}
                      {places.length > 0 && (
                        <CommandGroup>
                          {places.map((place) => (
                            <CommandItem
                              key={`${place.latitude}-${place.longitude}`}
                              value={place.displayName}
                              onSelect={() => handlePlaceSelect(place)}
                            >
                              <MapPin className="mr-2 h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{place.name}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {place.displayName}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Cerca e seleziona la città dove sei nat{selectedPlace && (
                  <span className="block mt-1 text-xs">
                    📍 {selectedPlace.latitude.toFixed(4)}°, {selectedPlace.longitude.toFixed(4)}°
                  </span>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calcolo in corso...
            </>
          ) : (
            "Calcola Tema Natale"
          )}
        </Button>
      </form>
    </Form>
  );
}
