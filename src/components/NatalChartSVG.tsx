import { Card, CardContent } from "@/components/ui/card";

interface NatalChartSVGProps {
  svg: string;
}

/**
 * Renderizza la chart natale SVG (tema dark) generata dall'API Astrologer.
 * Include ruota zodiacale, linee di aspetto, dati pianeti/cuspidi e griglia aspetti.
 */
export function NatalChartSVG({ svg }: NatalChartSVGProps) {
  return (
    <Card className="overflow-hidden bg-[#0b1226]">
      <CardContent className="p-0">
        <div
          className="w-full overflow-x-auto [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </CardContent>
    </Card>
  );
}
