import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2, MessageCircle, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SendOption {
  display_phone_number: string;
  user_id: string;
  user_name: string | null;
  is_lead_owner: boolean;
  last_incoming_at: string | null;
}

interface TemplateOption {
  call_response: string;
  label: string;
  template_type: "freeform" | "approved";
  body_text: string;
  approved_template_name: string;
  approved_template_language: string;
  approved_template_variables: string[];
  approved_template_variable_count: number | null;
  enabled: boolean;
}

interface SendWhatsAppOptionsResponse {
  options: SendOption[];
  templates: TemplateOption[];
  session_lookup_status?: "ok" | "failed";
  context: {
    company_name: string;
    lead_id: string;
    executive_name: string;
  };
}

interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  customerName: string;
  recipientPhone: string;
}

function applyPlaceholders(
  text: string,
  vars: { customer_name: string; executive_name: string; company_name: string; lead_id: string }
): string {
  return text
    .replace(/\{customer_name\}/g, vars.customer_name)
    .replace(/\{executive_name\}/g, vars.executive_name)
    .replace(/\{company_name\}/g, vars.company_name)
    .replace(/\{lead_id\}/g, vars.lead_id);
}

export function SendWhatsAppDialog({
  open,
  onOpenChange,
  leadId,
  customerName,
  recipientPhone,
}: SendWhatsAppDialogProps) {
  const { toast } = useToast();
  const [callResponse, setCallResponse] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [sendFromPhone, setSendFromPhone] = useState<string>("");
  const [touched, setTouched] = useState(false);
  const [templateVars, setTemplateVars] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery<SendWhatsAppOptionsResponse>({
    queryKey: ["/api/leads", leadId, "send-whatsapp/options"],
    enabled: open && !!leadId,
  });

  // Default sendFromPhone to lead owner's number when data arrives
  useEffect(() => {
    if (!data || !open) return;
    if (!sendFromPhone && data.options.length > 0) {
      const owner = data.options.find((o) => o.is_lead_owner) || data.options[0];
      setSendFromPhone(owner.display_phone_number);
    }
  }, [data, open, sendFromPhone]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setCallResponse("");
      setMessageText("");
      setSendFromPhone("");
      setTouched(false);
      setTemplateVars([]);
    }
  }, [open]);

  const enabledTemplates = useMemo(
    () => (data?.templates || []).filter((t) => t.enabled),
    [data]
  );

  const selectedTemplate = useMemo(
    () => enabledTemplates.find((t) => t.call_response === callResponse) || null,
    [enabledTemplates, callResponse]
  );

  // When call-response changes, prefill (only if user hasn't typed yet)
  useEffect(() => {
    if (!selectedTemplate || !data) return;
    const vars = {
      customer_name: customerName || "",
      executive_name: data.context.executive_name || "",
      company_name: data.context.company_name || "",
      lead_id: data.context.lead_id || "",
    };
    if (!touched) {
      const source = selectedTemplate.body_text
        || (selectedTemplate.template_type === "approved" && selectedTemplate.approved_template_name
          ? `[Approved Template: ${selectedTemplate.approved_template_name}]`
          : "");
      setMessageText(applyPlaceholders(source, vars));
    }
    // Always re-seed template variables when the selected template changes
    if (selectedTemplate.template_type === "approved") {
      const defaults = (selectedTemplate.approved_template_variables || []).map((v) =>
        applyPlaceholders(v, vars)
      );
      const configuredCount = selectedTemplate.approved_template_variable_count;
      const count = Math.max(
        typeof configuredCount === "number" ? configuredCount : 0,
        defaults.length,
      );
      const next: string[] = [];
      for (let i = 0; i < count; i++) {
        next.push(defaults[i] ?? "");
      }
      setTemplateVars(next);
    } else {
      setTemplateVars([]);
    }
  }, [selectedTemplate, data, customerName, touched]);

  // Selected sender option (for session-window badge)
  const selectedSenderOption = useMemo(
    () => (data?.options || []).find((o) => o.display_phone_number === sendFromPhone) || null,
    [data, sendFromPhone],
  );

  // Compute 24h session window state — degrade to "unknown" on backend lookup failure
  const sessionInfo = useMemo(() => {
    if (!selectedSenderOption) return { state: "unknown" as const };
    if (data?.session_lookup_status === "failed") return { state: "unknown" as const };
    const ts = selectedSenderOption.last_incoming_at;
    if (!ts) return { state: "closed" as const };
    const last = new Date(ts).getTime();
    const now = Date.now();
    const diffMs = now - last;
    const windowMs = 24 * 60 * 60 * 1000;
    if (diffMs >= windowMs) return { state: "closed" as const };
    const remainingMs = windowMs - diffMs;
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    const expiresAt = new Date(last + windowMs);
    return { state: "open" as const, hours, minutes, expiresAt };
  }, [selectedSenderOption, data?.session_lookup_status]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/leads/${leadId}/send-whatsapp`, {
        call_response: callResponse,
        send_from_phone: sendFromPhone,
        recipient_phone: recipientPhone,
        message_text: messageText,
        ...(selectedTemplate?.template_type === "approved"
          ? { template_variables: templateVars }
          : {}),
      });
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "WhatsApp message sent and recorded in lead history.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "updates"] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/updates`] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "whatsapp-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send",
        description: err?.message || "Could not send WhatsApp message",
        variant: "destructive",
      });
    },
  });

  const isApprovedTemplate = selectedTemplate?.template_type === "approved";
  // Only block free-form sends when the window is *known* to be closed.
  // "unknown" (lookup failure) must never disable Send.
  const sessionClosedForFreeform =
    !isApprovedTemplate && !!selectedTemplate && sessionInfo.state === "closed";
  const effectiveVarCount = isApprovedTemplate
    ? Math.max(
        selectedTemplate?.approved_template_variable_count ?? 0,
        selectedTemplate?.approved_template_variables?.length ?? 0,
      )
    : 0;
  const canSend =
    !sendMutation.isPending &&
    !!callResponse &&
    !!sendFromPhone &&
    !!recipientPhone &&
    !!selectedTemplate?.enabled &&
    !sessionClosedForFreeform;

  const openWaWeb = () => {
    const cleanNumber = String(recipientPhone).replace(/[\s-]/g, "");
    const formatted = cleanNumber.startsWith("+")
      ? cleanNumber.slice(1)
      : cleanNumber.startsWith("91")
      ? cleanNumber
      : `91${cleanNumber}`;
    const text = encodeURIComponent(messageText || "");
    window.open(`https://wa.me/${formatted}${text ? `?text=${text}` : ""}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-send-whatsapp">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Send WhatsApp
          </DialogTitle>
          <DialogDescription>
            Send a WhatsApp message from your linked Business number to this lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" data-testid="text-lead-name">
                  {customerName || "Lead"}
                </div>
                <div className="text-xs text-muted-foreground" data-testid="text-lead-phone">
                  {recipientPhone}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openWaWeb}
                data-testid="button-open-wa-web"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Open WhatsApp Web
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>Could not load send options.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Call Response</Label>
                <Select
                  value={callResponse}
                  onValueChange={(v) => {
                    setCallResponse(v);
                    setTouched(false);
                  }}
                >
                  <SelectTrigger data-testid="select-call-response">
                    <SelectValue placeholder="Select a call response..." />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledTemplates.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No templates configured. Ask an admin to set them in WhatsApp Lead Settings → Message Templates.
                      </div>
                    ) : (
                      enabledTemplates.map((t) => (
                        <SelectItem
                          key={t.call_response}
                          value={t.call_response}
                          data-testid={`option-call-response-${t.call_response}`}
                        >
                          {t.label}
                          {t.template_type === "approved" ? (
                            <Badge variant="secondary" className="ml-2">Approved</Badge>
                          ) : null}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="flex items-center gap-2 flex-wrap" data-testid="session-status">
                  <Label className="text-xs text-muted-foreground">24h Session:</Label>
                  {sessionInfo.state === "open" ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200"
                      title={`Expires ${sessionInfo.expiresAt.toLocaleString()}`}
                      data-testid="badge-session-open"
                    >
                      Open · expires in {sessionInfo.hours}h {sessionInfo.minutes}m
                    </Badge>
                  ) : sessionInfo.state === "closed" ? (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                      data-testid="badge-session-closed"
                    >
                      Closed · approved template required
                    </Badge>
                  ) : (
                    <Badge variant="outline" data-testid="badge-session-unknown">Unknown</Badge>
                  )}
                </div>
              )}

              {sessionClosedForFreeform && (
                <Alert variant="destructive" data-testid="alert-session-closed-freeform">
                  <AlertDescription className="text-sm">
                    This is a session message but the 24-hour window is closed for{" "}
                    <span className="font-mono">{sendFromPhone}</span>. Pick an approved template instead.
                  </AlertDescription>
                </Alert>
              )}

              {isApprovedTemplate && (
                <Alert>
                  <AlertDescription className="text-sm">
                    Sending Meta-approved template{" "}
                    <span className="font-mono">{selectedTemplate?.approved_template_name}</span>{" "}
                    (<span className="font-mono">{selectedTemplate?.approved_template_language || "en_US"}</span>).
                    Works outside the 24-hour window. The text below is recorded in lead history.
                    {effectiveVarCount > 0 && (
                      <>
                        {" "}This template expects{" "}
                        <span className="font-mono">{effectiveVarCount}</span>{" "}
                        body variable{effectiveVarCount === 1 ? "" : "s"}.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {isApprovedTemplate && templateVars.length > 0 && (
                <div className="space-y-2">
                  <Label>Template Variables</Label>
                  <div className="space-y-2">
                    {templateVars.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground w-10 shrink-0">
                          {`{{${idx + 1}}}`}
                        </span>
                        <input
                          type="text"
                          value={v}
                          onChange={(e) => {
                            const next = templateVars.slice();
                            next[idx] = e.target.value;
                            setTemplateVars(next);
                          }}
                          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                          data-testid={`input-template-var-${idx}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    These map positionally to <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>, … in the approved template body.
                  </div>
                </div>
              )}
              {selectedTemplate && (
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    rows={6}
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setTouched(true);
                    }}
                    placeholder="Type your message..."
                    data-testid="textarea-message"
                  />
                  <div className="text-xs text-muted-foreground">
                    Prefilled from your template. You can edit before sending. Placeholders: <code>{"{customer_name}"}</code>{" "}
                    <code>{"{executive_name}"}</code>{" "}
                    <code>{"{company_name}"}</code>{" "}
                    <code>{"{lead_id}"}</code>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Send From</Label>
                <Select value={sendFromPhone} onValueChange={setSendFromPhone}>
                  <SelectTrigger data-testid="select-send-from">
                    <SelectValue placeholder="Pick a sender number..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.options || []).length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No connected WA Business numbers found.
                      </div>
                    ) : (
                      data!.options.map((o) => (
                        <SelectItem
                          key={o.display_phone_number}
                          value={o.display_phone_number}
                          data-testid={`option-send-from-${o.display_phone_number}`}
                        >
                          {o.display_phone_number}
                          {o.user_name ? ` — ${o.user_name}` : ""}
                          {o.is_lead_owner ? " (Lead Owner)" : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-send"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => sendMutation.mutate()}
            disabled={!canSend}
            data-testid="button-send-whatsapp"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
