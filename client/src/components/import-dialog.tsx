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
import { Loader2, Upload, FileSpreadsheet, Check, AlertCircle, AlertTriangle, GitMerge, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface DuplicateInfo {
  row: number;
  mobile_no: string;
  existingLead: {
    id: string;
    full_name: string;
    mobile_no: string;
    sheet_id: string;
    sheet_name: string;
    created_at: Date;
  };
  newData: Record<string, any>;
}

export function ImportDialog({ sheetId, open, onOpenChange }: ImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "duplicates" | "complete">("upload");
  const [fileData, setFileData] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<number>>(new Set());

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
      const resultData = {
        imported: result.imported || 0,
        errors: result.errors || 0,
        warnings: result.warnings || 0,
        duplicates: result.duplicates || 0,
        errorDetails: Array.isArray(result.errorDetails) ? result.errorDetails : [],
        warningDetails: Array.isArray(result.warningDetails) ? result.warningDetails : [],
        duplicateDetails: Array.isArray(result.duplicateDetails) ? result.duplicateDetails : [],
        skippedHeaders: Array.isArray(result.skippedHeaders) ? result.skippedHeaders : [],
      };
      
      setImportResult(resultData);
      
      // If there are duplicates, show the duplicates step
      if (resultData.duplicates > 0 && resultData.duplicateDetails.length > 0) {
        setDuplicates(resultData.duplicateDetails);
        setSelectedDuplicates(new Set()); // Reset selection
        setStep("duplicates");
        toast({
          title: "Duplicates Found",
          description: `Imported ${resultData.imported} leads. Found ${resultData.duplicates} duplicates that need review.`,
        });
      } else {
        setStep("complete");
        toast({
          title: "Import complete",
          description: `Successfully imported ${resultData.imported} leads`,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads-infinite"] });
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

  // Bulk merge duplicates mutation
  const bulkMergeMutation = useMutation({
    mutationFn: async (duplicatesToMerge: DuplicateInfo[]) => {
      return await apiRequest<any>("POST", "/api/leads/bulk-merge", {
        duplicates: duplicatesToMerge.map(d => ({
          existingLeadId: d.existingLead.id,
          newData: d.newData,
        })),
        merge_strategy: "update_empty",
        source: `Import: ${previewData?.fileName || "upload"}`,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads-infinite"] });
      toast({
        title: "Merge Complete",
        description: result.message || `Merged ${result.merged} leads`,
      });
      setStep("complete");
    },
    onError: (error: any) => {
      toast({
        title: "Merge Failed",
        description: error.message || "Failed to merge duplicates",
        variant: "destructive",
      });
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
    setDuplicates([]);
    setSelectedDuplicates(new Set());
    onOpenChange(false);
  };

  // Toggle duplicate selection
  const toggleDuplicateSelection = (rowNumber: number) => {
    setSelectedDuplicates(prev => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  // Select/deselect all duplicates
  const toggleSelectAll = () => {
    if (selectedDuplicates.size === duplicates.length) {
      setSelectedDuplicates(new Set());
    } else {
      setSelectedDuplicates(new Set(duplicates.map(d => d.row)));
    }
  };

  // Merge selected duplicates
  const handleMergeSelected = () => {
    const toMerge = duplicates.filter(d => selectedDuplicates.has(d.row));
    if (toMerge.length > 0) {
      bulkMergeMutation.mutate(toMerge);
    }
  };

  // Skip duplicates and complete
  const handleSkipDuplicates = () => {
    toast({
      title: "Duplicates Skipped",
      description: `${duplicates.length} duplicate leads were not imported`,
    });
    setStep("complete");
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
            {step === "duplicates" && "Review duplicate leads found in your import"}
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

          {step === "duplicates" && duplicates.length > 0 && (
            <div className="space-y-4 py-4">
              <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>{duplicates.length} duplicate leads</strong> were found with mobile numbers that already exist in your company.
                  Select which ones you want to merge into existing leads, or skip all to complete the import.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedDuplicates.size === duplicates.length}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all-duplicates"
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Select all ({duplicates.length})
                  </Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedDuplicates.size} selected for merge
                </span>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-4 space-y-3">
                  {duplicates.map((dup) => (
                    <div
                      key={dup.row}
                      className={`p-3 border rounded-lg transition-colors ${
                        selectedDuplicates.has(dup.row)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      data-testid={`duplicate-row-${dup.row}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`dup-${dup.row}`}
                          checked={selectedDuplicates.has(dup.row)}
                          onCheckedChange={() => toggleDuplicateSelection(dup.row)}
                          className="mt-1"
                          data-testid={`checkbox-duplicate-${dup.row}`}
                        />
                        <div className="flex-1 grid md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Row {dup.row} - New Data:</p>
                            <p className="text-sm font-medium">{dup.newData.full_name || "N/A"}</p>
                            <p className="text-sm">{dup.mobile_no}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Existing Lead:</p>
                            <p className="text-sm font-medium">{dup.existingLead.full_name}</p>
                            <p className="text-sm">{dup.existingLead.mobile_no}</p>
                            <p className="text-xs text-muted-foreground">
                              Sheet: {dup.existingLead.sheet_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

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
          {step === "duplicates" && (
            <div className="flex items-center gap-2 w-full justify-between">
              <div className="text-sm text-muted-foreground">
                {importResult?.imported || 0} leads imported
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipDuplicates}
                  disabled={bulkMergeMutation.isPending}
                  data-testid="button-skip-duplicates"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Skip All ({duplicates.length})
                </Button>
                <Button
                  type="button"
                  onClick={handleMergeSelected}
                  disabled={selectedDuplicates.size === 0 || bulkMergeMutation.isPending}
                  data-testid="button-merge-selected"
                >
                  {bulkMergeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!bulkMergeMutation.isPending && <GitMerge className="mr-2 h-4 w-4" />}
                  Merge Selected ({selectedDuplicates.size})
                </Button>
              </div>
            </div>
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
