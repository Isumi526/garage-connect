import { Card, CardContent } from '@/components/ui/card';

export function ComingSoon({ phase }: { phase: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        この機能は <span className="font-semibold text-foreground">{phase}</span> で実装されます。
      </CardContent>
    </Card>
  );
}
