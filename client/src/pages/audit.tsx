import { useQuery } from "@tanstack/react-query";
import { History, User, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import type { Audit } from "@shared/schema";

export default function AuditLogs() {
  const { data: auditLogs = [], isLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audit"],
  });

  const actionColors: Record<string, string> = {
    create: "default",
    update: "secondary",
    delete: "destructive",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-semibold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all changes and activities in the system
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Complete history of user actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs yet</p>
                <p className="text-sm mt-2">
                  User activities will be tracked here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-4 p-4 border rounded-lg hover-elevate"
                    data-testid={`audit-log-${log.id}`}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={actionColors[log.action as keyof typeof actionColors] as any || "secondary"}>
                          {log.action}
                        </Badge>
                        <span className="text-sm font-medium">{log.model}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.model_id}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "PPpp")}
                      </p>
                      {log.payload && Object.keys(log.payload).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:underline">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
