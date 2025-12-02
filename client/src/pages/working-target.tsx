import { Crosshair } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkingTarget() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Crosshair className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-working-target-title">Working Target</h1>
          <p className="text-muted-foreground">Temporary target management system</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The Working Target feature is being built. More content will be added here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is a placeholder for the temporary target management system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
