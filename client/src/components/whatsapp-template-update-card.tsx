import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LeadUpdate, WhatsAppTemplateSendInfo } from "@shared/schema";

export interface ParsedWhatsAppTemplateUpdate {
  template: WhatsAppTemplateSendInfo;
}

export function parseTemplateFromUpdate(
  update: Pick<LeadUpdate, "update_via" | "whatsapp_template">,
): ParsedWhatsAppTemplateUpdate | null {
  if (update.update_via !== "whatsapp_outgoing") return null;
  if (!update.whatsapp_template) return null;
  return { template: update.whatsapp_template };
}

interface WhatsAppTemplateUpdateCardProps {
  template: WhatsAppTemplateSendInfo;
  variant?: "compact" | "full";
}

export function WhatsAppTemplateUpdateCard({
  template,
  variant = "full",
}: WhatsAppTemplateUpdateCardProps) {
  const compact = variant === "compact";
  return (
    <div
      className="rounded-md border bg-muted/40 p-2.5 space-y-2"
      data-testid={`whatsapp-template-card-${template.name}`}
    >
      <div className="flex items-start gap-2 flex-wrap">
        <FileText className="h-3.5 w-3.5 mt-0.5 text-green-600 shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <Badge variant="secondary" className="font-mono text-[11px]">
            {template.name}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {template.language}
          </Badge>
          {template.call_response_label && (
            <Badge variant="outline" className="text-[11px]">
              {template.call_response_label}
            </Badge>
          )}
        </div>
      </div>

      {template.variables && template.variables.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Variables
          </div>
          <ol
            className="text-xs space-y-0.5 list-decimal list-inside"
            data-testid={`whatsapp-template-vars-${template.name}`}
          >
            {template.variables.map((value, idx) => (
              <li key={idx} className="text-foreground/90 break-words">
                <span className="text-muted-foreground mr-1">{`{{${idx + 1}}}`}</span>
                {value || <span className="italic text-muted-foreground">(empty)</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!compact && template.body && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </div>
          <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">
            {template.body}
          </p>
        </div>
      )}
    </div>
  );
}
