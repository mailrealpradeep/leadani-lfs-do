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
}

const CRM_FIELDS = [
  { value: "_skip", label: "-- Skip Column --" },
  { value: "lead_date", label: "Lead Date" },
  { value: "lead_time", label: "Time" },
  { value: "executive", label: "Executive" },
  { value: "lang", label: "Language" },
  { value: "address", label: "Address" },
  { value: "name", label: "Name" },
  { value: "mobile_no", label: "Mobile No" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "occupation", label: "Occupation" },
  { value: "qualification", label: "Qualification" },
  { value: "age", label: "Age" },
  { value: "exam_end", label: "Exam End" },
  { value: "exam_mark", label: "Exam Mark" },
  { value: "lead_status", label: "Lead Status" },
  { value: "visit_status", label: "Visit Status" },
  { value: "visit_date", label: "Visit Date" },
  { value: "nfdt", label: "NFDT" },
  { value: "call_1", label: "Call 1" },
  { value: "feedback_1", label: "Feedback 1" },
];

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
      setFieldMapping(data.fieldMap);
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
      // Calculate unmapped headers (headers not in field mapping or mapped to _skip)
      const unmappedHeaders = previewData?.headers.filter(
        (header: string) => !fieldMapping[header] || fieldMapping[header] === "_skip"
      ).filter((header: string) => header && header.trim() && header !== " ");
      
      return await apiRequest<any>("POST", `/api/sheets/${sheetId}/import/execute`, {
        fileData,
        fieldMap: fieldMapping,
        unmappedHeaders,
        fileName: previewData?.fileName,
      });
    },
    onSuccess: (result) => {
      setImportResult(result);
      setStep("complete");
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets", sheetId, "columns"] });
      toast({
        title: "Import complete",
        description: `Successfully imported ${result.imported} leads${result.createdColumns?.length ? ` (${result.createdColumns.length} new columns created)` : ""}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message,
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
    onOpenChange(false);
  };

  const handleFieldMappingChange = (excelHeader: string, crmField: string) => {
    setFieldMapping((prev) => {
      const newMapping = { ...prev };
      if (crmField === "_skip") {
        delete newMapping[excelHeader];
      } else {
        newMapping[excelHeader] = crmField;
      }
      return newMapping;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Leads from Excel</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload an Excel or CSV file to import leads"}
            {step === "mapping" && "Map Excel columns to CRM fields"}
            {step === "complete" && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
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

          {step === "mapping" && previewData && (
            <div className="space-y-4 py-4 h-full flex flex-col">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground" data-testid="text-file-info">
                  File: <span className="font-medium">{previewData.fileName}</span> • {previewData.totalRows} rows
                </p>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-4 space-y-4">
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
                            {CRM_FIELDS.map((field) => (
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
                  {importResult.createdColumns && importResult.createdColumns.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2" data-testid="text-created-columns">
                      Created {importResult.createdColumns.length} new custom columns:{" "}
                      {importResult.createdColumns.join(", ")}
                    </p>
                  )}
                </div>
                
                {importResult.errors > 0 && (
                  <Alert variant="destructive" className="max-w-md" data-testid="alert-import-errors">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {importResult.errors} rows failed to import. Check the console for details.
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
