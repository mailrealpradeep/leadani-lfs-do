import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LeadUpdateDialog } from "@/components/lead-update-dialog";
import { LeadUpdateHistoryDialog } from "@/components/lead-update-history-dialog";
import {
  Radar as RadarIcon, Trash2, Pencil, Check, X,
  Phone, MapPin, Building2, Zap, ArrowRight,
  Loader2, FileText, User, MessageSquarePlus, History,
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
  site_visit_date: string;
  office_visit_date: string;
  project_details: string;
}

function RadarCard({
  lead,
  isAdmin,
  onDelete,
  siteVisitByKey,
}: {
  lead: RadarLeadWithLead;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  siteVisitByKey: string | null;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editState, setEditState] = useState<EditState>({
    current_status: lead.current_status || "",
    next_step: lead.next_step || "",
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
      site_visit_date: lead.site_visit_date || "",
      office_visit_date: lead.office_visit_date || "",
      project_details: lead.project_details || "",
    });
    setEditing(false);
  };

  const siteVisitByValue: string = siteVisitByKey
    ? (lead.lead_custom_fields?.[siteVisitByKey] as string) || ""
    : "";

  return (
    <>
      <Card
        data-testid={`card-radar-${lead.id}`}
        className="flex flex-col overflow-hidden relative gap-0"
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary z-10 pointer-events-none" />

        {/* ── Header ── */}
        <div className="pl-4 pr-2 pt-3 pb-2 flex flex-row items-start justify-between gap-1">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold dark:bg-primary/35 dark:text-primary-foreground">
                {getInitials(lead.lead_name || "?")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span
                className="text-xs font-bold leading-tight text-foreground"
                data-testid={`text-radar-name-${lead.id}`}
              >
                {lead.lead_name}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {lead.lead_mobile && (
                  <span
                    className="flex items-center gap-0.5 text-[10px] text-muted-foreground"
                    data-testid={`text-radar-mobile-${lead.id}`}
                  >
                    <Phone className="h-2.5 w-2.5 shrink-0" />
                    {lead.lead_mobile}
                  </span>
                )}
                <Badge variant="secondary" className="text-[9px] py-0 px-1 h-3.5">
                  {lead.sheet_name}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action buttons — update/history for all; edit/delete for admins */}
          <div className="flex items-center gap-0 shrink-0">
            {editing ? (
              <>
                <Button size="icon" variant="ghost" onClick={handleSave} disabled={updateMutation.isPending} data-testid={`button-radar-save-${lead.id}`} title="Save">
                  {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-500" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancel} disabled={updateMutation.isPending} data-testid={`button-radar-cancel-${lead.id}`} title="Cancel">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </>
            ) : (
              <>
                <Button size="icon" variant="ghost" onClick={() => setUpdateOpen(true)} data-testid={`button-radar-addupdate-${lead.id}`} title="Add Update">
                  <MessageSquarePlus className="h-3 w-3 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setHistoryOpen(true)} data-testid={`button-radar-history-${lead.id}`} title="View History">
                  <History className="h-3 w-3 text-muted-foreground" />
                </Button>
                {isAdmin && (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(true)} data-testid={`button-radar-edit-${lead.id}`} title="Edit">
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(lead.id)} data-testid={`button-radar-delete-${lead.id}`} title="Remove from Radar">
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <CardContent className="pl-4 pr-3 pb-3 pt-0 flex flex-col gap-2">

          {/* Current Status */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" /> Status
            </span>
            {editing ? (
              <Input
                value={editState.current_status}
                onChange={e => setEditState(s => ({ ...s, current_status: e.target.value }))}
                placeholder="e.g. Site visit done, negotiation ongoing"
                data-testid={`input-radar-status-${lead.id}`}
                className="text-xs h-7"
              />
            ) : lead.current_status ? (
              <span
                className="inline-flex self-start items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium
                  bg-amber-500/15 text-amber-700 border border-amber-300
                  dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-600/70"
                data-testid={`text-radar-status-${lead.id}`}
              >
                {lead.current_status}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground italic" data-testid={`text-radar-status-${lead.id}`}>Not set</span>
            )}
          </div>

          {/* Next Step */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
              <ArrowRight className="h-2.5 w-2.5" /> Next Step
            </span>
            {editing ? (
              <Input
                value={editState.next_step}
                onChange={e => setEditState(s => ({ ...s, next_step: e.target.value }))}
                placeholder="e.g. Send revised quote by Monday"
                data-testid={`input-radar-nextstep-${lead.id}`}
                className="text-xs h-7"
              />
            ) : lead.next_step ? (
              <div
                className="flex items-start gap-1.5 rounded-md px-2 py-1.5
                  bg-muted/80 border border-border
                  dark:bg-muted/60 dark:border-border/80"
                data-testid={`text-radar-nextstep-${lead.id}`}
              >
                <ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span className="text-[11px] text-foreground leading-snug">{lead.next_step}</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground italic" data-testid={`text-radar-nextstep-${lead.id}`}>Not set</span>
            )}
          </div>

          {/* Key dates + Site Visit By */}
          {editing ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Key Dates</span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[9px] text-muted-foreground flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> Site Visit</Label>
                  <Input type="date" value={editState.site_visit_date} onChange={e => setEditState(s => ({ ...s, site_visit_date: e.target.value }))} data-testid={`input-radar-sitevisit-${lead.id}`} className="text-[10px] h-7" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[9px] text-muted-foreground flex items-center gap-1"><Building2 className="h-2.5 w-2.5" /> Office Visit</Label>
                  <Input type="date" value={editState.office_visit_date} onChange={e => setEditState(s => ({ ...s, office_visit_date: e.target.value }))} data-testid={`input-radar-officevisit-${lead.id}`} className="text-[10px] h-7" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Key Info</span>
              <div className="flex flex-wrap gap-1">
                {/* Site Visit By - from custom column */}
                {siteVisitByKey !== null && (
                  <div
                    data-testid={`text-radar-sitevisitby-${lead.id}`}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] border transition-colors ${
                      siteVisitByValue
                        ? "bg-primary/15 border-primary/40 text-primary dark:bg-primary/30 dark:border-primary/60 dark:text-primary-foreground"
                        : "bg-muted/70 border-border text-muted-foreground dark:bg-muted/50 dark:border-border/80"
                    }`}
                  >
                    <User className="h-2.5 w-2.5 shrink-0" />
                    <span className="font-medium">Visit By</span>
                    <span className={siteVisitByValue ? "font-semibold" : "opacity-60"}>
                      {siteVisitByValue || "—"}
                    </span>
                  </div>
                )}
                {/* Site Visit date */}
                {(() => {
                  const isSet = !!lead.site_visit_date;
                  return (
                    <div
                      data-testid={`text-radar-sitevisit-${lead.id}`}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] border transition-colors ${
                        isSet
                          ? "bg-primary/15 border-primary/40 text-primary dark:bg-primary/30 dark:border-primary/60 dark:text-primary-foreground"
                          : "bg-muted/70 border-border text-muted-foreground dark:bg-muted/50 dark:border-border/80"
                      }`}
                    >
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span className="font-medium">Site</span>
                      <span className={isSet ? "font-semibold" : "opacity-60"}>{formatDate(lead.site_visit_date)}</span>
                    </div>
                  );
                })()}
                {/* Office Visit date */}
                {(() => {
                  const isSet = !!lead.office_visit_date;
                  return (
                    <div
                      data-testid={`text-radar-officevisit-${lead.id}`}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] border transition-colors ${
                        isSet
                          ? "bg-primary/15 border-primary/40 text-primary dark:bg-primary/30 dark:border-primary/60 dark:text-primary-foreground"
                          : "bg-muted/70 border-border text-muted-foreground dark:bg-muted/50 dark:border-border/80"
                      }`}
                    >
                      <Building2 className="h-2.5 w-2.5 shrink-0" />
                      <span className="font-medium">Office</span>
                      <span className={isSet ? "font-semibold" : "opacity-60"}>{formatDate(lead.office_visit_date)}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Project Details */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
              <FileText className="h-2.5 w-2.5" /> Project Details
            </span>
            {editing ? (
              <Textarea
                value={editState.project_details}
                onChange={e => setEditState(s => ({ ...s, project_details: e.target.value }))}
                placeholder="Budget, unit type, specific requirements..."
                rows={2}
                data-testid={`textarea-radar-details-${lead.id}`}
                className="text-xs resize-none"
              />
            ) : lead.project_details ? (
              <div
                className="rounded-md px-2.5 py-2
                  bg-muted/70 border border-border
                  dark:bg-muted/50 dark:border-border/80"
                data-testid={`text-radar-details-${lead.id}`}
              >
                <p className="text-[11px] whitespace-pre-wrap text-foreground leading-relaxed">{lead.project_details}</p>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground italic" data-testid={`text-radar-details-${lead.id}`}>Not set</span>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Lead Update Dialog */}
      <LeadUpdateDialog
        leadId={lead.lead_id}
        sheetId={lead.sheet_id}
        open={updateOpen}
        onOpenChange={setUpdateOpen}
      />

      {/* Lead Update History Dialog */}
      <LeadUpdateHistoryDialog
        leadId={lead.lead_id}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}

export default function RadarPage() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const isAdmin = isCompanyAdmin || isSuperAdmin;
  const [selectedSheet, setSelectedSheet] = useState<string>("all");

  const { data: radarLeads = [], isLoading } = useQuery<RadarLeadWithLead[]>({
    queryKey: ["/api/radar"],
  });

  const { data: companyColumns = [] } = useQuery<any[]>({
    queryKey: ["/api/company/columns"],
  });

  const siteVisitByKey = useMemo<string | null>(() => {
    if (!Array.isArray(companyColumns) || companyColumns.length === 0) return null;
    const col = companyColumns.find((c: any) =>
      c.name?.toLowerCase().trim() === "site visit by"
    );
    return col ? col.column_key : null;
  }, [companyColumns]);

  const sheetOptions = useMemo(() => {
    const names = [...new Set(radarLeads.map(l => l.sheet_name).filter(Boolean))].sort();
    return names;
  }, [radarLeads]);

  const filteredLeads = useMemo(() => {
    if (selectedSheet === "all") return radarLeads;
    return radarLeads.filter(l => l.sheet_name === selectedSheet);
  }, [radarLeads, selectedSheet]);

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
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <RadarIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold leading-none">Radar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Close-monitor leads for quick review</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {sheetOptions.length > 0 && (
            <Select value={selectedSheet} onValueChange={setSelectedSheet}>
              <SelectTrigger className="h-8 text-xs w-44" data-testid="select-radar-sheet-filter">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {sheetOptions.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Badge variant="secondary" data-testid="badge-radar-count">
              {filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4">
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
                <p className="text-sm text-muted-foreground mt-1">Right-click any lead in the spreadsheet and choose "Add to Radar"</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Admins can add leads to Radar from the spreadsheet view</p>
              )}
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <p className="text-sm text-muted-foreground">No leads for <span className="font-medium">{selectedSheet}</span></p>
            <Button variant="outline" size="sm" onClick={() => setSelectedSheet("all")}>Clear filter</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredLeads.map(lead => (
              <RadarCard
                key={lead.id}
                lead={lead}
                isAdmin={isAdmin}
                onDelete={(id) => deleteMutation.mutate(id)}
                siteVisitByKey={siteVisitByKey}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
