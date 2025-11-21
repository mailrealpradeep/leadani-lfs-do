import { useQuery } from "@tanstack/react-query";
import { Webhook, CheckCircle2, XCircle, Copy, Code } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { WebhookLog } from "@shared/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function Webhooks() {
  const { toast } = useToast();

  const { data: webhookLogs = [], isLoading } = useQuery<WebhookLog[]>({
    queryKey: ["/api/webhook/logs"],
  });

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/webhooks/leads`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL has been copied",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Webhook Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically create leads from external sources
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Endpoint
              </CardTitle>
              <CardDescription>
                POST JSON data to this endpoint to create leads automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono">
                  {window.location.origin}/api/webhooks/leads
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyWebhookUrl}
                  data-testid="button-copy-webhook-url"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Required Headers:</p>
                <code className="block p-3 bg-muted rounded-md text-xs font-mono">
                  X-API-KEY: your-api-key-here
                </code>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Example Payload:</p>
                <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
{`{
  "sheet_id": "your-sheet-id",
  "name": "John Doe",
  "mobile_no": "9123456789",
  "whatsapp": "9123456789",
  "lang": "English",
  "occupation": "Student",
  "qualification": "Graduate",
  "lead_date": "2025-11-21",
  "lead_time": "14:30",
  "lead_status": "New",
  "visit_status": "Not Visited",
  "meta": {
    "utm_source": "website",
    "campaign": "winter"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Webhook Requests</CardTitle>
              <CardDescription>
                History of incoming webhook calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : webhookLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No webhook requests yet</p>
                  <p className="text-sm mt-2">
                    Webhook calls will appear here once you start sending requests
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhookLogs.slice(0, 20).map((log) => (
                    <Collapsible key={log.id}>
                      <div className="border rounded-lg p-3 hover-elevate">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {log.status === "success" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={log.status === "success" ? "default" : "destructive"}
                                >
                                  {log.status}
                                </Badge>
                                <span className="text-sm font-mono text-muted-foreground">
                                  {format(new Date(log.created_at), "PPpp")}
                                </span>
                              </div>
                              {log.error_message && (
                                <p className="text-xs text-destructive mt-1">
                                  {log.error_message}
                                </p>
                              )}
                            </div>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              View Payload
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent className="mt-3">
                          <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
