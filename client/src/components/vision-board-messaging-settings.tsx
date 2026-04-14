import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, MessageSquare, Calendar, Users, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { VisionBoardMessageRecord, User } from "@shared/schema";

const messageSchema = z.object({
  title: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  target_type: z.enum(["all", "selected"]),
  target_user_ids: z.array(z.string()).optional(),
  expires_at: z.date().optional().nullable(),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface VisionBoardMessagingSettingsProps {
  className?: string;
}

export function VisionBoardMessagingSettings({ className }: VisionBoardMessagingSettingsProps) {
  const { company, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<VisionBoardMessageRecord | null>(null);
  const [filter, setFilter] = useState<"active" | "archived" | "all">("active");

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<VisionBoardMessageRecord[]>({
    queryKey: ["/api/admin/vision-board-messages", filter === "all" ? "all" : filter === "archived"],
    enabled: !!company?.id,
    queryFn: async () => {
      const includeArchived = filter === "all" || filter === "archived";
      const url = `/api/admin/vision-board-messages${includeArchived ? "?include_archived=true" : ""}`;
      return await apiRequest<VisionBoardMessageRecord[]>("GET", url);
    },
  });

  // Fetch company users for targeting
  const { data: companyUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/company/users"],
    enabled: !!company?.id,
  });

  // Filter messages based on selected filter
  const filteredMessages = messages.filter(msg => {
    if (filter === "active") return !msg.is_archived;
    if (filter === "archived") return msg.is_archived;
    return true; // "all"
  });

  const createForm = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      title: "",
      message: "",
      target_type: "all",
      target_user_ids: [],
      expires_at: null,
    },
  });

  const editForm = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      title: "",
      message: "",
      target_type: "all",
      target_user_ids: [],
      expires_at: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      const payload = {
        title: data.title || null,
        message: data.message,
        target_user_ids: data.target_type === "all" ? null : data.target_user_ids || [],
        expires_at: data.expires_at ? data.expires_at.toISOString() : null,
      };
      return await apiRequest<VisionBoardMessageRecord>("POST", "/api/admin/vision-board-messages", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board/messages"] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Message created",
        description: "Vision Board message has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create message",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MessageFormData }) => {
      const payload: any = {
        message: data.message,
        target_user_ids: data.target_type === "all" ? null : data.target_user_ids || [],
        expires_at: data.expires_at ? data.expires_at.toISOString() : null,
      };
      if (data.title !== undefined) {
        payload.title = data.title || null;
      }
      return await apiRequest<VisionBoardMessageRecord>("PATCH", `/api/admin/vision-board-messages/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board/messages"] });
      setEditDialogOpen(false);
      setEditingMessage(null);
      editForm.reset();
      toast({
        title: "Message updated",
        description: "Vision Board message has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update message",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest<{ success: boolean }>("DELETE", `/api/admin/vision-board-messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board/messages"] });
      toast({
        title: "Message deleted",
        description: "Vision Board message has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest<VisionBoardMessageRecord>("PATCH", `/api/admin/vision-board-messages/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vision-board-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board/messages"] });
      toast({
        title: "Message archived",
        description: "Vision Board message archive status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive message",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (message: VisionBoardMessageRecord) => {
    setEditingMessage(message);
    const targetType = message.target_user_ids === null || message.target_user_ids.length === 0 ? "all" : "selected";
    editForm.reset({
      title: message.title || "",
      message: message.message,
      target_type: targetType,
      target_user_ids: message.target_user_ids || [],
      expires_at: message.expires_at ? new Date(message.expires_at) : null,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate(id);
  };

  const getTargetLabel = (message: VisionBoardMessageRecord) => {
    if (!message.target_user_ids || message.target_user_ids.length === 0) {
      return "All Users";
    }
    if (message.target_user_ids.length === 1) {
      const user = companyUsers.find(u => u.id === message.target_user_ids![0]);
      return user ? user.user_name : "1 user";
    }
    return `${message.target_user_ids.length} users`;
  };

  const isExpired = (message: VisionBoardMessageRecord) => {
    if (!message.expires_at) return false;
    return new Date(message.expires_at) < new Date();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vision Board Messages</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage messages displayed on users' Vision Board pages
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Message
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Vision Board Message</DialogTitle>
              <DialogDescription>
                Messages will appear on users' Vision Board pages below the progress section
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4 flex-1 overflow-y-auto"
              >
                <FormField
                  control={createForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter message title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your message"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="target_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="target-all" />
                            <Label htmlFor="target-all" className="cursor-pointer">
                              All Users
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="selected" id="target-selected" />
                            <Label htmlFor="target-selected" className="cursor-pointer">
                              Select Specific Users
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {createForm.watch("target_type") === "selected" && (
                  <FormField
                    control={createForm.control}
                    name="target_user_ids"
                    render={() => (
                      <FormItem>
                        <FormLabel>Select Users</FormLabel>
                        <FormControl>
                          <ScrollArea className="h-48 border rounded-md p-4">
                            <div className="space-y-2">
                              {companyUsers.filter((u) => u.is_active !== false).map((user) => (
                                <div key={user.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`user-${user.id}`}
                                    checked={createForm.watch("target_user_ids")?.includes(user.id) || false}
                                    onCheckedChange={(checked) => {
                                      const current = createForm.getValues("target_user_ids") || [];
                                      const updated = checked
                                        ? [...current, user.id]
                                        : current.filter((id) => id !== user.id);
                                      createForm.setValue("target_user_ids", updated);
                                    }}
                                  />
                                  <Label
                                    htmlFor={`user-${user.id}`}
                                    className="cursor-pointer text-sm font-normal"
                                  >
                                    {user.user_name} ({user.email})
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={createForm.control}
                  name="expires_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : "No expiration"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={(date) => field.onChange(date || null)}
                              disabled={(date) => date < new Date()}
                            />
                            <div className="p-3 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => field.onChange(null)}
                              >
                                Clear
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Message
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={filter === "active" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("active")}
        >
          Active
        </Button>
        <Button
          variant={filter === "archived" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("archived")}
        >
          Archived
        </Button>
        <Button
          variant={filter === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
      </div>

      {/* Messages List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No messages found. Create your first message to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((message) => (
            <Card key={message.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        {message.title && (
                          <h4 className="font-semibold mb-1">{message.title}</h4>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {message.message}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline">{getTargetLabel(message)}</Badge>
                          {message.expires_at && (
                            <Badge variant={isExpired(message) ? "destructive" : "outline"}>
                              Expires: {format(new Date(message.expires_at), "MMM d, yyyy")}
                            </Badge>
                          )}
                          {message.is_archived && (
                            <Badge variant="secondary">Archived</Badge>
                          )}
                          {isExpired(message) && !message.is_archived && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Created: {format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(message)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchive(message.id)}
                      disabled={archiveMutation.isPending}
                    >
                      {message.is_archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(message.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Vision Board Message</DialogTitle>
            <DialogDescription>
              Update the message content and settings
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => {
                if (editingMessage) {
                  updateMutation.mutate({ id: editingMessage.id, data });
                }
              })}
              className="space-y-4 flex-1 overflow-y-auto"
            >
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter message title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your message"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="target_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="edit-target-all" />
                          <Label htmlFor="edit-target-all" className="cursor-pointer">
                            All Users
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="selected" id="edit-target-selected" />
                          <Label htmlFor="edit-target-selected" className="cursor-pointer">
                            Select Specific Users
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editForm.watch("target_type") === "selected" && (
                <FormField
                  control={editForm.control}
                  name="target_user_ids"
                  render={() => (
                    <FormItem>
                      <FormLabel>Select Users</FormLabel>
                      <FormControl>
                        <ScrollArea className="h-48 border rounded-md p-4">
                          <div className="space-y-2">
                            {companyUsers.filter((u) => u.is_active !== false).map((user) => (
                              <div key={user.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-user-${user.id}`}
                                  checked={editForm.watch("target_user_ids")?.includes(user.id) || false}
                                  onCheckedChange={(checked) => {
                                    const current = editForm.getValues("target_user_ids") || [];
                                    const updated = checked
                                      ? [...current, user.id]
                                      : current.filter((id) => id !== user.id);
                                    editForm.setValue("target_user_ids", updated);
                                  }}
                                />
                                <Label
                                  htmlFor={`edit-user-${user.id}`}
                                  className="cursor-pointer text-sm font-normal"
                                >
                                  {user.user_name} ({user.email})
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={editForm.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date (Optional)</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "No expiration"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={(date) => field.onChange(date || null)}
                            disabled={(date) => date < new Date()}
                          />
                          <div className="p-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => field.onChange(null)}
                            >
                              Clear
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingMessage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Message
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

