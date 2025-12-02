import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, ChevronLeft, ChevronRight, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { LeadUpdateHistoryDialog } from "@/components/lead-update-history-dialog";
import type { CustomColumn, DropdownOption } from "@shared/schema";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import { parse } from "date-fns";

interface ExecutivePerformanceData {
  column_key: string;
  option_value: string;
  sheets: Array<{
    sheet_id: string;
    sheet_name: string;
    today: number;
    this_week: number;
    last_30_days: number;
    total: number;
  }>;
  generated_at: string;
}

interface DrilldownResponse {
  leads: any[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export function ExecutivePerformanceCard() {
  const isMobile = useIsMobile();
  const { formatInTimezone } = useCompanyTimezone();
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<string>("");
  
  // Drilldown modal state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownSheetId, setDrilldownSheetId] = useState("");
  const [drilldownTimePeriod, setDrilldownTimePeriod] = useState<string>("total");
  const [drilldownTitle, setDrilldownTitle] = useState("");
  const [drilldownPage, setDrilldownPage] = useState(1);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<string>("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const prevOpenRef = useRef(false);
  const prevContextRef = useRef<string>("");
  
  // Fetch company columns (only dropdown types)
  const { data: companyColumns = [], isLoading: columnsLoading } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/company/columns", {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch columns");
      return res.json();
    },
  });
  
  // Filter to only dropdown columns
  const dropdownColumns = companyColumns.filter(col => col.type === "dropdown");
  
  // Set default column when columns load
  useEffect(() => {
    if (dropdownColumns.length > 0 && !selectedColumn) {
      // Prefer "lead_status" or similar if available
      const statusColumn = dropdownColumns.find(c => 
        c.column_key.toLowerCase().includes("status") || 
        c.name.toLowerCase().includes("status")
      );
      setSelectedColumn(statusColumn?.column_key || dropdownColumns[0].column_key);
    }
  }, [dropdownColumns, selectedColumn]);
  
  // Fetch dropdown options for selected column
  const { data: dropdownOptions = [], isLoading: optionsLoading } = useQuery<DropdownOption[]>({
    queryKey: ["/api/company/dropdown-options", selectedColumn],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/company/dropdown-options/${selectedColumn}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch options");
      return res.json();
    },
    enabled: !!selectedColumn,
  });
  
  // Set default option when options load
  useEffect(() => {
    if (dropdownOptions.length > 0 && !selectedOption) {
      // Prefer options containing "visit" or "scheduled" if available
      const visitOption = dropdownOptions.find(opt => 
        opt.value.toLowerCase().includes("visit") || 
        opt.value.toLowerCase().includes("scheduled")
      );
      setSelectedOption(visitOption?.value || dropdownOptions[0].value);
    }
  }, [dropdownOptions, selectedOption]);
  
  // Reset option when column changes
  useEffect(() => {
    setSelectedOption("");
  }, [selectedColumn]);
  
  // Fetch executive performance data
  const { data: performanceData, isLoading: dataLoading, error } = useQuery<ExecutivePerformanceData>({
    queryKey: ["/api/company/executive-performance", selectedColumn, selectedOption],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();
      params.set("column_key", selectedColumn);
      params.set("option_value", selectedOption);
      
      const res = await fetch(`/api/company/executive-performance?${params.toString()}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch performance data");
      return res.json();
    },
    enabled: !!selectedColumn && !!selectedOption,
  });

  // Sort columns by order_index for display in drilldown
  const sortedColumns = [...companyColumns].sort((a, b) => a.order_index - b.order_index);

  // Drilldown reset when modal opens or context changes
  useEffect(() => {
    const currentContext = JSON.stringify({ drilldownSheetId, selectedColumn, selectedOption, drilldownTimePeriod });
    const contextChanged = prevContextRef.current !== currentContext;
    const modalOpened = !prevOpenRef.current && drilldownOpen;

    if (modalOpened || (drilldownOpen && contextChanged)) {
      setDrilldownPage(1);
    }

    prevOpenRef.current = drilldownOpen;
    prevContextRef.current = currentContext;
  }, [drilldownOpen, drilldownSheetId, selectedColumn, selectedOption, drilldownTimePeriod]);

  // Fetch drilldown data
  const { data: drilldownData, isLoading: drilldownLoading } = useQuery<DrilldownResponse>({
    queryKey: ["/api/company/executive-performance/drilldown", drilldownSheetId, selectedColumn, selectedOption, drilldownTimePeriod, drilldownPage],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();
      params.set("sheet_id", drilldownSheetId);
      params.set("column_key", selectedColumn);
      params.set("option_value", selectedOption);
      params.set("time_period", drilldownTimePeriod);
      params.set("page", drilldownPage.toString());
      params.set("limit", "50");
      
      const res = await fetch(`/api/company/executive-performance/drilldown?${params.toString()}`, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch drilldown data");
      return res.json();
    },
    enabled: drilldownOpen && !!drilldownSheetId,
  });

  const handleDrilldownClick = (sheetId: string, sheetName: string, timePeriod: string, count: number) => {
    if (count === 0) return; // Don't open drilldown for 0 counts
    setDrilldownSheetId(sheetId);
    setDrilldownTimePeriod(timePeriod);
    const periodLabel = timePeriod === "today" ? "Today" : 
                        timePeriod === "this_week" ? "This Week" : 
                        timePeriod === "last_30_days" ? "Last 30 Days" : "Total";
    setDrilldownTitle(`${sheetName} - ${selectedOption} (${periodLabel}: ${count} leads)`);
    setDrilldownOpen(true);
  };

  // Format date for display - handles both ISO strings and user-entered formatted dates
  const formatDateForDisplay = (value: any): string => {
    if (!value) return "-";
    try {
      const strValue = String(value);
      // If it's already in dd/MM/yy format, return as-is (user-entered local date)
      const localDateMatch = strValue.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/);
      if (localDateMatch) {
        return strValue;
      }
      // For ISO strings or Date objects, use company timezone
      const isoDate = new Date(value);
      if (!isNaN(isoDate.getTime())) {
        return formatInTimezone(value, "dd/MM/yy");
      }
    } catch (e) {}
    return String(value);
  };

  // Get field value for display
  const getFieldValue = (lead: any, column: CustomColumn): string => {
    const value = lead.custom_fields?.[column.column_key];
    if (value === null || value === undefined || value === "") return "-";
    
    if (column.type === "date") {
      return formatDateForDisplay(value);
    }
    
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  const leads = drilldownData?.leads || [];
  const totalPages = drilldownData?.total_pages || 1;
  
  // Calculate totals for footer row
  const totals = performanceData?.sheets?.reduce((acc, sheet) => ({
    today: acc.today + sheet.today,
    this_week: acc.this_week + sheet.this_week,
    last_30_days: acc.last_30_days + sheet.last_30_days,
    total: acc.total + sheet.total,
  }), { today: 0, this_week: 0, last_30_days: 0, total: 0 }) || { today: 0, this_week: 0, last_30_days: 0, total: 0 };

  const isLoading = columnsLoading || optionsLoading || dataLoading;

  return (
    <>
      <Card className="w-full" data-testid="card-executive-performance">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Executive Performance</CardTitle>
                <CardDescription className="text-xs">
                  Track lead counts by sheet (executive) and time period
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-performance-column">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownColumns.map((col) => (
                    <SelectItem key={col.id} value={col.column_key}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedOption} onValueChange={setSelectedOption}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-performance-option">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.value}>
                      {opt.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {columnsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : dropdownColumns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <CalendarCheck className="h-10 w-10 mb-2" />
              <p className="text-sm">No dropdown columns configured</p>
              <p className="text-xs">Add dropdown columns in Settings to use this feature</p>
            </div>
          ) : !selectedColumn || !selectedOption ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Select a column and option to view performance data
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive text-sm">
              Error loading data
            </div>
          ) : performanceData?.sheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-sm">No data available</p>
              <p className="text-xs">No leads found matching "{selectedOption}"</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm" data-testid="table-executive-performance">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Sheet (Executive)</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Today</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">This Week</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Last 30 Days</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData?.sheets.map((sheet) => (
                    <tr key={sheet.sheet_id} className="border-b hover-elevate" data-testid={`row-performance-${sheet.sheet_id}`}>
                      <td className="px-3 py-2 font-medium">{sheet.sheet_name}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDrilldownClick(sheet.sheet_id, sheet.sheet_name, "today", sheet.today)}
                          className={`${sheet.today > 0 ? "text-primary hover:underline cursor-pointer" : "text-muted-foreground"}`}
                          disabled={sheet.today === 0}
                          data-testid={`drilldown-${sheet.sheet_id}-today`}
                        >
                          {sheet.today}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDrilldownClick(sheet.sheet_id, sheet.sheet_name, "this_week", sheet.this_week)}
                          className={`${sheet.this_week > 0 ? "text-primary hover:underline cursor-pointer" : "text-muted-foreground"}`}
                          disabled={sheet.this_week === 0}
                          data-testid={`drilldown-${sheet.sheet_id}-this_week`}
                        >
                          {sheet.this_week}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDrilldownClick(sheet.sheet_id, sheet.sheet_name, "last_30_days", sheet.last_30_days)}
                          className={`${sheet.last_30_days > 0 ? "text-primary hover:underline cursor-pointer" : "text-muted-foreground"}`}
                          disabled={sheet.last_30_days === 0}
                          data-testid={`drilldown-${sheet.sheet_id}-last_30_days`}
                        >
                          {sheet.last_30_days}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDrilldownClick(sheet.sheet_id, sheet.sheet_name, "total", sheet.total)}
                          className={`font-medium ${sheet.total > 0 ? "text-primary hover:underline cursor-pointer" : "text-muted-foreground"}`}
                          disabled={sheet.total === 0}
                          data-testid={`drilldown-${sheet.sheet_id}-total`}
                        >
                          {sheet.total}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-muted/50 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{totals.today}</td>
                    <td className="px-3 py-2 text-right">{totals.this_week}</td>
                    <td className="px-3 py-2 text-right">{totals.last_30_days}</td>
                    <td className="px-3 py-2 text-right">{totals.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drilldown Modal */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className={isMobile ? "w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh] p-3" : "max-w-5xl max-h-[85vh]"}>
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base md:text-lg flex items-center gap-2">
              {drilldownTitle}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Showing leads matching {selectedOption} for the selected time period
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {drilldownLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading leads...</div>
              </div>
            ) : leads.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">No leads found</div>
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(85vh-180px)] md:max-h-[calc(85vh-150px)]">
                {isMobile ? (
                  <div className="space-y-3">
                    {leads.map((lead: any) => (
                      <Card key={lead.id} className="p-3" data-testid={`mobile-lead-card-${lead.id}`}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {lead.sheet_name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatInTimezone(lead.created_at, "dd/MM/yy")}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {sortedColumns.slice(0, 6).map((col) => (
                              <div key={col.id}>
                                <span className="text-muted-foreground">{col.name}: </span>
                                <span className="font-medium">{getFieldValue(lead, col)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t">
                            <span className="text-xs text-muted-foreground">
                              Owner: {lead.owner_name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLeadForHistory(lead.id);
                                setHistoryDialogOpen(true);
                              }}
                              data-testid={`button-history-${lead.id}`}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Sheet</TableHead>
                        <TableHead className="w-[100px]">Owner</TableHead>
                        {sortedColumns.slice(0, 5).map((col) => (
                          <TableHead key={col.id}>{col.name}</TableHead>
                        ))}
                        <TableHead className="w-[90px]">Created</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead: any) => (
                        <TableRow key={lead.id} data-testid={`drilldown-lead-${lead.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs truncate max-w-[90px]">
                              {lead.sheet_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs truncate max-w-[100px]">
                            {lead.owner_name}
                          </TableCell>
                          {sortedColumns.slice(0, 5).map((col) => (
                            <TableCell key={col.id} className="text-xs max-w-[120px] truncate">
                              {getFieldValue(lead, col)}
                            </TableCell>
                          ))}
                          <TableCell className="text-xs">
                            {formatInTimezone(lead.created_at, "dd/MM/yy")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLeadForHistory(lead.id);
                                setHistoryDialogOpen(true);
                              }}
                              data-testid={`button-history-${lead.id}`}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <span className="text-xs text-muted-foreground">
                  Page {drilldownPage} of {totalPages} ({drilldownData?.total || 0} leads)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDrilldownPage(p => Math.max(1, p - 1))}
                    disabled={drilldownPage <= 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDrilldownPage(p => Math.min(totalPages, p + 1))}
                    disabled={drilldownPage >= totalPages}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead History Dialog */}
      {selectedLeadForHistory && (
        <LeadUpdateHistoryDialog
          leadId={selectedLeadForHistory}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />
      )}
    </>
  );
}
