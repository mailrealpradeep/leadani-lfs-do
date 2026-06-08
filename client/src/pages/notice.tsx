import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface NoticeMetadata {
  id: string;
  original_filename: string;
  uploaded_by: string;
  uploaded_at: string;
}

function usePdfBlobUrl(noticeKey: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);

  useEffect(() => {
    if (!noticeKey) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setBlobLoading(false);
      return;
    }

    let cancelled = false;
    setBlobLoading(true);

    const token =
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("auth_token");

    fetch("/api/notice/file", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load notice");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setBlobLoading(false);
      })
      .catch(() => {
        if (!cancelled) setBlobLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noticeKey]);

  return { blobUrl, blobLoading };
}

export default function NoticePage() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputEmptyRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const canManage = isCompanyAdmin || isSuperAdmin;

  const { data: notice, isLoading, error } = useQuery<NoticeMetadata>({
    queryKey: ["/api/notice"],
    retry: false,
  });

  const hasNotice = !isLoading && !error && !!notice;
  const noticeKey = notice ? `${notice.id}::${notice.uploaded_at}` : null;
  const { blobUrl, blobLoading } = usePdfBlobUrl(noticeKey);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(Math.floor(width) - 32);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async ({ filename, data }: { filename: string; data: string }) => {
      return await apiRequest("POST", "/api/notice", { filename, data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notice"] });
      setNumPages(null);
      setPageNumber(1);
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
      setNumPages(null);
      setPageNumber(1);
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

  const isBusy = isLoading || (hasNotice && blobLoading);

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
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto bg-muted/30">
        {isBusy ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasNotice && blobUrl ? (
          <div className="flex flex-col items-center py-4 gap-3">
            {/* Page navigation */}
            {numPages && numPages > 1 && (
              <div className="flex items-center gap-3 bg-background border rounded-md px-3 py-1.5 shadow-sm">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  data-testid="button-notice-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground select-none">
                  Page {pageNumber} of {numPages}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                  data-testid="button-notice-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Document
              file={blobUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                  <FileText className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Could not render PDF.</p>
                </div>
              }
              data-testid="document-notice-pdf"
            >
              <Page
                pageNumber={pageNumber}
                width={Math.min(containerWidth, 900)}
                renderTextLayer
                renderAnnotationLayer
              />
            </Document>
          </div>
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
