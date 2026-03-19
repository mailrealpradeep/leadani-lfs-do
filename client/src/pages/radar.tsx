import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Radar as RadarIcon, Trash2, Pencil, Check, X, Phone, MapPin, Calendar, Building2, Zap, ArrowRight, Loader2 } from "lucide-react";
import type { RadarLeadWithLead } from "@shared/schema";

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface EditState {
  current_status: string;
  next_step: string;
  expected_closure_date: string;
  site_visit_date: string;
  office_visit_date: string;
  project_details: string;
}

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

  const handleSave = () => {
    updateMutation.mutate(editState);
  };

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

  return (
    <Card data-testid={`card-radar-${lead.id}`} className="flex flex-col gap-0">
      {/* Card Header */}
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between gap-2 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <CardTitle className="text-base font-semibold truncate" data-testid={`text-radar-name-${lead.id}`}>
            {lead.lead_name}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {lead.lead_mobile && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-radar-mobile-${lead.id}`}>
                <Phone className="h-3 w-3" />
                {lead.lead_mobile}
              </span>
            )}
            <Badge variant="secondary" className="text-xs">{lead.sheet_name}</Badge>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
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
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(lead.id)}
                  data-testid={`button-radar-delete-${lead.id}`}
                  title="Remove from Radar"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 flex flex-col gap-3">
        {/* Current Status */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" /> Current Status
          </Label>
          {editing ? (
            <Input
              value={editState.current_status}
              onChange={e => setEditState(s => ({ ...s, current_status: e.target.value }))}
              placeholder="e.g. Site visit done, negotiation ongoing"
              data-testid={`input-radar-status-${lead.id}`}
              className="text-sm"
            />
          ) : (
            <p className="text-sm" data-testid={`text-radar-status-${lead.id}`}>
              {lead.current_status || <span className="text-muted-foreground italic">Not set</span>}
            </p>
          )}
        </div>

        {/* Next Step */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Next Step
          </Label>
          {editing ? (
            <Input
              value={editState.next_step}
              onChange={e => setEditState(s => ({ ...s, next_step: e.target.value }))}
              placeholder="e.g. Send revised quote by Monday"
              data-testid={`input-radar-nextstep-${lead.id}`}
              className="text-sm"
            />
          ) : (
            <p className="text-sm" data-testid={`text-radar-nextstep-${lead.id}`}>
              {lead.next_step || <span className="text-muted-foreground italic">Not set</span>}
            </p>
          )}
        </div>

        {/* Date fields */}
        <div className="grid grid-cols-3 gap-2">
          {/* Expected Closure */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Closure Date
            </Label>
            {editing ? (
              <Input
                type="date"
                value={editState.expected_closure_date}
                onChange={e => setEditState(s => ({ ...s, expected_closure_date: e.target.value }))}
                data-testid={`input-radar-closure-${lead.id}`}
                className="text-xs"
              />
            ) : (
              <p className="text-xs" data-testid={`text-radar-closure-${lead.id}`}>
                {formatDate(lead.expected_closure_date)}
              </p>
            )}
          </div>

          {/* Site Visit */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Site Visit
            </Label>
            {editing ? (
              <Input
                type="date"
                value={editState.site_visit_date}
                onChange={e => setEditState(s => ({ ...s, site_visit_date: e.target.value }))}
                data-testid={`input-radar-sitevisit-${lead.id}`}
                className="text-xs"
              />
            ) : (
              <p className="text-xs" data-testid={`text-radar-sitevisit-${lead.id}`}>
                {formatDate(lead.site_visit_date)}
              </p>
            )}
          </div>

          {/* Office Visit */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Office Visit
            </Label>
            {editing ? (
              <Input
                type="date"
                value={editState.office_visit_date}
                onChange={e => setEditState(s => ({ ...s, office_visit_date: e.target.value }))}
                data-testid={`input-radar-officevisit-${lead.id}`}
                className="text-xs"
              />
            ) : (
              <p className="text-xs" data-testid={`text-radar-officevisit-${lead.id}`}>
                {formatDate(lead.office_visit_date)}
              </p>
            )}
          </div>
        </div>

        {/* Project Details */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Project Details</Label>
          {editing ? (
            <Textarea
              value={editState.project_details}
              onChange={e => setEditState(s => ({ ...s, project_details: e.target.value }))}
              placeholder="Budget, unit type, specific requirements..."
              rows={3}
              data-testid={`textarea-radar-details-${lead.id}`}
              className="text-sm resize-none"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap" data-testid={`text-radar-details-${lead.id}`}>
              {lead.project_details || <span className="text-muted-foreground italic">Not set</span>}
            </p>
          )}
        </div>

        {/* Footer meta */}
        <div className="pt-1 border-t flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">
            Added by <span className="font-medium">{lead.added_by_name}</span>
          </span>
          <span className="text-xs text-muted-foreground">
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
      {/* Header */}
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
