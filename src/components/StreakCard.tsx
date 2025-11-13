import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";

export default function StreakCard() {
  const { streak, loading, getStreakBadge } = useStreak();

  if (loading || !streak) {
    return null;
  }

  const badge = getStreakBadge(streak.current_streak);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Streak Giornaliero
        </CardTitle>
        <CardDescription>Mantieni la costanza registrando i tuoi sogni</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Streak Corrente</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{streak.current_streak}</span>
              <span className="text-lg text-muted-foreground">giorni</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-2">{badge.emoji}</div>
            <Badge variant="secondary" className={badge.color}>
              {badge.label}
            </Badge>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Record Personale
            </div>
            <span className="text-lg font-semibold">{streak.longest_streak} giorni</span>
          </div>
        </div>

        {streak.current_streak >= 3 && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-center">
              🎉 Ottimo lavoro! Continua così per raggiungere nuovi traguardi!
            </p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-muted-foreground">TRAGUARDI</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { days: 7, emoji: "🌟", label: "7 giorni" },
              { days: 30, emoji: "⭐", label: "30 giorni" },
              { days: 100, emoji: "🏆", label: "100 giorni" }
            ].map((milestone) => (
              <div
                key={milestone.days}
                className={`p-2 rounded-lg text-center ${
                  streak.longest_streak >= milestone.days
                    ? "bg-primary/20 border border-primary/40"
                    : "bg-muted/50"
                }`}
              >
                <div className="text-2xl mb-1">{milestone.emoji}</div>
                <p className="text-xs">{milestone.label}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
