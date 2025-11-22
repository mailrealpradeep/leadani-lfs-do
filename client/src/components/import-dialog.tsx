import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportDialogProps {
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewData {
  headers: string[];
  fieldMap: Record<string, string>;
  preview: any[];
  totalRows: number;
  fileName: string;
  companyColumns?: any[];
}

export function ImportDialog({ sheetId, open, onOpenChange }: ImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "complete">("upload");
  const [fileData, setFileData] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<any>(null);

  const previewMutation = useMutation({
    mutationFn: async (data: { fileData: string; fileName: string }) => {
      return await apiRequest<PreviewData>("POST", `/api/sheets/${sheetId}/import/preview`, data);
    },
    onSuccess: (data) => {
      setPreviewData(data);
      // Initialize fieldMap with ALL headers (auto-mapped + unmapped as empty string)
      const fullMapping: Record<string, string> = { ...data.fieldMap };
      data.headers.forEach(header => {
        if (!fullMapping[header]) {
          fullMapping[header] = ""; // Unmapped headers default to empty (will be skipped)
        }
      });
      setFieldMapping(fullMapping);
      setStep("mapping");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to process file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<any>("POST", `/api/sheets/${sheetId}/import/execute`, {
        fileData,
        fieldMap: fieldMapping, // Backend will compute skippedHeaders from _skip mappings
        fileName: previewData?.fileName,
      });
    },
    onSuccess: (result) => {
      // Ensure result has expected structure with defaults
      setImportResult({
        imported: result.imported || 0,
        errors: result.errors || 0,
        warnings: result.warnings || 0,
        errorDetails: Array.isArray(result.errorDetails) ? result.errorDetails : [],
        warningDetails: Array.isArray(result.warningDetails) ? result.warningDetails : [],
        skippedHeaders: Array.isArray(result.skippedHeaders) ? result.skippedHeaders : [],
      });
      setStep("complete");
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
      toast({
        title: "Import complete",
        description: `Successfully imported ${result.imported || 0} leads`,
      });
    },
    onError: (error: any) => {
      // For validation errors (e.g., unmapped required columns), show detailed message
      toast({
        title: "Import failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
      // Clear stale import result and reset to mapping step so user can fix the issue
      setImportResult(null);
      setStep("mapping");
    },
  });

  const handleFileChange = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = btoa(
        new Uint8Array(e.target?.result as ArrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      setFileData(base64);
      previewMutation.mutate({ fileData: base64, fileName: file.name });
    };
    reader.readAsArrayBuffer(file);
  }, [previewMutation, toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, [handleFileChange]);

  const handleClose = () => {
    setStep("upload");
    setFileData(null);
    setPreviewData(null);
    setFieldMapping({});
    setImportResult(null);
    onOpenChange(false);
  };

  const handleFieldMappingChange = (excelHeader: string, crmField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [excelHeader]: crmField, // Keep _skip in mapping instead of deleting
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col w-[95vw] md:w-auto">
        <DialogHeader>
          <DialogTitle>Import Leads from Excel</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload an Excel or CSV file to import leads"}
            {step === "mapping" && "Map Excel columns to CRM fields"}
            {step === "complete" && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === "upload" && (
            <div className="space-y-4 py-4">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-border"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                data-testid="area-file-drop"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-1">Drop your file here</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse (.xlsx, .xls, .csv)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                      data-testid="input-import-file"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-browse-file"
                    >
                      Browse Files
                    </Button>
                  </div>
                  {previewMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-processing">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing file...
                    </div>
                  )}
                </div>
              </div>

              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  Your Excel file should have headers in the first row. We'll automatically map common column names to CRM fields.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === "mapping" && previewData && (() => {
            // Build dynamic field list from company's custom columns
            const allFields = [
              { value: "_skip", label: "-- Skip Column --" },
              { value: "_lead_updates", label: "📝 Lead Updates (History)" },
              ...(previewData.companyColumns || []).map(col => ({
                value: col.column_key,
                label: `${col.name}${col.config.required ? ' *' : ''}`,
              })),
            ];
            
            return (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground" data-testid="text-file-info">
                  File: <span className="font-medium">{previewData.fileName}</span> • {previewData.totalRows} rows
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Field Mapping</h3>
                <div className="grid grid-cols-3 gap-4" data-testid="container-field-mapping">
                    {previewData.headers.map((header) => (
                      <div key={header} className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{header}</Label>
                        <Select
                          value={fieldMapping[header] || ""}
                          onValueChange={(value) => handleFieldMappingChange(header, value)}
                        >
                          <SelectTrigger data-testid={`select-map-${header.replace(/\s+/g, '-').toLowerCase()}`}>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {allFields.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <h3 className="font-medium mb-2">Preview (first 10 rows)</h3>
                    <div className="border rounded-lg overflow-auto">
                      <table className="w-full text-sm" data-testid="table-import-preview">
                        <thead className="bg-muted">
                          <tr>
                            {previewData.headers.map((header) => (
                              <th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.preview.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {previewData.headers.map((header) => (
                                <td key={header} className="px-3 py-2 whitespace-nowrap">
                                  {row[header] !== null ? String(row[header]) : "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
            </div>
            );
          })()}

          {step === "complete" && importResult && (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center" data-testid="icon-success">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Import Successful!</h3>
                  <p className="text-muted-foreground" data-testid="text-import-result">
                    {importResult.imported} leads imported successfully
                  </p>
                  {importResult.skippedHeaders && importResult.skippedHeaders.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2" data-testid="text-skipped-headers">
                      Skipped {importResult.skippedHeaders.length} unmapped column{importResult.skippedHeaders.length > 1 ? 's' : ''}: {importResult.skippedHeaders.join(", ")}
                    </p>
                  )}
                </div>
                
                {importResult.warnings && importResult.warnings > 0 && (
                  <Alert className="max-w-md" data-testid="alert-import-warnings">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {importResult.warnings} rows imported with warnings (data coerced/converted)
                      {importResult.warningDetails && Array.isArray(importResult.warningDetails) && importResult.warningDetails.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1">
                          {importResult.warningDetails.slice(0, 5).map((w: any, idx: number) => (
                            <div key={idx}>
                              <strong>Row {w.row}:</strong> {w.warnings.join("; ")}
                            </div>
                          ))}
                          {importResult.warningDetails.length > 5 && (
                            <div className="italic">+ {importResult.warningDetails.length - 5} more warnings...</div>
                          )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {importResult.errors && importResult.errors > 0 && (
                  <Alert variant="destructive" className="max-w-md" data-testid="alert-import-errors">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {importResult.errors} rows failed to import
                      {importResult.errorDetails && Array.isArray(importResult.errorDetails) && importResult.errorDetails.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1">
                          {importResult.errorDetails.slice(0, 5).map((e: any, idx: number) => (
                            <div key={idx}>
                              <strong>Row {e.row}:</strong> {e.error}
                              {e.warnings && e.warnings.length > 0 && (
                                <div className="text-xs opacity-75 mt-0.5">Also: {e.warnings.join("; ")}</div>
                              )}
                            </div>
                          ))}
                          {importResult.errorDetails.length > 5 && (
                            <div className="italic">+ {importResult.errorDetails.length - 5} more errors...</div>
                          )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-import">
              Cancel
            </Button>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")} data-testid="button-back-import">
                Back
              </Button>
              <Button
                onClick={() => executeMutation.mutate()}
                disabled={executeMutation.isPending}
                data-testid="button-execute-import"
              >
                {executeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {previewData?.totalRows} Leads
              </Button>
            </>
          )}
          {step === "complete" && (
            <Button onClick={handleClose} data-testid="button-close-import">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
