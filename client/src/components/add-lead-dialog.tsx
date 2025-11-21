import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Lead } from "@shared/schema";

interface AddLeadDialogProps {
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ sheetId, open, onOpenChange }: AddLeadDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    mobile_no: "",
    whatsapp: "",
    address: "",
    executive: "",
    lang: "",
    occupation: "",
    qualification: "",
    age: "",
    lead_date: new Date().toISOString().split("T")[0],
    lead_time: new Date().toTimeString().slice(0, 5),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<Lead>("POST", `/api/sheets/${sheetId}/leads`, {
        ...formData,
        sheet_id: sheetId,
        owner_user_id: user?.id,
        age: formData.age ? parseInt(formData.age) : null,
        lead_status: "New",
        visit_status: "Not Visited",
        custom_fields: {},
        meta: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
      onOpenChange(false);
      setFormData({
        name: "",
        mobile_no: "",
        whatsapp: "",
        address: "",
        executive: "",
        lang: "",
        occupation: "",
        qualification: "",
        age: "",
        lead_date: new Date().toISOString().split("T")[0],
        lead_time: new Date().toTimeString().slice(0, 5),
      });
      toast({
        title: "Lead created",
        description: "Lead has been added successfully",
      });
    },
    onError: (error: any) => {
      console.error("Create lead error:", error);
      toast({
        title: "Failed to create lead",
        description: error.message || "An error occurred while creating the lead",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto w-[95vw] md:w-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter lead information. All fields are optional except name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                data-testid="input-lead-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile_no">Mobile Number</Label>
              <Input
                id="mobile_no"
                name="mobile_no"
                value={formData.mobile_no}
                onChange={handleChange}
                data-testid="input-lead-mobile"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                data-testid="input-lead-whatsapp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="executive">Executive</Label>
              <Input
                id="executive"
                name="executive"
                value={formData.executive}
                onChange={handleChange}
                data-testid="input-lead-executive"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang">Language</Label>
              <Input
                id="lang"
                name="lang"
                value={formData.lang}
                onChange={handleChange}
                data-testid="input-lead-lang"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                data-testid="input-lead-age"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                data-testid="input-lead-occupation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                data-testid="input-lead-qualification"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_date">Lead Date</Label>
              <Input
                id="lead_date"
                name="lead_date"
                type="date"
                value={formData.lead_date}
                onChange={handleChange}
                data-testid="input-lead-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_time">Lead Time</Label>
              <Input
                id="lead_time"
                name="lead_time"
                type="time"
                value={formData.lead_time}
                onChange={handleChange}
                data-testid="input-lead-time"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                data-testid="input-lead-address"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-add-lead"
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name.trim() || createMutation.isPending}
              data-testid="button-save-lead"
              className="min-h-[44px] w-full sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Lead"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
