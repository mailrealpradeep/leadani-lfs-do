import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  MessageCircle,
  RotateCw,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
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
  /** Variable count fetched live from Meta (cached server-side ~5 min). */
  live_variable_count?: number | null;
  /** Status of the live lookup so the UI can flag drift / fallbacks. */
  live_status?: "ok" | "not_found" | "no_lookup" | "error";
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
    /**
     * Executive's allocated WhatsApp Business number from Phone Number
     * Allocations — substituted for `{executive_mobno}` in template
     * bodies. Tied to the lead owner; does NOT change when the user
     * switches the Send From dropdown.
     */
    executive_mobno: string;
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
  vars: {
    customer_name: string;
    executive_name: string;
    company_name: string;
    lead_id: string;
    executive_mobno: string;
  }
): string {
  return text
    .replace(/\{customer_name\}/g, vars.customer_name)
    .replace(/\{executive_name\}/g, vars.executive_name)
    .replace(/\{company_name\}/g, vars.company_name)
    .replace(/\{lead_id\}/g, vars.lead_id)
    .replace(/\{executive_mobno\}/g, vars.executive_mobno);
}

/**
 * Render `body` as React nodes, replacing `{{N}}` placeholders with either
 * the typed value (if non-empty) or a muted slot chip. Used both for the
 * approved-template chat-bubble preview and as a thin shell around the
 * free-form auto-grow textarea (which uses the raw text directly).
 */
function renderTemplatePreview(body: string, vars: string[]): JSX.Element[] {
  if (!body) return [];
  const parts: JSX.Element[] = [];
  const regex = /\{\{\s*(\d+)\s*\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${key++}`}>{body.slice(lastIndex, match.index)}</span>);
    }
    const idx = parseInt(match[1], 10);
    const value = vars[idx - 1];
    if (value && value.trim().length > 0) {
      parts.push(
        <span
          key={`v-${key++}`}
          className="font-medium"
          data-testid={`preview-var-filled-${idx}`}
        >
          {value}
        </span>
      );
    } else {
      parts.push(
        <span
          key={`v-${key++}`}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
          data-testid={`preview-var-empty-${idx}`}
        >
          {`{{${idx}}}`}
        </span>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < body.length) {
    parts.push(<span key={`t-${key++}`}>{body.slice(lastIndex)}</span>);
  }
  return parts;
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
  const freeformTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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
      sendMutation.reset();
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

  const isApprovedTemplate = selectedTemplate?.template_type === "approved";

  // Effective variable count: live from Meta (#88) when available, otherwise
  // the saved hint, otherwise the configured defaults length. Drives the
  // number of variable inputs rendered.
  const effectiveVarCount = useMemo(() => {
    if (!isApprovedTemplate || !selectedTemplate) return 0;
    if (
      selectedTemplate.live_status === "ok" &&
      typeof selectedTemplate.live_variable_count === "number"
    ) {
      return selectedTemplate.live_variable_count;
    }
    return Math.max(
      selectedTemplate.approved_template_variable_count ?? 0,
      selectedTemplate.approved_template_variables?.length ?? 0,
    );
  }, [isApprovedTemplate, selectedTemplate]);

  const liveVarCountAvailable =
    isApprovedTemplate && selectedTemplate?.live_status === "ok";
  const savedVarCount = selectedTemplate?.approved_template_variable_count ?? null;
  const hasVarCountDrift =
    liveVarCountAvailable &&
    typeof savedVarCount === "number" &&
    savedVarCount !== effectiveVarCount;

  // When call-response changes, prefill (only if user hasn't typed yet)
  useEffect(() => {
    if (!selectedTemplate || !data) return;
    const vars = {
      customer_name: customerName || "",
      executive_name: data.context.executive_name || "",
      company_name: data.context.company_name || "",
      lead_id: data.context.lead_id || "",
      executive_mobno: data.context.executive_mobno || "",
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
      const next: string[] = [];
      for (let i = 0; i < effectiveVarCount; i++) {
        next.push(defaults[i] ?? "");
      }
      setTemplateVars(next);
    } else {
      setTemplateVars([]);
    }
  }, [selectedTemplate, data, customerName, touched, effectiveVarCount]);

  // Auto-grow the freeform textarea (2 rows min, ~5 rows cap).
  useEffect(() => {
    const el = freeformTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20; // matches text-sm
    const max = lineHeight * 5 + 16;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, [messageText, isApprovedTemplate, selectedTemplate]);

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

  const sendErrorMessage =
    sendMutation.isError && !sendMutation.isPending
      ? sendMutation.error instanceof Error && sendMutation.error.message
        ? sendMutation.error.message
        : "Could not send WhatsApp message"
      : null;

  // Only block free-form sends when the window is *known* to be closed.
  // "unknown" (lookup failure) must never disable Send.
  const sessionClosedForFreeform =
    !isApprovedTemplate && !!selectedTemplate && sessionInfo.state === "closed";
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

  // Single-sender shortcut: when only one sender is connected, hoist it into
  // the header row as a read-only chip and skip the bottom Select entirely.
  const hasSingleSender = (data?.options.length ?? 0) === 1;
  const singleSenderPhone = hasSingleSender ? data!.options[0].display_phone_number : null;

  // Resolve preview body for approved templates: prefer the saved body_text
  // (with placeholders substituted), else fall back to a synthetic body
  // so the executive can still see N {{N}} chips.
  const previewVars = data
    ? {
        customer_name: customerName || "",
        executive_name: data.context.executive_name || "",
        company_name: data.context.company_name || "",
        lead_id: data.context.lead_id || "",
        executive_mobno: data.context.executive_mobno || "",
      }
    : { customer_name: customerName || "", executive_name: "", company_name: "", lead_id: "", executive_mobno: "" };
  const approvedPreviewBody = useMemo(() => {
    if (!isApprovedTemplate || !selectedTemplate) return "";
    const raw = selectedTemplate.body_text?.trim()
      ? selectedTemplate.body_text
      : Array.from({ length: effectiveVarCount }, (_, i) => `{{${i + 1}}}`).join(" ");
    return applyPlaceholders(raw, previewVars);
  }, [isApprovedTemplate, selectedTemplate, effectiveVarCount, previewVars]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-send-whatsapp">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Send WhatsApp
          </DialogTitle>
        </DialogHeader>

        {/* Compact lead row: name + phone + (sender chip if single) + WA Web icon */}
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium" data-testid="text-lead-name">
              {customerName || "Lead"}
            </div>
            <div className="truncate text-xs text-muted-foreground" data-testid="text-lead-phone">
              {recipientPhone}
              {singleSenderPhone && (
                <>
                  {" "}· From{" "}
                  <span className="font-mono" data-testid="text-single-sender">
                    {singleSenderPhone}
                  </span>
                </>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openWaWeb}
            title="Open in WhatsApp Web"
            aria-label="Open in WhatsApp Web"
            data-testid="button-open-wa-web"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
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
              {/* Call Response selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Call Response</Label>
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
                      enabledTemplates.map((t) => {
                        // Visually flag freeform options as unavailable when the
                        // session is closed for the chosen sender (#92 step 5).
                        const isFreeformDisabled =
                          t.template_type === "freeform" &&
                          !!selectedSenderOption &&
                          sessionInfo.state === "closed";
                        return (
                          <SelectItem
                            key={t.call_response}
                            value={t.call_response}
                            data-testid={`option-call-response-${t.call_response}`}
                          >
                            <span
                              className={
                                isFreeformDisabled ? "text-muted-foreground" : undefined
                              }
                            >
                              {t.label}
                            </span>
                            {t.template_type === "approved" ? (
                              <Badge variant="secondary" className="ml-2">Approved</Badge>
                            ) : isFreeformDisabled ? (
                              <Badge variant="outline" className="ml-2">Session closed</Badge>
                            ) : null}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Inline meta strip: type, language, var count, session pill */}
              {selectedTemplate && (
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  data-testid="session-status"
                >
                  <Badge variant="secondary" data-testid="badge-template-type">
                    {isApprovedTemplate ? "Approved" : "Free-form"}
                  </Badge>
                  {isApprovedTemplate && (
                    <Badge variant="outline" className="font-mono" data-testid="badge-template-lang">
                      {selectedTemplate.approved_template_language || "en_US"}
                    </Badge>
                  )}
                  {isApprovedTemplate && (
                    <Badge
                      variant="outline"
                      data-testid="badge-var-count"
                      title={
                        liveVarCountAvailable
                          ? "Variable count fetched live from Meta"
                          : selectedTemplate.live_status === "no_lookup"
                            ? "Live lookup unavailable — using saved value"
                            : "Live lookup failed — using saved value"
                      }
                    >
                      {effectiveVarCount} var{effectiveVarCount === 1 ? "" : "s"}
                      {liveVarCountAvailable ? " · live" : ""}
                    </Badge>
                  )}
                  {sessionInfo.state === "open" ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200"
                      title={`24h session expires ${sessionInfo.expiresAt.toLocaleString()}`}
                      data-testid="badge-session-open"
                    >
                      Session open · {sessionInfo.hours}h {sessionInfo.minutes}m
                    </Badge>
                  ) : sessionInfo.state === "closed" ? (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                      data-testid="badge-session-closed"
                    >
                      Session closed
                    </Badge>
                  ) : (
                    <Badge variant="outline" data-testid="badge-session-unknown">
                      Session unknown
                    </Badge>
                  )}
                </div>
              )}

              {/* Live template preview / freeform editor */}
              {selectedTemplate && (
                <div className="space-y-1">
                  <Label className="text-xs">
                    {isApprovedTemplate ? "Preview" : "Message"}
                  </Label>
                  {isApprovedTemplate ? (
                    <div
                      className="rounded-md rounded-tl-sm bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 px-3 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed min-h-[3rem]"
                      data-testid="template-preview"
                    >
                      {approvedPreviewBody
                        ? renderTemplatePreview(approvedPreviewBody, templateVars)
                        : (
                          <span className="text-muted-foreground italic">
                            No body configured for this template.
                          </span>
                        )}
                    </div>
                  ) : (
                    <Textarea
                      ref={freeformTextareaRef}
                      rows={2}
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        setTouched(true);
                      }}
                      placeholder="Type your message..."
                      className="resize-none text-sm leading-relaxed"
                      data-testid="textarea-message"
                    />
                  )}
                </div>
              )}

              {/* Variables grid */}
              {isApprovedTemplate && templateVars.length > 0 && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templateVars.map((v, idx) => (
                      <div key={idx} className="space-y-1">
                        <Label
                          className="text-[11px] font-mono text-muted-foreground"
                          htmlFor={`input-template-var-${idx}`}
                        >
                          {`{{${idx + 1}}}`}
                        </Label>
                        <input
                          id={`input-template-var-${idx}`}
                          type="text"
                          value={v}
                          onChange={(e) => {
                            const next = templateVars.slice();
                            next[idx] = e.target.value;
                            setTemplateVars(next);
                          }}
                          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                          data-testid={`input-template-var-${idx}`}
                        />
                      </div>
                    ))}
                  </div>
                  {hasVarCountDrift ? (
                    <div
                      className="flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-400"
                      data-testid="text-var-count-drift"
                    >
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        Saved as {savedVarCount}, but Meta now expects {effectiveVarCount}. Using
                        Meta's live count.
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Map positionally to the chips above.
                    </div>
                  )}
                </div>
              )}

              {/* Send From — only when ≥2 senders exist */}
              {!hasSingleSender && (data?.options.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Send From</Label>
                  <Select value={sendFromPhone} onValueChange={setSendFromPhone}>
                    <SelectTrigger data-testid="select-send-from">
                      <SelectValue placeholder="Pick a sender number..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data!.options.map((o) => (
                        <SelectItem
                          key={o.display_phone_number}
                          value={o.display_phone_number}
                          data-testid={`option-send-from-${o.display_phone_number}`}
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

              {(data?.options.length ?? 0) === 0 && (
                <div className="text-xs text-muted-foreground">
                  No connected WA Business numbers found.
                </div>
              )}
            </>
          )}

          {/* Compact failure / closed-session strip — single line above footer */}
          {sendErrorMessage && (
            <div
              className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-xs text-destructive"
              data-testid="alert-send-failed"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span
                className="flex-1 min-w-0 truncate"
                title={sendErrorMessage}
                data-testid="text-send-error-message"
              >
                {sendErrorMessage}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => sendMutation.mutate()}
                disabled={!canSend}
                data-testid="button-retry-send"
              >
                <RotateCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
          {sessionClosedForFreeform && !sendErrorMessage && (
            <div
              className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-300"
              data-testid="alert-session-closed-freeform"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 min-w-0">
                Session closed for{" "}
                <span className="font-mono">{sendFromPhone}</span> — pick an approved template.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
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
