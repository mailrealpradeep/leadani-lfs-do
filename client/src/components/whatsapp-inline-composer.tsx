import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface OptionsResponse {
  options: SendOption[];
  templates: TemplateOption[];
  session_lookup_status?: "ok" | "failed";
  context: {
    company_name: string;
    lead_id: string;
    executive_name: string;
  };
}

export interface SendWhatsAppPayload {
  call_response: string;
  send_from_phone: string;
  recipient_phone: string;
  message_text: string;
  template_variables?: string[];
}

export interface OptimisticSendMeta {
  bodyText: string;
  messageType: "text" | "template";
  recipientPhone: string;
  displayPhoneNumber: string;
  payload: SendWhatsAppPayload;
}

interface WhatsAppInlineComposerProps {
  leadId: string;
  customerName: string;
  recipientPhone: string;
  onOptimisticAdd?: (tempId: string, meta: OptimisticSendMeta) => void;
  onOptimisticResolve?: (tempId: string) => void;
  onOptimisticFail?: (tempId: string, errorText: string) => void;
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

export function WhatsAppInlineComposer({
  leadId,
  customerName,
  recipientPhone,
  onOptimisticAdd,
  onOptimisticResolve,
  onOptimisticFail,
}: WhatsAppInlineComposerProps) {
  const { toast } = useToast();
  const [callResponse, setCallResponse] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [sendFromPhone, setSendFromPhone] = useState<string>("");
  const [touched, setTouched] = useState(false);
  const [templateVars, setTemplateVars] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery<OptionsResponse>({
    queryKey: ["/api/leads", leadId, "send-whatsapp/options"],
    enabled: !!leadId,
  });

  const enabledTemplates = useMemo(
    () => (data?.templates || []).filter((t) => t.enabled),
    [data]
  );

  // Default sender to lead owner
  useEffect(() => {
    if (!data || sendFromPhone) return;
    if (data.options.length > 0) {
      const owner = data.options.find((o) => o.is_lead_owner) || data.options[0];
      setSendFromPhone(owner.display_phone_number);
    }
  }, [data, sendFromPhone]);

  // Default template to first enabled freeform, else first enabled approved
  useEffect(() => {
    if (!enabledTemplates.length || callResponse) return;
    const freeform = enabledTemplates.find((t) => t.template_type === "freeform");
    setCallResponse((freeform || enabledTemplates[0]).call_response);
  }, [enabledTemplates, callResponse]);

  const selectedTemplate = useMemo(
    () => enabledTemplates.find((t) => t.call_response === callResponse) || null,
    [enabledTemplates, callResponse]
  );

  // Prefill message body and template vars when template changes (only if user hasn't edited)
  useEffect(() => {
    if (!selectedTemplate || !data) return;
    const vars = {
      customer_name: customerName || "",
      executive_name: data.context.executive_name || "",
      company_name: data.context.company_name || "",
      lead_id: data.context.lead_id || "",
    };
    if (!touched) {
      const source =
        selectedTemplate.body_text ||
        (selectedTemplate.template_type === "approved" && selectedTemplate.approved_template_name
          ? `[Approved Template: ${selectedTemplate.approved_template_name}]`
          : "");
      setMessageText(applyPlaceholders(source, vars));
    }
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
      for (let i = 0; i < count; i++) next.push(defaults[i] ?? "");
      setTemplateVars(next);
    } else {
      setTemplateVars([]);
    }
  }, [selectedTemplate, data, customerName, touched]);

  const selectedSenderOption = useMemo(
    () => (data?.options || []).find((o) => o.display_phone_number === sendFromPhone) || null,
    [data, sendFromPhone],
  );

  const sessionInfo = useMemo(() => {
    if (!selectedSenderOption) return { state: "unknown" as const };
    if (data?.session_lookup_status === "failed") return { state: "unknown" as const };
    const ts = selectedSenderOption.last_incoming_at;
    if (!ts) return { state: "closed" as const };
    const last = new Date(ts).getTime();
    const diffMs = Date.now() - last;
    const windowMs = 24 * 60 * 60 * 1000;
    if (diffMs >= windowMs) return { state: "closed" as const };
    const remainingMs = windowMs - diffMs;
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    return { state: "open" as const, hours, minutes };
  }, [selectedSenderOption, data?.session_lookup_status]);

  const isApprovedTemplate = selectedTemplate?.template_type === "approved";
  const sessionClosedForFreeform =
    !isApprovedTemplate && !!selectedTemplate && sessionInfo.state === "closed";

  const tempIdRef = useRef<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload: SendWhatsAppPayload = {
        call_response: callResponse,
        send_from_phone: sendFromPhone,
        recipient_phone: recipientPhone,
        message_text: messageText,
        ...(isApprovedTemplate ? { template_variables: templateVars } : {}),
      };
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      tempIdRef.current = tempId;
      onOptimisticAdd?.(tempId, {
        bodyText: messageText,
        messageType: isApprovedTemplate ? "template" : "text",
        recipientPhone,
        displayPhoneNumber: sendFromPhone,
        payload,
      });
      // Clear composer immediately so the user can prep their next reply.
      setMessageText("");
      setTouched(false);
      return await apiRequest("POST", `/api/leads/${leadId}/send-whatsapp`, payload);
    },
    onSuccess: () => {
      const tempId = tempIdRef.current;
      tempIdRef.current = null;
      // When wired to optimistic UI, the parent waits for the messages
      // refetch before clearing the pending bubble (avoids a flash of
      // disappearance). Without optimistic UI, fall back to invalidating.
      if (tempId && onOptimisticResolve) {
        onOptimisticResolve(tempId);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "whatsapp-messages"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "send-whatsapp/options"] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Could not send WhatsApp message";
      const tempId = tempIdRef.current;
      tempIdRef.current = null;
      if (tempId) {
        onOptimisticFail?.(tempId, message);
      } else {
        toast({
          title: "Failed to send",
          description: message,
          variant: "destructive",
        });
      }
    },
  });

  const canSend =
    !sendMutation.isPending &&
    !!callResponse &&
    !!sendFromPhone &&
    !!recipientPhone &&
    !!selectedTemplate?.enabled &&
    !!messageText.trim() &&
    !sessionClosedForFreeform;

  if (isLoading) {
    return (
      <div className="mt-3 rounded-lg border bg-muted/20 p-3 flex items-center justify-center" data-testid="composer-loading">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="mt-3" data-testid="composer-error">
        <AlertDescription className="text-xs">Could not load reply options.</AlertDescription>
      </Alert>
    );
  }

  if (enabledTemplates.length === 0) {
    return (
      <Alert className="mt-3" data-testid="composer-no-templates">
        <AlertDescription className="text-xs">
          No message templates configured. Ask an admin to set them up under WhatsApp Lead Settings.
        </AlertDescription>
      </Alert>
    );
  }

  if ((data.options || []).length === 0) {
    return (
      <Alert variant="destructive" className="mt-3" data-testid="composer-no-sender">
        <AlertDescription className="text-xs">
          No connected WhatsApp Business number available to send from.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-2" data-testid="composer-whatsapp-reply">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs text-muted-foreground">Reply as</Label>
        <Select
          value={callResponse}
          onValueChange={(v) => {
            setCallResponse(v);
            setTouched(false);
          }}
        >
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs" data-testid="select-composer-call-response">
            <SelectValue placeholder="Template" />
          </SelectTrigger>
          <SelectContent>
            {enabledTemplates.map((t) => (
              <SelectItem
                key={t.call_response}
                value={t.call_response}
                data-testid={`option-composer-call-response-${t.call_response}`}
              >
                {t.label}
                {t.template_type === "approved" ? (
                  <Badge variant="secondary" className="ml-2">Approved</Badge>
                ) : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sessionInfo.state === "open" ? (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200 text-[10px] h-5"
            data-testid="badge-composer-session-open"
          >
            Session open · {sessionInfo.hours}h {sessionInfo.minutes}m left
          </Badge>
        ) : sessionInfo.state === "closed" ? (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 text-[10px] h-5"
            data-testid="badge-composer-session-closed"
          >
            Session closed
          </Badge>
        ) : null}
      </div>

      {data.options.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">From</Label>
          <Select value={sendFromPhone} onValueChange={setSendFromPhone}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-composer-send-from">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.options.map((o) => (
                <SelectItem
                  key={o.display_phone_number}
                  value={o.display_phone_number}
                  data-testid={`option-composer-send-from-${o.display_phone_number}`}
                >
                  {o.display_phone_number}
                  {o.user_name ? ` — ${o.user_name}` : ""}
                  {o.is_lead_owner ? " (Lead Owner)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isApprovedTemplate && templateVars.length > 0 && (
        <div className="space-y-1.5" data-testid="composer-template-vars">
          {templateVars.map((v, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground w-8 shrink-0">
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
                className="flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                data-testid={`input-composer-template-var-${idx}`}
              />
            </div>
          ))}
        </div>
      )}

      <Textarea
        rows={3}
        value={messageText}
        onChange={(e) => {
          setMessageText(e.target.value);
          setTouched(true);
        }}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.shiftKey &&
            !e.altKey &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.nativeEvent.isComposing
          ) {
            e.preventDefault();
            if (canSend) {
              sendMutation.mutate();
            }
          }
        }}
        placeholder={
          isApprovedTemplate
            ? "Recorded body text (Meta uses the approved template)"
            : "Type your reply…  (Enter to send, Shift+Enter for newline)"
        }
        className="text-sm resize-none"
        data-testid="textarea-composer-message"
      />

      {sessionClosedForFreeform && (
        <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="composer-session-warning">
          24-hour session is closed. Pick an approved template to send.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => sendMutation.mutate()}
          disabled={!canSend}
          className="bg-green-600 hover:bg-green-700 text-white"
          data-testid="button-composer-send"
        >
          {sendMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
