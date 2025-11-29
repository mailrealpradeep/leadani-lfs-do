import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Building2,
  Clock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiKeyWithDetails {
  id: string;
  key_prefix: string;
  key_preview: string;
  name: string;
  company_id: string;
  company_name: string;
  created_by: string;
  created_by_name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface NewKeyResponse extends ApiKeyWithDetails {
  full_key: string;
  message: string;
}

export function ApiKeysManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [isNewKeyDialogOpen, setIsNewKeyDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKeyWithDetails | null>(null);
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery<ApiKeyWithDetails[]>({
    queryKey: ["/api/super-admin/api-keys"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/super-admin/companies"],
  });

  const createKeyMutation = useMutation({
    mutationFn: async ({ name, company_id }: { name: string; company_id: string }) => {
      return await apiRequest("POST", "/api/super-admin/api-keys", { name, company_id });
    },
    onSuccess: (data: NewKeyResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/api-keys"] });
      setIsCreateDialogOpen(false);
      setNewKeyName("");
      setSelectedCompanyId("");
      setNewKey(data);
      setIsNewKeyDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create API key",
        description: error.message,
      });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      return await apiRequest("DELETE", `/api/super-admin/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/api-keys"] });
      toast({
        title: "API key revoked",
        description: "The API key has been revoked and can no longer be used.",
      });
      setIsRevokeDialogOpen(false);
      setSelectedKey(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to revoke API key",
        description: error.message,
      });
    },
  });

  const handleCopyKey = async () => {
    if (newKey?.full_key) {
      await navigator.clipboard.writeText(newKey.full_key);
      setCopiedKey(true);
      toast({
        title: "API key copied",
        description: "The API key has been copied to your clipboard.",
      });
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  const activeKeys = apiKeys.filter(k => k.is_active);
  const revokedKeys = apiKeys.filter(k => !k.is_active);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Key className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold" data-testid="text-api-keys-title">API Keys</h2>
              <p className="text-sm text-muted-foreground">Manage API keys for mobile app integration</p>
            </div>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-api-key">
            <Plus className="h-4 w-4 mr-2" />
            Generate New Key
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              Active Keys ({activeKeys.length})
            </CardTitle>
            <CardDescription>
              These keys can be used to authenticate API requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keysLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active API keys</p>
                <p className="text-sm">Generate a new key to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Key Preview</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeKeys.map((key) => (
                    <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {key.company_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {key.key_prefix}...
                        </code>
                      </TableCell>
                      <TableCell>
                        {format(new Date(key.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {key.last_used_at ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {format(new Date(key.last_used_at), "dd/MM/yy HH:mm")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedKey(key);
                            setIsRevokeDialogOpen(true);
                          }}
                          data-testid={`button-revoke-${key.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {revokedKeys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-5 w-5" />
                Revoked Keys ({revokedKeys.length})
              </CardTitle>
              <CardDescription>
                These keys have been revoked and can no longer be used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Revoked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revokedKeys.map((key) => (
                    <TableRow key={key.id} className="opacity-60">
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>{key.company_name}</TableCell>
                      <TableCell>
                        {key.revoked_at && format(new Date(key.revoked_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for mobile app integration. The key will only be shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., Mobile App Production"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                data-testid="input-key-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger data-testid="select-company">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createKeyMutation.mutate({ name: newKeyName, company_id: selectedCompanyId })}
              disabled={!newKeyName || !selectedCompanyId || createKeyMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createKeyMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Generate Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Created Dialog */}
      <Dialog open={isNewKeyDialogOpen} onOpenChange={setIsNewKeyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy this key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This is the only time you'll see this API key. Make sure to copy it and store it securely.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={newKey?.full_key || ""}
                  className="font-mono text-sm"
                  data-testid="input-new-key"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyKey}
                  data-testid="button-copy-key"
                >
                  {copiedKey ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{newKey?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Company:</span>
                <p className="font-medium">{newKey?.company_name}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsNewKeyDialogOpen(false)} data-testid="button-done">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke the API key "{selectedKey?.name}". 
              Any applications using this key will no longer be able to authenticate.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedKey && revokeKeyMutation.mutate(selectedKey.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-revoke"
            >
              {revokeKeyMutation.isPending ? "Revoking..." : "Revoke Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}
