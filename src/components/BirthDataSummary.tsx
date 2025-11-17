import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Clock, Home } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface BirthDataSummaryProps {
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  houseSystem?: string;
}

export function BirthDataSummary({
  birthDate,
  birthTime,
  birthPlace,
  latitude,
  longitude,
  timezone,
  houseSystem = 'Placidus'
}: BirthDataSummaryProps) {
  if (!birthDate || !birthTime || !birthPlace) {
    return null;
  }

  const formattedDate = format(new Date(birthDate), "d MMMM yyyy", { locale: it });
  const coords = latitude && longitude 
    ? `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`
    : '';

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium mb-1">Data di Nascita</p>
              <p className="text-sm font-semibold">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium mb-1">Ora</p>
              <p className="text-sm font-semibold">{birthTime}</p>
              {timezone && (
                <p className="text-xs text-muted-foreground">{timezone}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium mb-1">Luogo</p>
              <p className="text-sm font-semibold">{birthPlace}</p>
              {coords && (
                <p className="text-xs text-muted-foreground">{coords}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium mb-1">Sistema Case</p>
              <p className="text-sm font-semibold">{houseSystem}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
