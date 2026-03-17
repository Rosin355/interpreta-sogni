import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type PhaseTransition, type AlchemicalPhase } from "@/utils/alchemical-phases";

interface AlchemicalTransitionsListProps {
  transitions: PhaseTransition[];
  compact?: boolean;
}

const phaseLabel: Record<AlchemicalPhase, string> = {
  nigredo: "Nigredo",
  albedo: "Albedo",
  rubedo: "Rubedo",
};

const phaseBadgeClass: Record<AlchemicalPhase, string> = {
  nigredo: "border-border bg-secondary text-secondary-foreground",
  albedo: "border-accent/30 bg-accent/10 text-accent",
  rubedo: "border-primary/30 bg-primary/10 text-primary",
};

export const AlchemicalTransitionsList = ({
  transitions,
  compact = false,
}: AlchemicalTransitionsListProps) => {
  return (
    <Card className="border-border/80 bg-card/70">
      <CardHeader className={cn(compact && "p-4 pb-2") }>
        <CardTitle className="text-lg">Transizioni recenti</CardTitle>
        <CardDescription>
          I passaggi tra le tre fasi del tuo percorso interiore.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-3", compact && "p-4 pt-0")}>
        {transitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Continua a registrare i tuoi sogni per vedere i passaggi tra Nigredo, Albedo e Rubedo.
          </p>
        ) : (
          transitions
            .slice(-5)
            .reverse()
            .map((transition, index) => (
              <div
                key={`${transition.date.toString()}-${transition.from}-${transition.to}-${index}`}
                className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
              >
                <Badge variant="outline" className={cn("font-medium", phaseBadgeClass[transition.from])}>
                  {phaseLabel[transition.from]}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className={cn("font-medium", phaseBadgeClass[transition.to])}>
                  {phaseLabel[transition.to]}
                </Badge>
                <span className="ml-auto text-sm text-muted-foreground">
                  {new Date(transition.date).toLocaleDateString("it-IT")}
                </span>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  )
}
