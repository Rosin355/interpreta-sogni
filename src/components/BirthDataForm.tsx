import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
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
  }),
  birthTime: z.string().min(1, "L'ora di nascita è obbligatoria"),
  birthPlace: z.string().min(1, "Il luogo di nascita è obbligatorio"),
});

type BirthDataFormValues = z.infer<typeof birthDataSchema>;

interface BirthDataFormProps {
  onSuccess?: () => void;
}

export function BirthDataForm({ onSuccess }: BirthDataFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [placeSearch, setPlaceSearch] = useState("");
  const [places, setPlaces] = useState<GeocodingResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GeocodingResult | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [openPlaceCombobox, setOpenPlaceCombobox] = useState(false);

  const form = useForm<BirthDataFormValues>({
    resolver: zodResolver(birthDataSchema),
    defaultValues: {
      birthTime: "12:00",
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
    if (!selectedPlace) {
      toast.error("Seleziona un luogo dalla lista");
      return;
    }

    setIsLoading(true);

    try {
      const timezone = getTimezone(selectedPlace.latitude, selectedPlace.longitude);

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'calculate-natal-chart',
        {
          body: {
            birthDate: format(data.birthDate, "yyyy-MM-dd"),
            birthTime: data.birthTime,
            birthPlaceName: selectedPlace.displayName,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
            timezone,
          },
        }
      );

      if (functionError) throw functionError;

      if (!functionData?.success) {
        throw new Error(functionData?.error || "Errore nel calcolo del tema natale");
      }

      toast.success("Tema natale calcolato con successo! ✨");
      form.reset();
      setSelectedPlace(null);
      setPlaceSearch("");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error calculating natal chart:", error);
      toast.error(error.message || "Errore nel calcolo del tema natale");
    } finally {
      setIsLoading(false);
    }
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
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
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
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                La tua data di nascita esatta
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
