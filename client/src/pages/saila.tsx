import { useState } from "react";
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
  PhoneCall, User, Sparkles, AlertTriangle
} from "lucide-react";
import type {
  SailaConfig, SailaPhoneSetting, SailaTemplate, SailaTemplateMessage,
  SailaKeyword, SailaMedia, SailaConversation, SailaConversationMessage,
  SailaBooking
} from "@shared/schema";

function SettingsTab() {
  const { toast } = useToast();
  const { data: config } = useQuery<SailaConfig | null>({ queryKey: ["/api/saila/config"] });

  const [formData, setFormData] = useState<Partial<SailaConfig>>({});

  const currentData = { ...config, ...formData };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/saila/config", data);
      return res.json();
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
              <Label>API Version</Label>
              <Input
                placeholder="v2"
                value={currentData.wauper_api_version || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, wauper_api_version: e.target.value }))}
                data-testid="input-wauper-version"
              />
            </div>
          </div>

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
  const { data: allocations = [] } = useQuery<any[]>({ queryKey: ["/api/whatsapp/allocations"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/saila/phone-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/phone-settings"] });
      toast({ title: "Phone setting saved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const allPhones = Array.from(new Set([
    ...allocations.map((a: any) => a.display_phone_number),
    ...phoneSettings.map(s => s.display_phone_number),
  ])).filter(Boolean);

  const getSettingForPhone = (phone: string) => phoneSettings.find(s => s.display_phone_number === phone);
  const getAllocationForPhone = (phone: string) => allocations.find((a: any) => a.display_phone_number === phone);

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
                return (
                  <div key={phone} className="flex items-center justify-between p-4 border rounded-md gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`text-phone-${phone}`}>{phone}</span>
                        {allocation && (
                          <Badge variant="outline" className="text-xs">
                            {allocation.user_name || "Allocated"}
                          </Badge>
                        )}
                      </div>
                      <Input
                        className="mt-2"
                        placeholder="Executive name (shown to leads)"
                        value={setting?.executive_name || allocation?.user_name || ""}
                        onChange={(e) => {
                          saveMutation.mutate({
                            display_phone_number: phone,
                            executive_name: e.target.value,
                            enabled: setting?.enabled ?? false,
                          });
                        }}
                        data-testid={`input-exec-name-${phone}`}
                      />
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
      const res = await apiRequest("POST", "/api/saila/templates", data);
      return res.json();
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
      const res = await apiRequest("POST", `/api/saila/templates/${template.id}/messages`, {
        messages: messages.map((m, i) => ({ ...m, order_index: i })),
      });
      return res.json();
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
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: "", match_type: "contains", response_text: "", priority: 0 });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/saila/keywords", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/keywords"] });
      toast({ title: "Keyword added" });
      setShowCreate(false);
      setNewKeyword({ keyword: "", match_type: "contains", response_text: "", priority: 0 });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/saila/keywords/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saila/keywords"] });
      toast({ title: "Keyword deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("PUT", `/api/saila/keywords/${id}`, { enabled });
      return res.json();
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
        <Button onClick={() => setShowCreate(true)} data-testid="button-add-keyword">
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
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(kw.id)}>
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
            <DialogTitle>Add Keyword Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Keyword</Label>
              <Input
                value={newKeyword.keyword}
                onChange={(e) => setNewKeyword(prev => ({ ...prev, keyword: e.target.value }))}
                placeholder="e.g., price, cost, rate"
                data-testid="input-keyword"
              />
            </div>
            <div className="space-y-2">
              <Label>Match Type</Label>
              <Select
                value={newKeyword.match_type}
                onValueChange={(val) => setNewKeyword(prev => ({ ...prev, match_type: val }))}
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
                value={newKeyword.response_text}
                onChange={(e) => setNewKeyword(prev => ({ ...prev, response_text: e.target.value }))}
                placeholder="Quick response for this keyword..."
                rows={3}
                data-testid="input-keyword-response"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority (higher = checked first)</Label>
              <Input
                type="number"
                value={newKeyword.priority}
                onChange={(e) => setNewKeyword(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                data-testid="input-keyword-priority"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newKeyword)}
              disabled={!newKeyword.keyword || createMutation.isPending}
              data-testid="button-confirm-keyword"
            >
              Add
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
      const res = await apiRequest("POST", "/api/saila/media", data);
      return res.json();
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
  const { data: result } = useQuery<{ conversations: SailaConversation[]; total: number }>({
    queryKey: ["/api/saila/conversations"],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = result?.conversations || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">AI Conversations</h3>
        <p className="text-sm text-muted-foreground">View Saila.AI conversation threads with leads</p>
      </div>

      {conversations.length === 0 ? (
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
            <Card key={conv.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedId(conv.id)}>
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
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3 pb-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No messages</p>
            ) : messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  msg.direction === "outgoing"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                    {msg.confidence_score != null && (
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        {msg.confidence_score}%
                      </Badge>
                    )}
                    {msg.sent_status && msg.direction === "outgoing" && (
                      <span className="text-xs opacity-70">
                        {msg.sent_status === "sent" ? <Check className="h-3 w-3 inline" /> : msg.sent_status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
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
      const res = await apiRequest("PUT", `/api/saila/bookings/${id}`, { status });
      return res.json();
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
          <TabsList className="grid grid-cols-7 w-full" data-testid="tabs-saila">
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
          </TabsList>

          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="phones"><PhoneSettingsTab /></TabsContent>
          <TabsContent value="templates"><TemplatesTab /></TabsContent>
          <TabsContent value="keywords"><KeywordsTab /></TabsContent>
          <TabsContent value="media"><MediaTab /></TabsContent>
          <TabsContent value="conversations"><ConversationsTab /></TabsContent>
          <TabsContent value="bookings"><BookingsTab /></TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}