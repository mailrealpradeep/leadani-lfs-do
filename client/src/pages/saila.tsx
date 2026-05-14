import { useState, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Settings, Phone, MessageSquare, Search, FileText, Calendar,
  Plus, Trash2, Save, Edit, Bot, ArrowRight, ArrowLeft, Eye,
  Link as LinkIcon, Image, Video, FileUp, X, Check, Clock,
  PhoneCall, User, Sparkles, AlertTriangle, CheckCircle2, XCircle,
  MinusCircle, RefreshCw, Activity, ChevronDown, ChevronRight, ChevronLeft,
  ListChecks, Pause, PlayCircle, GripVertical, Send, Megaphone, Loader2
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  SailaConfig, SailaPhoneSetting, SailaTemplate, SailaTemplateMessage,
  SailaKeyword, SailaMedia, SailaConversation, SailaConversationMessage,
  SailaBooking, SailaActivityLogEntry, SailaFixedReplyConfig,
  SailaGreetingSlot, SailaCallTimeSlot
} from "@shared/schema";

function TestSendSection() {
  const { toast } = useToast();
  const [testPhone, setTestPhone] = useState("");
  const [fromPhone, setFromPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { data: phoneSettings = [] } = useQuery<SailaPhoneSetting[]>({ queryKey: ["/api/saila/phone-settings"] });

  async function handleTestSend() {
    const phone = testPhone.trim();
    if (!phone) {
      toast({ title: "Enter a recipient phone number", variant: "destructive" });
      return;
    }
    if (!fromPhone) {
      toast({ title: "Select a business channel", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const result = await apiRequest<{ success: boolean; messageId?: string; error?: string }>(
        "POST",
        "/api/saila/test-send",
        { toPhone: phone, fromPhone }
      );
      if (result.success) {
        toast({ title: "Test message sent!", description: `Message delivered. ID: ${result.messageId || "N/A"}` });
      } else {
        toast({ title: "Send failed", description: result.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      const msg = err?.message || "Connection error";
      toast({ title: "Send failed", description: msg, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Test Wauper Connection</span>
      </div>
      <p className="text-xs text-muted-foreground">Send a test WhatsApp message to verify your channel access token and phone number ID are correct.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select value={fromPhone} onValueChange={setFromPhone}>
          <SelectTrigger data-testid="select-from-phone">
            <SelectValue placeholder="Select business channel…" />
          </SelectTrigger>
          <SelectContent>
            {phoneSettings.map(s => (
              <SelectItem key={s.id} value={s.display_phone_number}>
                {s.display_phone_number}{s.executive_name ? ` — ${s.executive_name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Recipient phone, e.g. 918249723600"
          value={testPhone}
          onChange={(e) => setTestPhone(e.target.value)}
          data-testid="input-test-phone"
        />
      </div>
      <Button
        onClick={handleTestSend}
        disabled={isSending}
        data-testid="button-test-send"
      >
        {isSending ? "Sending..." : "Send Test Message"}
      </Button>
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const { data: config } = useQuery<SailaConfig | null>({ queryKey: ["/api/saila/config"] });

  const [formData, setFormData] = useState<Partial<SailaConfig>>({});

  const currentData = { ...config, ...formData };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/saila/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/config"] });
      toast({ title: "Settings saved" });
      setFormData({});
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Saila.AI Configuration
          </CardTitle>
          <CardDescription>Configure the AI response engine for WhatsApp conversations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Saila.AI</Label>
              <p className="text-sm text-muted-foreground">Activate AI-powered WhatsApp responses</p>
            </div>
            <Switch
              checked={currentData.enabled ?? false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
              data-testid="switch-saila-enabled"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">LLM Test Mode</Label>
              <p className="text-sm text-muted-foreground">AI responses are generated &amp; saved for review but NOT sent. Keyword responses still send. Use this to calibrate AI before going live.</p>
            </div>
            <Switch
              checked={currentData.llm_test_mode ?? false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, llm_test_mode: checked }))}
              data-testid="switch-llm-test-mode"
            />
          </div>

          {(currentData.llm_test_mode) && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                Test Mode active — AI responses will NOT be sent to leads. Keyword responses still send normally.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sarvam AI API Key</Label>
              <Input
                type="password"
                placeholder="Enter Sarvam API key"
                value={currentData.sarvam_api_key || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, sarvam_api_key: e.target.value }))}
                data-testid="input-sarvam-key"
              />
            </div>
            <div className="space-y-2">
              <Label>Wauper API Key</Label>
              <Input
                type="password"
                placeholder="Enter Wauper/WATI API key"
                value={currentData.wauper_api_key || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, wauper_api_key: e.target.value }))}
                data-testid="input-wauper-key"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Wauper Domain</Label>
              <Input
                placeholder="https://live-mt-server.wati.io"
                value={currentData.wauper_domain || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, wauper_domain: e.target.value }))}
                data-testid="input-wauper-domain"
              />
            </div>
            <div className="space-y-2">
              <Label>Meta API Version</Label>
              <Input
                placeholder="v20.0"
                value={currentData.wauper_api_version || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, wauper_api_version: e.target.value }))}
                data-testid="input-wauper-version"
              />
              <p className="text-xs text-muted-foreground">Meta WhatsApp API version used by Wauper Session Messaging (e.g. v20.0). Not Wauper's own v1.</p>
            </div>
          </div>

          <TestSendSection />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Confidence Threshold (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={currentData.confidence_threshold ?? 70}
                onChange={(e) => setFormData(prev => ({ ...prev, confidence_threshold: parseInt(e.target.value) || 70 }))}
                data-testid="input-confidence-threshold"
              />
              <p className="text-xs text-muted-foreground">
                Below this score, AI sends the fallback message instead
              </p>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={currentData.language || "hindi"}
                onValueChange={(val) => setFormData(prev => ({ ...prev, language: val }))}
              >
                <SelectTrigger data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="odia">Odia</SelectItem>
                  <SelectItem value="odinglish">Odinglish (Romanized Odia)</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="hinglish">Hinglish</SelectItem>
                  <SelectItem value="telugu">Telugu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role &amp; Persona Prompt <span className="text-xs text-muted-foreground font-normal">(Block 1)</span></Label>
            <p className="text-xs text-muted-foreground">
              Describe who Saila is, what company she represents, and her goal. Use <code className="bg-muted px-1 rounded text-xs">{"{executive_name}"}</code> as a placeholder.
            </p>
            <Textarea
              placeholder="You are {executive_name}, a friendly and professional sales executive..."
              value={currentData.role_prompt || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, role_prompt: e.target.value }))}
              rows={5}
              data-testid="input-role-prompt"
            />
          </div>

          <div className="space-y-2">
            <Label>Response Instruction <span className="text-xs text-muted-foreground font-normal">(Block 4)</span></Label>
            <p className="text-xs text-muted-foreground">
              Tell Saila how to reason, what to prioritize, and how to close each response. Saila will receive your conversation scripts and full chat history before this instruction.
            </p>
            <Textarea
              placeholder="Based on the conversation scripts and history above, understand what the customer needs..."
              value={currentData.instruction_prompt || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, instruction_prompt: e.target.value }))}
              rows={4}
              data-testid="input-instruction-prompt"
            />
          </div>

          <div className="space-y-2">
            <Label>Fallback Message</Label>
            <Textarea
              placeholder="Message sent when confidence is below threshold..."
              value={currentData.fallback_message || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, fallback_message: e.target.value }))}
              rows={3}
              data-testid="input-fallback-message"
            />
          </div>

          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending || Object.keys(formData).length === 0}
            data-testid="button-save-config"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PhoneSettingsTab() {
  const { toast } = useToast();
  const { data: phoneSettings = [] } = useQuery<SailaPhoneSetting[]>({ queryKey: ["/api/saila/phone-settings"] });
  const { data: allocations = [] } = useQuery<any[]>({ queryKey: ["/api/admin/company/whatsapp/allocations"] });
  const { data: cloudConfigs = [] } = useQuery<any[]>({ queryKey: ["/api/whatsapp-cloud/config"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/saila/phone-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/phone-settings"] });
      toast({ title: "Phone setting saved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const allPhones = Array.from(new Set([
    ...allocations.map((a: any) => a.display_phone_number),
    ...(Array.isArray(cloudConfigs) ? cloudConfigs : [cloudConfigs]).filter((c: any) => c?.account_status && c.account_status !== "disconnected").map((c: any) => c.display_phone_number),
    ...phoneSettings.map(s => s.display_phone_number),
  ])).filter(Boolean);

  const getSettingForPhone = (phone: string) => phoneSettings.find(s => s.display_phone_number === phone);
  const getAllocationForPhone = (phone: string) => allocations.find((a: any) => a.display_phone_number === phone);
  const getCloudConfigForPhone = (phone: string) => (Array.isArray(cloudConfigs) ? cloudConfigs : [cloudConfigs]).find((c: any) => c?.display_phone_number === phone);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Business Number Settings
          </CardTitle>
          <CardDescription>Toggle Saila.AI auto-responses per business phone number</CardDescription>
        </CardHeader>
        <CardContent>
          {allPhones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No WhatsApp business numbers configured</p>
              <p className="text-sm">Set up phone allocations in WhatsApp settings first</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPhones.map(phone => {
                const setting = getSettingForPhone(phone);
                const allocation = getAllocationForPhone(phone);
                const cloudConfig = getCloudConfigForPhone(phone);
                const displayLabel = allocation?.user_name || cloudConfig?.business_name;
                return (
                  <div key={phone} className="p-4 border rounded-md space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`text-phone-${phone}`}>{phone}</span>
                        {displayLabel && (
                          <Badge variant="outline" className="text-xs">{displayLabel}</Badge>
                        )}
                      </div>
                      <Switch
                        checked={setting?.enabled ?? false}
                        onCheckedChange={(checked) => {
                          saveMutation.mutate({
                            display_phone_number: phone,
                            enabled: checked,
                            executive_name: setting?.executive_name || allocation?.user_name || "",
                          });
                        }}
                        data-testid={`switch-phone-${phone}`}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Executive name (shown to leads)"
                        defaultValue={setting?.executive_name || allocation?.user_name || ""}
                        onBlur={(e) => {
                          saveMutation.mutate({
                            display_phone_number: phone,
                            executive_name: e.target.value,
                            enabled: setting?.enabled ?? false,
                          });
                        }}
                        data-testid={`input-exec-name-${phone}`}
                      />
                      <Input
                        placeholder="Designation (e.g., Senior Sales Consultant)"
                        defaultValue={setting?.designation || ""}
                        onBlur={(e) => {
                          saveMutation.mutate({
                            display_phone_number: phone,
                            designation: e.target.value,
                            enabled: setting?.enabled ?? false,
                          });
                        }}
                        data-testid={`input-designation-${phone}`}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        type="password"
                        placeholder="Channel access token (from Wauper channel settings)"
                        defaultValue={setting?.access_token || ""}
                        onBlur={(e) => {
                          saveMutation.mutate({
                            display_phone_number: phone,
                            access_token: e.target.value,
                            enabled: setting?.enabled ?? false,
                          });
                        }}
                        data-testid={`input-access-token-${phone}`}
                      />
                      <Input
                        placeholder="Phone Number ID (from Wauper channel settings)"
                        defaultValue={setting?.waba_phone_number_id || ""}
                        onBlur={(e) => {
                          saveMutation.mutate({
                            display_phone_number: phone,
                            waba_phone_number_id: e.target.value,
                            enabled: setting?.enabled ?? false,
                          });
                        }}
                        data-testid={`input-phone-number-id-${phone}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Access token and phone number ID are found in your Wauper channel settings for this number.</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatesTab() {
  const { toast } = useToast();
  const { data: templates = [] } = useQuery<SailaTemplate[]>({ queryKey: ["/api/saila/templates"] });
  const [editingTemplate, setEditingTemplate] = useState<SailaTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMessages, setEditingMessages] = useState<{ direction: string; message_text: string }[]>([]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/saila/templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/templates"] });
      toast({ title: "Template created" });
      setShowCreateDialog(false);
      setNewTemplateName("");
      setNewTemplateCategory("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saila/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/templates"] });
      toast({ title: "Template deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Conversation Templates</h3>
          <p className="text-sm text-muted-foreground">Full conversation flows with incoming/outgoing message pairs</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="space-y-3">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No conversation templates yet</p>
              <p className="text-sm">Create templates to teach Saila.AI how to respond</p>
            </CardContent>
          </Card>
        ) : templates.map(template => (
          <Card key={template.id}>
            <CardContent className="flex items-center justify-between p-4 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{template.name}</span>
                  {template.category && (
                    <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                  )}
                  <Badge variant={template.enabled ? "default" : "outline"} className="text-xs">
                    {template.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{template.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingTemplate(template);
                    setEditingMessages([]);
                  }}
                  data-testid={`button-edit-template-${template.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(template.id)}
                  data-testid={`button-delete-template-${template.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Initial Greeting"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value)}
                placeholder="e.g., greeting, follow-up, booking"
                data-testid="input-template-category"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ name: newTemplateName, category: newTemplateCategory })}
              disabled={!newTemplateName || createMutation.isPending}
              data-testid="button-confirm-create-template"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingTemplate && (
        <TemplateMessageEditor
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}

function TemplateMessageEditor({ template, onClose }: { template: SailaTemplate; onClose: () => void }) {
  const { toast } = useToast();
  const { data: existingMessages = [] } = useQuery<SailaTemplateMessage[]>({
    queryKey: ["/api/saila/templates", template.id, "messages"],
  });

  const [messages, setMessages] = useState<{ direction: string; message_text: string }[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (existingMessages.length > 0 && !initialized) {
    setMessages(existingMessages.map(m => ({ direction: m.direction, message_text: m.message_text })));
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/saila/templates/${template.id}/messages`, {
        messages: messages.map((m, i) => ({ ...m, order_index: i })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/templates", template.id, "messages"] });
      toast({ title: "Messages saved" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addMessage = (direction: string) => {
    setMessages(prev => [...prev, { direction, message_text: "" }]);
  };

  const removeMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  const updateMessage = (index: number, text: string) => {
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, message_text: text } : m));
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Edit Conversation: {template.name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3 pb-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                <div className={`flex-1 max-w-[85%] ${msg.direction === "outgoing" ? "ml-auto" : "mr-auto"}`}>
                  <div className="flex items-center gap-1 mb-1">
                    <Badge variant={msg.direction === "incoming" ? "outline" : "default"} className="text-xs">
                      {msg.direction === "incoming" ? (
                        <><ArrowLeft className="h-3 w-3 mr-1" />Lead</>
                      ) : (
                        <><ArrowRight className="h-3 w-3 mr-1" />Saila</>
                      )}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => removeMessage(idx)} className="h-6 w-6">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={msg.message_text}
                    onChange={(e) => updateMessage(idx, e.target.value)}
                    placeholder={msg.direction === "incoming" ? "What the lead might say..." : "How Saila should respond..."}
                    rows={2}
                    className="text-sm"
                    data-testid={`textarea-msg-${idx}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => addMessage("incoming")} data-testid="button-add-incoming">
            <ArrowLeft className="h-3 w-3 mr-1" /> Add Lead Message
          </Button>
          <Button variant="outline" size="sm" onClick={() => addMessage("outgoing")} data-testid="button-add-outgoing">
            <ArrowRight className="h-3 w-3 mr-1" /> Add Saila Response
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-messages">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KeywordsTab() {
  const { toast } = useToast();
  const { data: keywords = [] } = useQuery<SailaKeyword[]>({ queryKey: ["/api/saila/keywords"] });
  const emptyForm = { keyword: "", match_type: "contains", response_text: "", priority: 0, enabled: true };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = editingId !== null;
  // Always split on commas — both Create and Edit. The matching engine compares
  // an inbound message against the raw stored `keyword` string, so a row that
  // contains commas can never match anything. (Task #127)
  const parsedKeywords = formValues.keyword.split(",").map(k => k.trim()).filter(k => k.length > 0);

  const openCreate = () => {
    setEditingId(null);
    setFormValues(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (kw: SailaKeyword) => {
    setEditingId(kw.id);
    setFormValues({
      keyword: kw.keyword,
      match_type: kw.match_type,
      response_text: kw.response_text ?? "",
      priority: kw.priority,
      enabled: kw.enabled,
    });
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (next: boolean) => {
    setDialogOpen(next);
    if (!next) {
      setEditingId(null);
      setFormValues(emptyForm);
    }
  };

  const handleSubmit = async () => {
    if (parsedKeywords.length === 0) return;
    setIsSaving(true);
    try {
      if (isEditing && editingId) {
        // First token replaces the existing row (preserves id → Logs/Test
        // History references survive). Any extra tokens become brand-new rows
        // sharing the same match_type / response_text / priority. (Task #127)
        const [firstToken, ...extraTokens] = parsedKeywords;
        await apiRequest("PUT", `/api/saila/keywords/${editingId}`, {
          keyword: firstToken,
          match_type: formValues.match_type,
          response_text: formValues.response_text,
          priority: formValues.priority,
        });
        if (extraTokens.length > 0) {
          // Preserve the original row's enabled flag so splitting a disabled
          // keyword doesn't silently activate the new variants.
          await Promise.all(
            extraTokens.map(kw =>
              apiRequest("POST", "/api/saila/keywords", {
                keyword: kw,
                match_type: formValues.match_type,
                response_text: formValues.response_text,
                priority: formValues.priority,
                enabled: formValues.enabled,
              })
            )
          );
        }
        await queryClient.invalidateQueries({ queryKey: ["/api/saila/keywords"] });
        toast({
          title: extraTokens.length > 0
            ? `Keyword updated and split into ${parsedKeywords.length} rules`
            : "Keyword updated",
        });
      } else {
        await Promise.all(
          parsedKeywords.map(kw =>
            apiRequest("POST", "/api/saila/keywords", { ...formValues, keyword: kw })
          )
        );
        await queryClient.invalidateQueries({ queryKey: ["/api/saila/keywords"] });
        const count = parsedKeywords.length;
        toast({ title: count === 1 ? "Keyword added" : `${count} keywords added` });
      }
      handleDialogOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/saila/keywords/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/keywords"] });
      toast({ title: "Keyword deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return await apiRequest("PUT", `/api/saila/keywords/${id}`, { enabled });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saila/keywords"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Keyword Matching</h3>
          <p className="text-sm text-muted-foreground">Define keywords that trigger specific responses</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-keyword">
          <Plus className="h-4 w-4 mr-2" />
          Add Keyword
        </Button>
      </div>

      {keywords.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No keywords configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {keywords.map(kw => (
            <Card key={kw.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{kw.keyword}</Badge>
                    <Badge variant="outline" className="text-xs">{kw.match_type}</Badge>
                    <span className="text-xs text-muted-foreground">Priority: {kw.priority}</span>
                  </div>
                  {kw.response_text && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">{kw.response_text}</p>
                  )}
                </div>
                <Switch
                  checked={kw.enabled}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: kw.id, enabled: checked })}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEdit(kw)}
                  data-testid={`button-edit-keyword-${kw.id}`}
                  aria-label="Edit keyword"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(kw.id)}
                  data-testid={`button-delete-keyword-${kw.id}`}
                  aria-label="Delete keyword"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Keyword" : "Add Keyword Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isEditing ? "Keyword" : "Keyword(s)"}</Label>
              <Input
                value={formValues.keyword}
                onChange={(e) => setFormValues(prev => ({ ...prev, keyword: e.target.value }))}
                placeholder={isEditing ? "Trigger text" : "e.g. hi, Hi, Hey, hiii"}
                data-testid="input-keyword"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple keywords with commas — each becomes its own rule with the same response. Each rule is matched independently against incoming messages.
              </p>
              {parsedKeywords.length > 1 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {isEditing
                      ? `Will split into ${parsedKeywords.length} rules:`
                      : `${parsedKeywords.length} keywords:`}
                  </span>
                  {parsedKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Match Type</Label>
              <Select
                value={formValues.match_type}
                onValueChange={(val) => setFormValues(prev => ({ ...prev, match_type: val }))}
              >
                <SelectTrigger data-testid="select-match-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="exact">Exact Match</SelectItem>
                  <SelectItem value="starts_with">Starts With</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Response Text</Label>
              <Textarea
                value={formValues.response_text}
                onChange={(e) => setFormValues(prev => ({ ...prev, response_text: e.target.value }))}
                placeholder="Quick response for this keyword..."
                rows={3}
                data-testid="input-keyword-response"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority (higher = checked first)</Label>
              <Input
                type="number"
                value={formValues.priority}
                onChange={(e) => setFormValues(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                data-testid="input-keyword-priority"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={parsedKeywords.length === 0 || isSaving}
              data-testid="button-confirm-keyword"
            >
              {isSaving
                ? (isEditing ? "Saving..." : "Adding...")
                : isEditing
                  ? "Save Changes"
                  : parsedKeywords.length > 1
                    ? `Add ${parsedKeywords.length} Keywords`
                    : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaTab() {
  const { toast } = useToast();
  const { data: media = [] } = useQuery<SailaMedia[]>({ queryKey: ["/api/saila/media"] });
  const [showCreate, setShowCreate] = useState(false);
  const [newMedia, setNewMedia] = useState({ name: "", type: "document", url: "", description: "" });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/saila/media", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/media"] });
      toast({ title: "Media added" });
      setShowCreate(false);
      setNewMedia({ name: "", type: "document", url: "", description: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/saila/media/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/media"] });
      toast({ title: "Media removed" });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "image": return <Image className="h-5 w-5" />;
      case "video": return <Video className="h-5 w-5" />;
      case "video_link": return <LinkIcon className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Media Library</h3>
          <p className="text-sm text-muted-foreground">Quotations, images, videos sent during conversations</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-add-media">
          <Plus className="h-4 w-4 mr-2" />
          Add Media
        </Button>
      </div>

      {media.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No media uploaded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {media.map(item => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="text-muted-foreground">{getIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                    {item.description && (
                      <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                    )}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newMedia.name}
                onChange={(e) => setNewMedia(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Price Quotation Q4"
                data-testid="input-media-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newMedia.type}
                onValueChange={(val) => setNewMedia(prev => ({ ...prev, type: val }))}
              >
                <SelectTrigger data-testid="select-media-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="video_link">Video Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={newMedia.url}
                onChange={(e) => setNewMedia(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                data-testid="input-media-url"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newMedia.description}
                onChange={(e) => setNewMedia(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description..."
                data-testid="input-media-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newMedia)}
              disabled={!newMedia.name || !newMedia.url || createMutation.isPending}
              data-testid="button-confirm-media"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConversationsTab() {
  const [view, setView] = useState<"conversations" | "not_responded">("conversations");
  const { data: result } = useQuery<{ conversations: SailaConversation[]; total: number }>({
    queryKey: ["/api/saila/conversations"],
  });
  const { data: skippedData } = useQuery<{ logs: SailaActivityLogEntry[]; total: number }>({
    queryKey: ["/api/saila/activity-logs", "skipped"],
    queryFn: async () => apiRequest<{ logs: SailaActivityLogEntry[]; total: number }>(
      "GET",
      "/api/saila/activity-logs?status=skipped&limit=200"
    ),
    refetchInterval: 30000,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = result?.conversations || [];
  const skipped = skippedData?.logs || [];

  const REASON_LABELS: Record<string, string> = {
    no_config: "No Saila config",
    saila_disabled: "Saila.AI off",
    phone_not_found: "Phone not configured",
    phone_disabled: "Phone toggled off",
  };

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Chats</h3>
          <p className="text-sm text-muted-foreground">All incoming WhatsApp messages — responded and not responded</p>
        </div>
        <div className="flex rounded-md border overflow-hidden">
          <button
            onClick={() => setView("conversations")}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${view === "conversations" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover-elevate"}`}
            data-testid="tab-conversations-view"
          >
            Responded
            {conversations.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs">{conversations.length}</span>
            )}
          </button>
          <button
            onClick={() => setView("not_responded")}
            className={`px-4 py-1.5 text-sm font-medium transition-colors border-l ${view === "not_responded" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover-elevate"}`}
            data-testid="tab-not-responded-view"
          >
            Not Responded
            {skipped.length > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${view === "not_responded" ? "bg-primary-foreground/20" : "bg-amber-500/20 text-amber-700 dark:text-amber-400"}`}>{skipped.length}</span>
            )}
          </button>
        </div>
      </div>

      {view === "conversations" ? (
        conversations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No conversations yet</p>
              <p className="text-sm">Conversations will appear here when Saila.AI starts responding to messages</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map(conv => (
              <Card key={conv.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedId(conv.id)} data-testid={`card-conversation-${conv.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{conv.sender_name || conv.sender_phone}</span>
                      <Badge variant={conv.status === "active" ? "default" : "secondary"} className="text-xs">
                        {conv.status}
                      </Badge>
                      {conv.booking_status !== "none" && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {conv.booking_status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Executive: {conv.executive_name || conv.executive_phone}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {conv.last_message_at && new Date(conv.last_message_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        skipped.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No skipped messages</p>
              <p className="text-sm">Messages that Saila.AI could not respond to will appear here with reasons</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {skipped.map(log => (
              <Card key={log.id} data-testid={`card-skipped-${log.id}`}>
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MinusCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{log.sender_name || log.sender_phone}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        {REASON_LABELS[log.reason || ""] || log.reason || "Unknown reason"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From: {log.sender_phone} · To channel: {log.executive_phone}
                    </p>
                    {log.incoming_message && (
                      <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 rounded px-2 py-1 mt-1">
                        "{log.incoming_message.length > 120 ? log.incoming_message.slice(0, 120) + "…" : log.incoming_message}"
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {formatTime(log.time)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {selectedId && (
        <ConversationViewer conversationId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function ConversationViewer({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const { data: conversation } = useQuery<SailaConversation>({
    queryKey: ["/api/saila/conversations", conversationId],
  });
  const { data: messages = [] } = useQuery<SailaConversationMessage[]>({
    queryKey: ["/api/saila/conversations", conversationId, "messages"],
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {conversation?.sender_name || conversation?.sender_phone || "Conversation"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-3 pb-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No messages</p>
            ) : messages.map(msg => {
              const isDryRun = msg.direction === "outgoing" && msg.sent_status === "dry_run";
              const isFailed = msg.direction === "outgoing" && msg.sent_status === "failed";
              return (
                <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.direction === "outgoing"
                      ? isDryRun
                        ? "border-2 border-dashed border-amber-500/60 bg-amber-500/10 text-foreground"
                        : isFailed
                          ? "bg-red-500/15 border border-red-500/30 text-foreground"
                          : "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {isDryRun && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <Eye className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Generated · Not Sent (LLM Test Mode)</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                      {msg.confidence_score != null && (
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {msg.confidence_score}%
                        </Badge>
                      )}
                      {msg.direction === "outgoing" && (
                        <span className="text-xs opacity-70 flex items-center gap-0.5">
                          {msg.sent_status === "sent" && <Check className="h-3 w-3 inline text-green-400" />}
                          {msg.sent_status === "dry_run" && <Eye className="h-3 w-3 inline text-amber-500" />}
                          {msg.sent_status === "failed" && <span className="text-red-400">failed</span>}
                        </span>
                      )}
                    </div>
                    {isFailed && msg.send_error && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1 opacity-80">{msg.send_error}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookingsTab() {
  const { data: result } = useQuery<{ bookings: SailaBooking[]; total: number }>({
    queryKey: ["/api/saila/bookings"],
  });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PUT", `/api/saila/bookings/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/bookings"] });
      toast({ title: "Booking updated" });
    },
  });

  const bookings = result?.bookings || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      case "no_show": return "outline";
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Call Bookings</h3>
        <p className="text-sm text-muted-foreground">Calls booked by Saila.AI with leads</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <PhoneCall className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No bookings yet</p>
            <p className="text-sm">Bookings will appear here when Saila.AI schedules calls</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {bookings.map(booking => (
            <Card key={booking.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <PhoneCall className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{booking.sender_name || booking.sender_phone}</span>
                    <Badge variant={getStatusColor(booking.status) as any} className="text-xs">
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {booking.booking_date}
                    </span>
                    {booking.booking_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {booking.booking_time}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {booking.executive_name || booking.executive_phone}
                    </span>
                  </div>
                </div>
                <Select
                  value={booking.status}
                  onValueChange={(val) => updateMutation.mutate({ id: booking.id, status: val })}
                >
                  <SelectTrigger className="w-32" data-testid={`select-booking-status-${booking.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 50;

function ErrorLogTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: phoneSettings } = useQuery<SailaPhoneSetting[]>({
    queryKey: ["/api/saila/phone-settings"],
  });

  const queryKey = ["/api/saila/activity-logs", statusFilter, phoneFilter, page];
  const { data, isLoading, refetch, isFetching } = useQuery<{ logs: SailaActivityLogEntry[]; total: number }>({
    queryKey,
    queryFn: async () => {
      const offset = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams({
        status: statusFilter === "all" ? "" : statusFilter,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (phoneFilter !== "all") params.set("executive_phone", phoneFilter);
      return apiRequest<{ logs: SailaActivityLogEntry[]; total: number }>(
        "GET",
        `/api/saila/activity-logs?${params}`
      );
    },
    refetchInterval: 30000,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  function handlePhoneChange(val: string) {
    setPhoneFilter(val);
    setPage(1);
  }

  const sentCount = logs.filter(l => l.sent_status === "sent").length;
  const failedCount = logs.filter(l => l.sent_status === "failed").length;
  const skippedCount = logs.filter(l => l.sent_status === "skipped").length;

  function getStatusBadge(status: string) {
    if (status === "sent") return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Sent
      </span>
    );
    if (status === "failed") return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-600 dark:text-red-400">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        <MinusCircle className="h-3 w-3" /> Skipped
      </span>
    );
  }

  function getSourceBadge(log: SailaActivityLogEntry) {
    if (log.type === "skipped") return null;
    const src = log.source;
    if (src === "keyword") return <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-500/40">Keyword</Badge>;
    if (src === "ai_llm") return <Badge variant="outline" className="text-xs text-violet-600 dark:text-violet-400 border-violet-500/40">AI</Badge>;
    if (src === "template") return <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/40">Template</Badge>;
    if (src === "fixed_reply") return <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-500/40">Fixed Reply</Badge>;
    return <Badge variant="outline" className="text-xs text-muted-foreground">Fallback</Badge>;
  }

  function getReasonLabel(reason: string | null) {
    if (!reason) return "—";
    const labels: Record<string, string> = {
      no_config: "No Saila config",
      saila_disabled: "Saila.AI off",
      phone_not_found: "Phone not configured",
      phone_disabled: "Phone toggled off",
      no_call_time_slot: "No call time slot configured",
    };
    return labels[reason] || reason;
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  }

  return (
    <div className="space-y-4 pt-4">
      <div>
        <h2 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Activity Log</h2>
        <p className="text-sm text-muted-foreground">Every Saila.AI response attempt — sent, failed, or skipped — is logged here.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{sentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{failedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <MinusCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Skipped</p>
              <p className="text-lg font-bold">{skippedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40" data-testid="select-log-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="sent">Sent Only</SelectItem>
            <SelectItem value="failed">Failed Only</SelectItem>
            <SelectItem value="skipped">Skipped Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={phoneFilter} onValueChange={handlePhoneChange}>
          <SelectTrigger className="w-48" data-testid="select-log-phone">
            <SelectValue placeholder="All business numbers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All business numbers</SelectItem>
            {(phoneSettings || []).map(p => (
              <SelectItem key={p.id} value={p.display_phone_number}>
                {p.display_phone_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-logs">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">auto-refreshes every 30s</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading activity log…</div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
          <Activity className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground">Saila.AI will log all response attempts here in real time.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-8"></th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Business #</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Client Message</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Saila Response</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const isExpanded = expandedRow === log.id;
                  const hasDetail = !!(log.send_error || log.keyword_matched || log.confidence_score != null || log.reason || log.incoming_message || log.response_text);
                  return (
                    <Fragment key={log.id}>
                      <tr
                        className={`border-b last:border-0 transition-colors ${
                          log.sent_status === "failed" ? "bg-red-500/5 hover:bg-red-500/10" :
                          log.sent_status === "skipped" ? "bg-muted/20 hover:bg-muted/30" :
                          "hover:bg-muted/20"
                        } ${hasDetail ? "cursor-pointer" : ""}`}
                        onClick={() => hasDetail && setExpandedRow(isExpanded ? null : log.id)}
                        data-testid={`row-log-${idx}`}
                      >
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {hasDetail && (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                          {formatTime(log.time)}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-mono text-xs">{log.sender_phone}</p>
                          {log.sender_name && <p className="text-xs text-muted-foreground">{log.sender_name}</p>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {log.executive_phone}
                          {log.executive_name && <span className="ml-1 text-foreground">({log.executive_name})</span>}
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          <p className="text-xs line-clamp-2 text-muted-foreground">{log.incoming_message || "—"}</p>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          {log.type === "response" ? (
                            <p className="text-xs line-clamp-2">{log.response_text || "—"}</p>
                          ) : (
                            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{getReasonLabel(log.reason)}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {getStatusBadge(log.sent_status)}
                        </td>
                        <td className="px-3 py-2.5">
                          {getSourceBadge(log)}
                        </td>
                      </tr>
                      {isExpanded && hasDetail && (
                        <tr key={`${log.id}-expanded`} className={`border-b last:border-0 ${log.sent_status === "failed" ? "bg-red-500/5" : "bg-muted/10"}`}>
                          <td colSpan={8} className="px-6 py-3">
                            <div className="space-y-2 text-xs">
                              {log.incoming_message && (
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-0.5">Client Message:</span>
                                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{log.incoming_message}</p>
                                </div>
                              )}
                              {log.response_text && (
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-0.5">Saila Response:</span>
                                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{log.response_text}</p>
                                </div>
                              )}
                              {(log.incoming_message || log.response_text) && (log.keyword_matched || log.confidence_score != null || log.send_error || log.reason) && (
                                <div className="border-t pt-2" />
                              )}
                              {log.keyword_matched && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Keyword matched: </span>
                                  <code className="bg-muted px-1 rounded">{log.keyword_matched}</code>
                                </div>
                              )}
                              {log.confidence_score != null && (
                                <div>
                                  <span className="font-medium text-muted-foreground">AI confidence: </span>
                                  <span>{log.confidence_score}%</span>
                                </div>
                              )}
                              {log.send_error && (
                                <div>
                                  <span className="font-medium text-red-600 dark:text-red-400">Delivery error: </span>
                                  <code className="bg-red-500/10 text-red-600 dark:text-red-400 px-1 rounded">{log.send_error}</code>
                                </div>
                              )}
                              {log.reason && (
                                <div>
                                  <span className="font-medium text-amber-600 dark:text-amber-400">Skip reason: </span>
                                  <span>{getReasonLabel(log.reason)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between px-1 pt-1 pb-1">
          <span className="text-xs text-muted-foreground">
            {total} total events · Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              data-testid="button-log-prev"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              data-testid="button-log-next"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FixedReplyTab() {
  const { toast } = useToast();

  const { data: phoneSettings = [] } = useQuery<SailaPhoneSetting[]>({ queryKey: ["/api/saila/phone-settings"] });
  const { data: fixedReplyConfigs = [] } = useQuery<SailaFixedReplyConfig[]>({ queryKey: ["/api/saila/fixed-reply-config"] });
  const { data: greetingSlots = [] } = useQuery<SailaGreetingSlot[]>({ queryKey: ["/api/saila/greeting-slots"] });
  const { data: callTimeSlots = [] } = useQuery<SailaCallTimeSlot[]>({ queryKey: ["/api/saila/call-time-slots"] });

  // Local state for editing phone templates
  const [templates, setTemplates] = useState<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const c of fixedReplyConfigs) map[c.executive_phone] = c.message_template;
    setTemplates(map);
  }, [fixedReplyConfigs]);

  // Add greeting slot form
  const [newGreeting, setNewGreeting] = useState({ hour_start: "", hour_end: "", greeting_text: "" });
  // Add call time slot form
  const [newCallTime, setNewCallTime] = useState({ hour_start: "", hour_end: "", call_time_label: "" });

  const upsertConfig = useMutation({
    mutationFn: (data: { executive_phone: string; enabled: boolean; message_template: string }) =>
      apiRequest("POST", "/api/saila/fixed-reply-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/fixed-reply-config"] });
      toast({ title: "Saved", description: "Fixed reply settings updated." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addGreetingSlot = useMutation({
    mutationFn: (data: { hour_start: number; hour_end: number; greeting_text: string }) =>
      apiRequest("POST", "/api/saila/greeting-slots", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/greeting-slots"] });
      setNewGreeting({ hour_start: "", hour_end: "", greeting_text: "" });
      toast({ title: "Added", description: "Greeting slot created." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGreetingSlot = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/saila/greeting-slots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/greeting-slots"] });
      toast({ title: "Deleted", description: "Greeting slot removed." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addCallTimeSlot = useMutation({
    mutationFn: (data: { hour_start: number; hour_end: number; call_time_label: string }) =>
      apiRequest("POST", "/api/saila/call-time-slots", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/call-time-slots"] });
      setNewCallTime({ hour_start: "", hour_end: "", call_time_label: "" });
      toast({ title: "Added", description: "Call time slot created." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCallTimeSlot = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/saila/call-time-slots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/call-time-slots"] });
      toast({ title: "Deleted", description: "Call time slot removed." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const getConfig = (phone: string) => fixedReplyConfigs.find(c => c.executive_phone === phone);
  const formatHour = (h: number) => {
    if (h === 0) return "12 AM";
    if (h < 12) return `${h} AM`;
    if (h === 12) return "12 PM";
    return `${h - 12} PM`;
  };

  return (
    <div className="space-y-8 p-4">
      {/* Section 1: Per-Phone Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneCall className="h-4 w-4" />
            Per-Phone Fixed Reply Settings
          </CardTitle>
          <CardDescription>
            When enabled, Saila sends a fixed template reply to Meta Ad contacts on their 2nd message (within 3 hours), instead of the AI response.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {phoneSettings.length === 0 && (
            <p className="text-sm text-muted-foreground">No phones configured yet. Add phones in the Phones tab first.</p>
          )}
          {phoneSettings.map(phone => {
            const cfg = getConfig(phone.display_phone_number);
            const isEnabled = cfg?.enabled ?? false;
            const template = templates[phone.display_phone_number] ?? cfg?.message_template ?? "";
            return (
              <Card key={phone.display_phone_number} className="border">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">{phone.display_phone_number}</p>
                      {phone.executive_name && <p className="text-xs text-muted-foreground">{phone.executive_name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Fixed Reply</Label>
                      <Switch
                        data-testid={`switch-fixed-reply-${phone.display_phone_number}`}
                        checked={isEnabled}
                        onCheckedChange={checked => upsertConfig.mutate({
                          executive_phone: phone.display_phone_number,
                          enabled: checked,
                          message_template: template,
                        })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Message Template</Label>
                    <Textarea
                      data-testid={`textarea-template-${phone.display_phone_number}`}
                      rows={3}
                      placeholder="{greeting}! I saw your enquiry. I will call you {call_time} to discuss. - {executive_name}"
                      value={template}
                      onChange={e => setTemplates(prev => ({ ...prev, [phone.display_phone_number]: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Placeholders: <code className="bg-muted px-1 rounded text-xs">{"{greeting}"}</code>{" "}
                      <code className="bg-muted px-1 rounded text-xs">{"{call_time}"}</code>{" "}
                      <code className="bg-muted px-1 rounded text-xs">{"{executive_name}"}</code>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    data-testid={`button-save-template-${phone.display_phone_number}`}
                    onClick={() => upsertConfig.mutate({
                      executive_phone: phone.display_phone_number,
                      enabled: isEnabled,
                      message_template: template,
                    })}
                    disabled={upsertConfig.isPending}
                  >
                    <Save className="h-3 w-3 mr-1" /> Save Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Section 2: Greeting Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Greeting Slots
          </CardTitle>
          <CardDescription>
            Map time ranges (24h) to greeting phrases used in the <code className="bg-muted px-1 rounded text-xs">{"{greeting}"}</code> placeholder. Falls back to "Hello" if no slot matches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {greetingSlots.length > 0 && (
            <div className="rounded-md border divide-y">
              {greetingSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between gap-2 px-4 py-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="shrink-0">{formatHour(slot.hour_start)} – {formatHour(slot.hour_end)}</Badge>
                    <span className="text-sm">{slot.greeting_text}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-greeting-${slot.id}`}
                    onClick={() => deleteGreetingSlot.mutate(slot.id)}
                    disabled={deleteGreetingSlot.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {greetingSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">No greeting slots yet. Add one below.</p>
          )}
          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From (hour 0–23)</Label>
              <Input
                data-testid="input-greeting-hour-start"
                type="number" min={0} max={23}
                placeholder="e.g. 6"
                value={newGreeting.hour_start}
                onChange={e => setNewGreeting(p => ({ ...p, hour_start: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To (hour 1–24)</Label>
              <Input
                data-testid="input-greeting-hour-end"
                type="number" min={1} max={24}
                placeholder="e.g. 12"
                value={newGreeting.hour_end}
                onChange={e => setNewGreeting(p => ({ ...p, hour_end: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Greeting Text</Label>
              <Input
                data-testid="input-greeting-text"
                placeholder="Good Morning"
                value={newGreeting.greeting_text}
                onChange={e => setNewGreeting(p => ({ ...p, greeting_text: e.target.value }))}
              />
            </div>
          </div>
          <Button
            size="sm"
            data-testid="button-add-greeting-slot"
            onClick={() => {
              const hs = parseInt(newGreeting.hour_start);
              const he = parseInt(newGreeting.hour_end);
              if (isNaN(hs) || isNaN(he) || !newGreeting.greeting_text) {
                toast({ title: "Validation", description: "All fields are required.", variant: "destructive" });
                return;
              }
              addGreetingSlot.mutate({ hour_start: hs, hour_end: he, greeting_text: newGreeting.greeting_text });
            }}
            disabled={addGreetingSlot.isPending}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Greeting Slot
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Call Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Call Time Slots
          </CardTitle>
          <CardDescription>
            Map time ranges (24h) to call time labels used in the <code className="bg-muted px-1 rounded text-xs">{"{call_time}"}</code> placeholder. If no slot matches the current hour, Saila skips the Fixed Reply silently.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {callTimeSlots.length > 0 && (
            <div className="rounded-md border divide-y">
              {callTimeSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between gap-2 px-4 py-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="shrink-0">{formatHour(slot.hour_start)} – {formatHour(slot.hour_end)}</Badge>
                    <span className="text-sm">{slot.call_time_label}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-calltime-${slot.id}`}
                    onClick={() => deleteCallTimeSlot.mutate(slot.id)}
                    disabled={deleteCallTimeSlot.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {callTimeSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">No call time slots yet. Add one below.</p>
          )}
          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From (hour 0–23)</Label>
              <Input
                data-testid="input-calltime-hour-start"
                type="number" min={0} max={23}
                placeholder="e.g. 9"
                value={newCallTime.hour_start}
                onChange={e => setNewCallTime(p => ({ ...p, hour_start: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To (hour 1–24)</Label>
              <Input
                data-testid="input-calltime-hour-end"
                type="number" min={1} max={24}
                placeholder="e.g. 12"
                value={newCallTime.hour_end}
                onChange={e => setNewCallTime(p => ({ ...p, hour_end: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Call Time Label</Label>
              <Input
                data-testid="input-calltime-label"
                placeholder="between 9 AM–12 PM"
                value={newCallTime.call_time_label}
                onChange={e => setNewCallTime(p => ({ ...p, call_time_label: e.target.value }))}
              />
            </div>
          </div>
          <Button
            size="sm"
            data-testid="button-add-calltime-slot"
            onClick={() => {
              const hs = parseInt(newCallTime.hour_start);
              const he = parseInt(newCallTime.hour_end);
              if (isNaN(hs) || isNaN(he) || !newCallTime.call_time_label) {
                toast({ title: "Validation", description: "All fields are required.", variant: "destructive" });
                return;
              }
              addCallTimeSlot.mutate({ hour_start: hs, hour_end: he, call_time_label: newCallTime.call_time_label });
            }}
            disabled={addCallTimeSlot.isPending}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Call Time Slot
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SailaAI() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();

  if (!isCompanyAdmin && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-destructive" />
            <p className="font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground">Only admins can access Saila.AI settings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-saila-title">Saila.AI</h1>
            <p className="text-sm text-muted-foreground">WhatsApp AI Response Engine</p>
          </div>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="grid grid-cols-4 sm:grid-cols-11 w-full h-auto gap-1" data-testid="tabs-saila">
            <TabsTrigger value="settings" className="text-xs sm:text-sm" data-testid="tab-settings">
              <Settings className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="phones" className="text-xs sm:text-sm" data-testid="tab-phones">
              <Phone className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Phones</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs sm:text-sm" data-testid="tab-templates">
              <MessageSquare className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="keywords" className="text-xs sm:text-sm" data-testid="tab-keywords">
              <Search className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Keywords</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="text-xs sm:text-sm" data-testid="tab-media">
              <FileText className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger value="conversations" className="text-xs sm:text-sm" data-testid="tab-conversations">
              <Bot className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Chats</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs sm:text-sm" data-testid="tab-bookings">
              <Calendar className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="error-log" className="text-xs sm:text-sm" data-testid="tab-error-log">
              <Activity className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Log</span>
            </TabsTrigger>
            <TabsTrigger value="fixed-reply" className="text-xs sm:text-sm" data-testid="tab-fixed-reply">
              <PhoneCall className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Fixed Reply</span>
            </TabsTrigger>
            <TabsTrigger value="intake" className="text-xs sm:text-sm" data-testid="tab-intake">
              <ListChecks className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Intake</span>
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="text-xs sm:text-sm" data-testid="tab-broadcast">
              <Megaphone className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Broadcast</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="phones"><PhoneSettingsTab /></TabsContent>
          <TabsContent value="templates"><TemplatesTab /></TabsContent>
          <TabsContent value="keywords"><KeywordsTab /></TabsContent>
          <TabsContent value="media"><MediaTab /></TabsContent>
          <TabsContent value="conversations"><ConversationsTab /></TabsContent>
          <TabsContent value="bookings"><BookingsTab /></TabsContent>
          <TabsContent value="error-log"><ErrorLogTab /></TabsContent>
          <TabsContent value="fixed-reply"><FixedReplyTab /></TabsContent>
          <TabsContent value="intake"><IntakeTab /></TabsContent>
          <TabsContent value="broadcast"><BroadcastTab /></TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

// ─── Saila Intake Tab ──────────────────────────────────────────────────────
function IntakeTab() {
  const { toast } = useToast();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [view, setView] = useState<"flows" | "sessions">("flows");

  const { data: flows = [], isLoading } = useQuery<any[]>({ queryKey: ['/api/saila/intake/flows'] });
  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ['/api/saila/intake/sessions'],
    enabled: view === 'sessions',
  });

  const createFlow = useMutation({
    mutationFn: async (name: string) => apiRequest('POST', '/api/saila/intake/flows', {
      name,
      enabled: false,
      priority: 0,
      cancel_keywords: ['stop', 'cancel'],
      fallback_prompt_template: 'Just checking in — could you share: {question}',
      max_fallback_attempts: 2,
      completion_message: 'Thanks! Our team will reach out shortly.',
      applied_business_numbers: [],
    }),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/saila/intake/flows'] });
      setCreateOpen(false); setNewFlowName("");
      setSelectedFlowId(created.id);
    },
  });

  if (selectedFlowId) {
    return <IntakeFlowEditor flowId={selectedFlowId} onBack={() => setSelectedFlowId(null)} />;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant={view === 'flows' ? 'default' : 'outline'} onClick={() => setView('flows')} data-testid="button-intake-view-flows">
            <ListChecks className="h-4 w-4 mr-1" /> Flows
          </Button>
          <Button size="sm" variant={view === 'sessions' ? 'default' : 'outline'} onClick={() => setView('sessions')} data-testid="button-intake-view-sessions">
            <Activity className="h-4 w-4 mr-1" /> Sessions
          </Button>
        </div>
        {view === 'flows' && (
          <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-intake-new-flow">
            <Plus className="h-4 w-4 mr-1" /> New Flow
          </Button>
        )}
      </div>

      {view === 'flows' && (
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && flows.length === 0 && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              No intake flows yet. Create one to start qualifying leads via WhatsApp Q&A.
            </CardContent></Card>
          )}
          {flows.map((f: any) => (
            <Card key={f.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedFlowId(f.id)} data-testid={`card-intake-flow-${f.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{f.name}</p>
                    {f.enabled
                      ? <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Enabled</Badge>
                      : <Badge variant="outline">Disabled</Badge>}
                    <Badge variant="outline">P{f.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {f.question_count} question{f.question_count === 1 ? '' : 's'} · {f.trigger_count} keyword{f.trigger_count === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === 'sessions' && (
        <div className="space-y-2">
          {sessions.length === 0 && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No sessions yet.</CardContent></Card>
          )}
          {sessions.map((s: any) => (
            <Card key={s.id} data-testid={`card-intake-session-${s.id}`}>
              <CardContent className="p-3 flex items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{s.id.slice(0, 8)}</p>
                  <p>Lead: <span className="font-mono">{s.lead_id?.slice(0, 8) || '—'}</span></p>
                </div>
                <div className="text-right">
                  <Badge variant={s.status === 'completed' ? 'default' : s.status === 'active' ? 'secondary' : 'outline'}>{s.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">Q{s.current_question_index + 1} · depth {s.depth_reached}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Intake Flow</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="flow-name">Flow Name</Label>
            <Input id="flow-name" value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)} placeholder="e.g. Property Qualification" data-testid="input-new-flow-name" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => newFlowName.trim() && createFlow.mutate(newFlowName.trim())} disabled={!newFlowName.trim() || createFlow.isPending} data-testid="button-create-flow-confirm">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableQuestionRow({ q, index, onDelete }: { q: any; index: number; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="p-3 border rounded-md space-y-1 bg-card" data-testid={`row-question-${q.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab hover-elevate active-elevate-2 rounded p-1 -ml-1"
            aria-label="Drag to reorder"
            data-testid={`drag-handle-question-${q.id}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <p className="font-medium text-sm truncate">Q{index + 1}. {q.primary_prompt}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onDelete(q.id)} data-testid={`button-delete-question-${q.id}`}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground pl-6">
        → field <code>{q.target_field}</code> · type {q.question_type || 'free_text'} · timeout {q.silence_timeout_seconds}s
        {q.max_fallback_attempts != null && ` · max-retries ${q.max_fallback_attempts}`}
        {q.llm_relevance_check_enabled && ` · relevance ON (${q.on_off_topic_action || 'reask'})`}
      </p>
    </div>
  );
}

function IntakeFlowEditor({ flowId, onBack }: { flowId: string; onBack: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ['/api/saila/intake/flows', flowId] });

  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [priority, setPriority] = useState(0);
  const [cancelKeywords, setCancelKeywords] = useState("");
  const [fallbackTemplate, setFallbackTemplate] = useState("");
  const [maxFallback, setMaxFallback] = useState(2);
  const [completionMsg, setCompletionMsg] = useState("");
  const [appliedNumbers, setAppliedNumbers] = useState("");

  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordMode, setNewKeywordMode] = useState<"contains" | "exact">("contains");
  const [newQPrompt, setNewQPrompt] = useState("");
  const [newQField, setNewQField] = useState("");
  const [newQTimeout, setNewQTimeout] = useState(86400);
  const MIN_SILENCE_TIMEOUT_SECONDS = 30;
  const [newQMaxFallback, setNewQMaxFallback] = useState<string>("");
  const [newQOffTopicAction, setNewQOffTopicAction] = useState<"reask" | "end_immediately">("reask");
  const [newQRelevance, setNewQRelevance] = useState(false);
  const [newQTopic, setNewQTopic] = useState("");

  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setEnabled(!!data.enabled);
      setPriority(data.priority || 0);
      setCancelKeywords((data.cancel_keywords || []).join(", "));
      setFallbackTemplate(data.fallback_prompt_template || "");
      setMaxFallback(data.max_fallback_attempts ?? 2);
      setCompletionMsg(data.completion_message || "");
      setAppliedNumbers((data.applied_business_numbers || []).join(", "));
    }
  }, [data]);

  const saveFlow = useMutation({
    mutationFn: async () => apiRequest('PUT', `/api/saila/intake/flows/${flowId}`, {
      name, enabled, priority,
      cancel_keywords: cancelKeywords.split(',').map(s => s.trim()).filter(Boolean),
      fallback_prompt_template: fallbackTemplate,
      max_fallback_attempts: maxFallback,
      completion_message: completionMsg,
      applied_business_numbers: appliedNumbers.split(',').map(s => s.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      toast({ title: "Saved" });
      queryClient.invalidateQueries({ queryKey: ['/api/saila/intake/flows'] });
      refetch();
    },
  });

  const deleteFlow = useMutation({
    mutationFn: async () => apiRequest('DELETE', `/api/saila/intake/flows/${flowId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saila/intake/flows'] });
      onBack();
    },
  });

  const addKeyword = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/saila/intake/flows/${flowId}/triggers`, { keyword: newKeyword, match_mode: newKeywordMode }),
    onSuccess: () => { setNewKeyword(""); refetch(); },
  });
  const delKeyword = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/saila/intake/triggers/${id}`),
    onSuccess: () => refetch(),
  });

  const addQuestion = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/saila/intake/flows/${flowId}/questions`, {
      primary_prompt: newQPrompt,
      target_field: newQField,
      silence_timeout_seconds: newQTimeout,
      question_type: 'free_text',
      max_fallback_attempts: newQMaxFallback.trim() === "" ? null : parseInt(newQMaxFallback) || null,
      on_off_topic_action: newQOffTopicAction,
      llm_relevance_check_enabled: newQRelevance,
      relevance_topic_hint: newQTopic || null,
    }),
    onSuccess: () => {
      setNewQPrompt(""); setNewQField(""); setNewQTopic(""); setNewQRelevance(false);
      setNewQMaxFallback(""); setNewQOffTopicAction("reask");
      refetch();
    },
  });
  const delQuestion = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/saila/intake/questions/${id}`),
    onSuccess: () => refetch(),
  });

  const [orderedQuestions, setOrderedQuestions] = useState<any[]>([]);
  useEffect(() => {
    setOrderedQuestions(data?.questions || []);
  }, [data?.questions]);

  const reorderQuestions = useMutation({
    mutationFn: async (orderedIds: string[]) =>
      apiRequest('PUT', `/api/saila/intake/flows/${flowId}/questions/reorder`, { ordered_ids: orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saila/intake/flows', flowId] });
    },
    onError: (err: any) => {
      toast({ title: "Reorder failed", description: err?.message || "Could not save new order", variant: "destructive" });
      setOrderedQuestions(data?.questions || []);
    },
  });

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedQuestions.findIndex((q) => q.id === active.id);
    const newIndex = orderedQuestions.findIndex((q) => q.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(orderedQuestions, oldIndex, newIndex);
    setOrderedQuestions(next);
    reorderQuestions.mutate(next.map((q) => q.id));
  };

  if (isLoading || !data) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <div className="space-y-4 mt-4">
      <Button variant="outline" size="sm" onClick={onBack} data-testid="button-intake-back">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Flows
      </Button>

      <Card>
        <CardHeader><CardTitle>Flow Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-flow-name" />
            </div>
            <div>
              <Label>Priority (higher wins on keyword conflicts)</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 0)} data-testid="input-flow-priority" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-flow-enabled" />
            <Label>Enabled</Label>
          </div>
          <div>
            <Label>Cancel Keywords (comma-separated)</Label>
            <Input value={cancelKeywords} onChange={(e) => setCancelKeywords(e.target.value)} placeholder="stop, cancel, exit" data-testid="input-cancel-keywords" />
          </div>
          <div>
            <Label>Fallback Prompt Template (use {`{question}`} to inject the current question)</Label>
            <Textarea value={fallbackTemplate} onChange={(e) => setFallbackTemplate(e.target.value)} rows={2} data-testid="textarea-fallback-template" />
          </div>
          <div>
            <Label>Max Fallback Attempts (before abandonment)</Label>
            <Input type="number" value={maxFallback} onChange={(e) => setMaxFallback(parseInt(e.target.value) || 0)} data-testid="input-max-fallback" />
          </div>
          <div>
            <Label>Completion Message</Label>
            <Textarea value={completionMsg} onChange={(e) => setCompletionMsg(e.target.value)} rows={2} data-testid="textarea-completion-message" />
          </div>
          <div>
            <Label>Applied Business Numbers (comma-separated, leave blank for ALL)</Label>
            <Input value={appliedNumbers} onChange={(e) => setAppliedNumbers(e.target.value)} placeholder="919876543210, 919812345678" data-testid="input-applied-numbers" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveFlow.mutate()} disabled={saveFlow.isPending} data-testid="button-save-flow">
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button variant="destructive" onClick={() => { if (confirm('Delete this flow?')) deleteFlow.mutate(); }} data-testid="button-delete-flow">
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Trigger Keywords</CardTitle><CardDescription>An incoming WhatsApp message containing one of these starts the flow.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {(data.triggers || []).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between gap-2 p-2 border rounded-md" data-testid={`row-trigger-${t.id}`}>
              <div className="flex items-center gap-2">
                <code className="text-sm">{t.keyword}</code>
                <Badge variant="outline">{t.match_mode}</Badge>
              </div>
              <Button size="icon" variant="ghost" onClick={() => delKeyword.mutate(t.id)} data-testid={`button-delete-trigger-${t.id}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="keyword" data-testid="input-new-keyword" />
            <Select value={newKeywordMode} onValueChange={(v) => setNewKeywordMode(v as any)}>
              <SelectTrigger className="w-32" data-testid="select-keyword-mode"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="exact">exact</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => newKeyword.trim() && addKeyword.mutate()} disabled={!newKeyword.trim()} data-testid="button-add-keyword">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions (asked in order)</CardTitle>
          <CardDescription>Drag the handle to reorder questions. The new order is saved automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
            <SortableContext items={orderedQuestions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedQuestions.map((q: any, i: number) => (
                  <SortableQuestionRow key={q.id} q={q} index={i} onDelete={(id) => delQuestion.mutate(id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="space-y-2 pt-2 border-t">
            <Label>New Question Prompt</Label>
            <Textarea value={newQPrompt} onChange={(e) => setNewQPrompt(e.target.value)} rows={2} placeholder="What is your budget?" data-testid="textarea-new-question" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label>Target Field (custom_fields key)</Label>
                <Input value={newQField} onChange={(e) => setNewQField(e.target.value)} placeholder="budget" data-testid="input-new-target-field" />
              </div>
              <div>
                <Label>Silence Timeout (seconds)</Label>
                <Input
                  type="number"
                  min={MIN_SILENCE_TIMEOUT_SECONDS}
                  value={newQTimeout}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 86400;
                    setNewQTimeout(Math.max(MIN_SILENCE_TIMEOUT_SECONDS, v));
                  }}
                  data-testid="input-new-timeout"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum {MIN_SILENCE_TIMEOUT_SECONDS}s. The background tick worker checks every 15s, so values below ~30s aren't reliable.
                </p>
              </div>
              <div>
                <Label>Max Fallback Attempts (override flow default)</Label>
                <Input value={newQMaxFallback} onChange={(e) => setNewQMaxFallback(e.target.value)} placeholder="leave blank to inherit" data-testid="input-new-max-fallback" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newQRelevance} onCheckedChange={setNewQRelevance} data-testid="switch-relevance" />
              <Label>Sarvam relevance check</Label>
            </div>
            {newQRelevance && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label>Topic Hint (optional)</Label>
                  <Input value={newQTopic} onChange={(e) => setNewQTopic(e.target.value)} placeholder="monetary amount in INR" data-testid="input-relevance-topic" />
                </div>
                <div>
                  <Label>If off-topic</Label>
                  <Select value={newQOffTopicAction} onValueChange={(v) => setNewQOffTopicAction(v as any)}>
                    <SelectTrigger data-testid="select-off-topic-action"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reask">Re-ask (counts toward max retries)</SelectItem>
                      <SelectItem value="end_immediately">End flow immediately (send completion msg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button onClick={() => addQuestion.mutate()} disabled={!newQPrompt.trim() || !newQField.trim()} data-testid="button-add-question">
              <Plus className="h-4 w-4 mr-1" /> Add Question
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
// ─── Saila Broadcast Tab ──────────────────────────────────────────────────────
type BroadcastOption = { display_phone_number: string; executive_name: string | null; session_open_count: number };
type BroadcastPreview = { session_open_count: number; suppressed_count: number; will_receive_count: number; sample_names: string[]; cooldown_hours: number | null };
type BroadcastRow = {
  id: string; send_from_phone: string; message_type: string; message_text: string | null;
  approved_template_name: string | null; cooldown_hours: number | null;
  total_recipients: number; sent_count: number; failed_count: number; suppressed_count: number;
  status: string; error_message: string | null; created_at: string; completed_at: string | null;
};

type CooldownChoice = "off" | "24" | "48" | "72" | "168";
const COOLDOWN_LABELS: Record<CooldownChoice, string> = {
  off: "Off",
  "24": "24 hours",
  "48": "48 hours",
  "72": "72 hours",
  "168": "7 days",
};

function BroadcastTab() {
  const { toast } = useToast();
  const [sendFrom, setSendFrom] = useState<string>("");
  const [cooldown, setCooldown] = useState<CooldownChoice>("24");
  const [messageType, setMessageType] = useState<"text" | "template">("text");
  const [messageText, setMessageText] = useState("");
  const [tplName, setTplName] = useState("");
  const [tplLang, setTplLang] = useState("en_US");
  const [tplVarsRaw, setTplVarsRaw] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);

  const { data: optionsData } = useQuery<{ options: BroadcastOption[] }>({
    queryKey: ["/api/saila/broadcast/options"],
  });
  const options = optionsData?.options ?? [];

  // Auto-pick the first connected number
  useEffect(() => {
    if (!sendFrom && options.length > 0) setSendFrom(options[0].display_phone_number);
  }, [options, sendFrom]);

  // Live preview — fires when sendFrom or cooldown changes
  const { data: preview, isFetching: previewLoading } = useQuery<BroadcastPreview>({
    queryKey: ["/api/saila/broadcast/preview", sendFrom, cooldown],
    queryFn: async () => {
      return await apiRequest<BroadcastPreview>("POST", "/api/saila/broadcast/preview", {
        send_from_phone: sendFrom,
        cooldown_hours: cooldown === "off" ? null : parseInt(cooldown, 10),
      });
    },
    enabled: !!sendFrom,
  });

  // Polling for active broadcast status
  const { data: activeBroadcast } = useQuery<BroadcastRow>({
    queryKey: ["/api/saila/broadcast", activeBroadcastId],
    enabled: !!activeBroadcastId,
    refetchInterval: (query) => {
      const status = (query.state.data as BroadcastRow | undefined)?.status;
      return status === "running" || status === "pending" ? 2000 : false;
    },
  });

  // Recent history
  const { data: history = [] } = useQuery<BroadcastRow[]>({
    queryKey: ["/api/saila/broadcast"],
    refetchInterval: activeBroadcastId ? 5000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const vars = tplVarsRaw
        .split("|")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const body: any = {
        send_from_phone: sendFrom,
        cooldown_hours: cooldown === "off" ? null : parseInt(cooldown, 10),
        message_type: messageType,
      };
      if (messageType === "text") {
        body.message_text = messageText;
      } else {
        body.approved_template_name = tplName;
        body.approved_template_language = tplLang;
        body.approved_template_variables = vars;
      }
      return await apiRequest<{ broadcast_id: string; total_recipients: number; suppressed_count: number }>(
        "POST",
        "/api/saila/broadcast/send",
        body,
      );
    },
    onSuccess: (data) => {
      setActiveBroadcastId(data.broadcast_id);
      setConfirmOpen(false);
      toast({ title: "Broadcast started", description: `Sending to ${data.total_recipients} recipient(s)` });
      queryClient.invalidateQueries({ queryKey: ["/api/saila/broadcast"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to start broadcast", description: err?.message || String(err), variant: "destructive" });
    },
  });

  const willSendCount = preview?.will_receive_count ?? 0;
  const composerInvalid =
    !sendFrom ||
    willSendCount === 0 ||
    (messageType === "text" ? messageText.trim().length === 0 : tplName.trim().length === 0);

  return (
    <div className="space-y-6 mt-4" data-testid="broadcast-tab">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Broadcast
          </CardTitle>
          <CardDescription>
            One-shot WhatsApp send to every contact whose 24-hour session is open on the chosen business number.
            Cooldown suppresses contacts who already received a broadcast recently — per-lead human messages don't count.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sender + cooldown row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Send From</Label>
              <Select value={sendFrom} onValueChange={setSendFrom}>
                <SelectTrigger data-testid="select-broadcast-sender"><SelectValue placeholder="Pick a connected number" /></SelectTrigger>
                <SelectContent>
                  {options.length === 0 && (
                    <SelectItem value="__none__" disabled>No connected business numbers</SelectItem>
                  )}
                  {options.map((o) => (
                    <SelectItem key={o.display_phone_number} value={o.display_phone_number}>
                      {o.executive_name ? `${o.executive_name} — ` : ""}{o.display_phone_number}
                      {" — "}<span className="text-muted-foreground">{o.session_open_count} open</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cooldown</Label>
              <Select value={cooldown} onValueChange={(v) => setCooldown(v as CooldownChoice)}>
                <SelectTrigger data-testid="select-broadcast-cooldown"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(COOLDOWN_LABELS) as CooldownChoice[]).map((k) => (
                    <SelectItem key={k} value={k}>{COOLDOWN_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-md border p-4 space-y-2 bg-muted/20" data-testid="broadcast-preview">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default" data-testid="badge-will-send">{willSendCount} will receive</Badge>
              <Badge variant="secondary">{preview?.session_open_count ?? 0} session-open</Badge>
              {(preview?.suppressed_count ?? 0) > 0 && (
                <Badge variant="outline" data-testid="badge-suppressed">{preview?.suppressed_count} suppressed by cooldown</Badge>
              )}
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {preview && preview.sample_names.length > 0 && (
              <p className="text-xs text-muted-foreground" data-testid="text-sample-names">
                Sample: {preview.sample_names.join(", ")}{preview.will_receive_count > preview.sample_names.length ? ` and ${preview.will_receive_count - preview.sample_names.length} more` : ""}
              </p>
            )}
          </div>

          {/* Composer */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={messageType === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setMessageType("text")}
                data-testid="button-msg-type-text"
              >
                Text
              </Button>
              <Button
                type="button"
                variant={messageType === "template" ? "default" : "outline"}
                size="sm"
                onClick={() => setMessageType("template")}
                data-testid="button-msg-type-template"
              >
                Approved Template
              </Button>
            </div>

            {messageType === "text" ? (
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={5}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write the broadcast message…"
                  data-testid="textarea-broadcast-text"
                />
                <p className="text-xs text-muted-foreground">
                  No personalization placeholders — every recipient receives the exact same text.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="e.g. order_update" data-testid="input-template-name" />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input value={tplLang} onChange={(e) => setTplLang(e.target.value)} placeholder="en_US" data-testid="input-template-lang" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Variables (pipe-separated, in order)</Label>
                  <Input value={tplVarsRaw} onChange={(e) => setTplVarsRaw(e.target.value)} placeholder="e.g. Ravi | INV-1234 | tomorrow" data-testid="input-template-vars" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={composerInvalid || sendMutation.isPending}
              data-testid="button-open-confirm"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to {willSendCount}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active broadcast progress */}
      {activeBroadcast && (
        <Card data-testid="card-active-broadcast">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {activeBroadcast.status === "running" || activeBroadcast.status === "pending" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : activeBroadcast.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              Current Broadcast
            </CardTitle>
            <CardDescription>
              Status: <span data-testid="text-active-status">{activeBroadcast.status}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{activeBroadcast.sent_count} sent</Badge>
              <Badge variant="secondary">{activeBroadcast.total_recipients} total</Badge>
              {activeBroadcast.failed_count > 0 && <Badge variant="destructive">{activeBroadcast.failed_count} failed</Badge>}
              {activeBroadcast.suppressed_count > 0 && <Badge variant="outline">{activeBroadcast.suppressed_count} suppressed</Badge>}
            </div>
            {activeBroadcast.error_message && (
              <p className="text-xs text-destructive" data-testid="text-active-error">{activeBroadcast.error_message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent history */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Broadcasts</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 flex-wrap"
                  data-testid={`row-broadcast-${b.id}`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          b.status === "completed" ? "default" :
                          b.status === "failed" ? "destructive" :
                          b.status === "running" || b.status === "pending" ? "secondary" : "outline"
                        }
                      >
                        {b.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">from {b.send_from_phone}</span>
                      {b.cooldown_hours != null && (
                        <span className="text-xs text-muted-foreground">cooldown {b.cooldown_hours}h</span>
                      )}
                    </div>
                    <p className="text-sm truncate" data-testid={`text-broadcast-msg-${b.id}`}>
                      {b.message_type === "template"
                        ? `Template: ${b.approved_template_name}`
                        : (b.message_text || "")}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="default">{b.sent_count}/{b.total_recipients}</Badge>
                    {b.failed_count > 0 && <Badge variant="destructive">{b.failed_count} failed</Badge>}
                    {b.suppressed_count > 0 && <Badge variant="outline">{b.suppressed_count} suppressed</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent data-testid="dialog-broadcast-confirm">
          <DialogHeader>
            <DialogTitle>Send broadcast to {willSendCount} contact{willSendCount === 1 ? "" : "s"}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">From:</span> {sendFrom}</p>
            <p><span className="text-muted-foreground">Cooldown:</span> {COOLDOWN_LABELS[cooldown]}</p>
            <p><span className="text-muted-foreground">Type:</span> {messageType === "template" ? `Approved template "${tplName}"` : "Text"}</p>
            {(preview?.suppressed_count ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {preview?.suppressed_count} contact(s) will be skipped because of the cooldown filter.
              </p>
            )}
            <div className="rounded-md border p-3 bg-muted/30 max-h-40 overflow-auto">
              <p className="text-xs whitespace-pre-wrap">
                {messageType === "text"
                  ? messageText
                  : `Template: ${tplName} (${tplLang})\nVariables: ${tplVarsRaw || "—"}`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sendMutation.isPending} data-testid="button-cancel-confirm">
              Cancel
            </Button>
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} data-testid="button-confirm-send">
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
