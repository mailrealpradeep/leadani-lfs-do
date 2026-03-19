import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Radar as RadarIcon, Trash2, Pencil, Check, X,
  Phone, MapPin, Calendar, Building2, Zap, ArrowRight,
  Loader2, FileText,
} from "lucide-react";
import type { RadarLeadWithLead } from "@shared/schema";

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name: string): string {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}

interface EditState {
  current_status: string;
  next_step: string;
  expected_closure_date: string;
  site_visit_date: string;
  office_visit_date: string;
  project_details: string;
}

const DATE_FIELDS = [
  { key: "expected_closure_date" as const, label: "Closure", shortLabel: "Closure", icon: Calendar, testKey: "closure" },
  { key: "site_visit_date" as const, label: "Site Visit", shortLabel: "Site", icon: MapPin, testKey: "sitevisit" },
  { key: "office_visit_date" as const, label: "Office Visit", shortLabel: "Office", icon: Building2, testKey: "officevisit" },
];

function RadarCard({
  lead,
  isAdmin,
  onDelete,
}: {
  lead: RadarLeadWithLead;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editState, setEditState] = useState<EditState>({
    current_status: lead.current_status || "",
    next_step: lead.next_step || "",
    expected_closure_date: lead.expected_closure_date || "",
    site_visit_date: lead.site_visit_date || "",
    office_visit_date: lead.office_visit_date || "",
    project_details: lead.project_details || "",
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: EditState) =>
      apiRequest("PATCH", `/api/radar/${lead.id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/radar"] });
      setEditing(false);
      toast({ title: "Radar card updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => updateMutation.mutate(editState);

  const handleCancel = () => {
    setEditState({
      current_status: lead.current_status || "",
      next_step: lead.next_step || "",
      expected_closure_date: lead.expected_closure_date || "",
      site_visit_date: lead.site_visit_date || "",
      office_visit_date: lead.office_visit_date || "",
      project_details: lead.project_details || "",
    });
    setEditing(false);
  };

  const addedByInitials = getInitials(lead.added_by_name || "?");

  return (
    <Card
      data-testid={`card-radar-${lead.id}`}
      className="flex flex-col overflow-hidden relative gap-0"
    >
      {/* Colored left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary z-10 pointer-events-none" />

      {/* ── Header ── */}
      <div className="pl-5 pr-3 pt-4 pb-3 flex flex-row items-start justify-between gap-2">
        {/* Avatar + name/phone */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold dark:bg-primary/25 dark:text-primary-foreground/90">
              {getInitials(lead.lead_name || "?")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1 pt-0.5">
            <span
              className="text-sm font-bold leading-tight text-foreground"
              data-testid={`text-radar-name-${lead.id}`}
            >
              {lead.lead_name}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {lead.lead_mobile && (
                <span
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                  data-testid={`text-radar-mobile-${lead.id}`}
                >
                  <Phone className="h-3 w-3 shrink-0" />
                  {lead.lead_mobile}
                </span>
              )}
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                {lead.sheet_name}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {isAdmin && (
          <div className="flex items-center gap-0.5 shrink-0 -mr-1">
            {editing ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  data-testid={`button-radar-save-${lead.id}`}
                  title="Save changes"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                  data-testid={`button-radar-cancel-${lead.id}`}
                  title="Cancel"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                  data-testid={`button-radar-edit-${lead.id}`}
                  title="Edit Radar card"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(lead.id)}
                  data-testid={`button-radar-delete-${lead.id}`}
                  title="Remove from Radar"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <CardContent className="pl-5 pr-4 pb-4 pt-0 flex flex-col gap-3">

        {/* Current Status */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" /> Status
          </span>
          {editing ? (
            <Input
              value={editState.current_status}
              onChange={e => setEditState(s => ({ ...s, current_status: e.target.value }))}
              placeholder="e.g. Site visit done, negotiation ongoing"
              data-testid={`input-radar-status-${lead.id}`}
              className="text-sm"
            />
          ) : lead.current_status ? (
            <span
              className="inline-flex self-start items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
              data-testid={`text-radar-status-${lead.id}`}
            >
              {lead.current_status}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic" data-testid={`text-radar-status-${lead.id}`}>
              Not set
            </span>
          )}
        </div>

        {/* Next Step */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Next Step
          </span>
          {editing ? (
            <Input
              value={editState.next_step}
              onChange={e => setEditState(s => ({ ...s, next_step: e.target.value }))}
              placeholder="e.g. Send revised quote by Monday"
              data-testid={`input-radar-nextstep-${lead.id}`}
              className="text-sm"
            />
          ) : lead.next_step ? (
            <div
              className="flex items-start gap-2 rounded-md bg-muted/70 border border-border/60 px-3 py-2 dark:bg-muted/30"
              data-testid={`text-radar-nextstep-${lead.id}`}
            >
              <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-foreground leading-snug">{lead.next_step}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic" data-testid={`text-radar-nextstep-${lead.id}`}>
              Not set
            </span>
          )}
        </div>

        {/* Date fields */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Key Dates</span>
            {DATE_FIELDS.map(({ key, label, icon: Icon, testKey }) => (
              <div key={key} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Icon className="h-3 w-3" /> {label}
                </Label>
                <Input
                  type="date"
                  value={editState[key]}
                  onChange={e => setEditState(s => ({ ...s, [key]: e.target.value }))}
                  data-testid={`input-radar-${testKey}-${lead.id}`}
                  className="text-xs"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Key Dates</span>
            <div className="flex flex-wrap gap-1.5">
              {DATE_FIELDS.map(({ key, shortLabel, icon: Icon, testKey }) => {
                const val = lead[key as keyof RadarLeadWithLead] as string | null | undefined;
                const isSet = !!val;
                return (
                  <div
                    key={key}
                    data-testid={`text-radar-${testKey}-${lead.id}`}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border transition-colors ${
                      isSet
                        ? "bg-primary/10 border-primary/25 text-primary dark:bg-primary/15 dark:border-primary/35"
                        : "bg-muted/50 border-border/50 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="font-medium">{shortLabel}</span>
                    <span className={`${isSet ? "font-semibold" : "opacity-60"}`}>
                      {formatDate(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Project Details */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" /> Project Details
          </span>
          {editing ? (
            <Textarea
              value={editState.project_details}
              onChange={e => setEditState(s => ({ ...s, project_details: e.target.value }))}
              placeholder="Budget, unit type, specific requirements..."
              rows={3}
              data-testid={`textarea-radar-details-${lead.id}`}
              className="text-sm resize-none"
            />
          ) : lead.project_details ? (
            <div
              className="rounded-md bg-muted/60 border border-border/50 px-3 py-2.5 dark:bg-muted/25"
              data-testid={`text-radar-details-${lead.id}`}
            >
              <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">{lead.project_details}</p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic" data-testid={`text-radar-details-${lead.id}`}>
              Not set
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-semibold">
                {addedByInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              Added by <span className="font-medium text-foreground/70">{lead.added_by_name}</span>
            </span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RadarPage() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const isAdmin = isCompanyAdmin || isSuperAdmin;

  const { data: radarLeads = [], isLoading } = useQuery<RadarLeadWithLead[]>({
    queryKey: ["/api/radar"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/radar/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/radar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/radar/ids"] });
      toast({ title: "Lead removed from Radar" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Page Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <RadarIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold leading-none">Radar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Close-monitor leads for quick review</p>
          </div>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant="secondary" data-testid="badge-radar-count">
            {radarLeads.length} {radarLeads.length === 1 ? "lead" : "leads"}
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading Radar...</span>
          </div>
        ) : radarLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <RadarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-muted-foreground">No leads on Radar yet</p>
              {isAdmin ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Right-click any lead in the spreadsheet and choose "Add to Radar"
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Admins can add leads to Radar from the spreadsheet view
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {radarLeads.map(lead => (
              <RadarCard
                key={lead.id}
                lead={lead}
                isAdmin={isAdmin}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
