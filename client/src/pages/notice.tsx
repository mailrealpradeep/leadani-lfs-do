import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";
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

interface NoticeMetadata {
  id: string;
  original_filename: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface ViewTokenResponse {
  token: string;
}

export default function NoticePage() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputEmptyRef = useRef<HTMLInputElement>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const canManage = isCompanyAdmin || isSuperAdmin;

  const { data: notice, isLoading, error } = useQuery<NoticeMetadata>({
    queryKey: ["/api/notice"],
    retry: false,
  });

  const hasNotice = !isLoading && !error && !!notice;

  // Fetch a short-lived view token when a notice exists.
  // The token key encodes id + uploaded_at so it refetches when the notice is replaced.
  const tokenQueryKey = notice ? `/api/notice/view-token::${notice.id}::${notice.uploaded_at}` : null;
  const { data: tokenData, isLoading: tokenLoading } = useQuery<ViewTokenResponse>({
    queryKey: [tokenQueryKey],
    queryFn: async () => {
      const res = await fetch("/api/notice/view-token", {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to get view token");
      return res.json();
    },
    enabled: hasNotice,
    staleTime: 4 * 60 * 1000,
    retry: false,
  });

  // Build the direct view URL from the token — safe to use as embed src
  const viewUrl = tokenData?.token ? `/api/notice/view?t=${encodeURIComponent(tokenData.token)}` : null;

  const uploadMutation = useMutation({
    mutationFn: async ({ filename, data }: { filename: string; data: string }) => {
      return await apiRequest("POST", "/api/notice", { filename, data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notice"] });
      toast({ title: "Notice uploaded successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/notice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notice"] });
      setIsDeleteOpen(false);
      toast({ title: "Notice deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Only PDF files are accepted", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({ filename: file.name, data: base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isBusy = isLoading || (hasNotice && tokenLoading);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — admin only */}
      {canManage && (
        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 flex-wrap">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium mr-2">
            {hasNotice ? notice.original_filename : "No notice uploaded"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            data-testid="input-notice-file"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            variant={hasNotice ? "outline" : "default"}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            data-testid="button-upload-notice"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {hasNotice ? "Replace" : "Upload PDF"}
          </Button>
          {hasNotice && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-notice"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isBusy ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasNotice && viewUrl ? (
          <embed
            key={viewUrl}
            src={viewUrl}
            type="application/pdf"
            className="w-full h-full"
            data-testid="embed-notice-pdf"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <FileText className="h-16 w-16 opacity-20" />
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">No notice posted yet</p>
              {canManage ? (
                <p className="text-sm mt-1">
                  Upload a PDF using the button above to share it with your team.
                </p>
              ) : (
                <p className="text-sm mt-1">
                  Your admin hasn't posted a notice yet. Check back later.
                </p>
              )}
            </div>
            {canManage && (
              <>
                <input
                  ref={fileInputEmptyRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  onClick={() => fileInputEmptyRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload-notice-empty"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Notice PDF
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the notice PDF. Your team will no longer be able to view it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-notice">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-notice"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
