import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, subDays, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, AlertCircle, Settings, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import type { Lead, CustomColumn } from "@shared/schema";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";

interface SiteVisitConfig {
  status_column?: string;
  status_value?: string;
  date_column?: string;
  card_columns?: string[];
}

interface EnrichedVisit extends Lead {
  sheet_name: string;
  owner_name: string;
  last_update?: {
    created_at: string;
    remark: string | null;
    created_by_name: string | null;
  } | null;
}

interface VisitsResponse {
  visits: EnrichedVisit[];
  config: SiteVisitConfig | null;
  total: number;
  message?: string;
}

const sheetColors = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
];

function getSheetColor(sheetName: string): string {
  let hash = 0;
  for (let i = 0; i < sheetName.length; i++) {
    hash = sheetName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return sheetColors[Math.abs(hash) % sheetColors.length];
}

export default function Visits() {
  const { isCompanyAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { getCurrentDate, isSameDay: isSameDayTz } = useCompanyTimezone();
  
  // Initialize with company timezone's current date
  const todayInTz = getCurrentDate();
  const [currentMonth, setCurrentMonth] = useState(todayInTz);
  const [selectedDate, setSelectedDate] = useState<Date | null>(todayInTz);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data, isLoading, error } = useQuery<VisitsResponse>({
    queryKey: [`/api/visits?start_date=${startDate}&end_date=${endDate}`],
  });

  const { data: columnsData } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const columnsMap = useMemo(() => {
    const map = new Map<string, CustomColumn>();
    columnsData?.forEach(col => map.set(col.column_key, col));
    return map;
  }, [columnsData]);

  const visitsByDate = useMemo(() => {
    if (!data?.visits || !data?.config?.date_column) return new Map<string, EnrichedVisit[]>();
    
    const grouped = new Map<string, EnrichedVisit[]>();
    for (const visit of data.visits) {
      const dateValue = visit.custom_fields?.[data.config.date_column];
      if (dateValue) {
        const dateStr = String(dateValue).split('T')[0];
        if (!grouped.has(dateStr)) {
          grouped.set(dateStr, []);
        }
        grouped.get(dateStr)!.push(visit);
      }
    }
    return grouped;
  }, [data]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedDateVisits = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return visitsByDate.get(dateStr) || [];
  }, [selectedDate, visitsByDate]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = getCurrentDate();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const getVisitCount = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return visitsByDate.get(dateStr)?.length || 0;
  };

  const cardColumns = data?.config?.card_columns || [];

  if (isLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-auto">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-64 w-full lg:w-72" />
          <Skeleton className="h-64 flex-1 hidden lg:block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading visits</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data?.config) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Visit Schedules
            </CardTitle>
            <CardDescription>
              Configure site visit tracking to see scheduled visits here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription className="mt-2">
                {data?.message || "Site visit configuration is not set up yet."}
                {isCompanyAdmin && (
                  <div className="mt-3">
                    <Link href="/admin">
                      <Button size="sm" data-testid="button-go-to-admin">
                        <Settings className="h-4 w-4 mr-2" />
                        Go to Admin Console
                      </Button>
                    </Link>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-4 bg-background shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Visit Schedules</h1>
          {data?.total > 0 && (
            <Badge variant="secondary" className="text-xs">{data.total} this month</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-go-to-today">
          Today
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isMobile ? (
          <MobileLayout
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            calendarDays={calendarDays}
            visitsByDate={visitsByDate}
            selectedDateVisits={selectedDateVisits}
            cardColumns={cardColumns}
            columnsMap={columnsMap}
            dateColumn={data.config?.date_column || ''}
            statusColumn={data.config?.status_column || ''}
            getVisitCount={getVisitCount}
            goToPreviousMonth={goToPreviousMonth}
            goToNextMonth={goToNextMonth}
            setSelectedDate={setSelectedDate}
            setSelectedLeadId={setSelectedLeadId}
            isToday={(date) => isSameDayTz(date, todayInTz)}
          />
        ) : (
          <DesktopLayout
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            calendarDays={calendarDays}
            visitsByDate={visitsByDate}
            selectedDateVisits={selectedDateVisits}
            cardColumns={cardColumns}
            columnsMap={columnsMap}
            dateColumn={data.config?.date_column || ''}
            statusColumn={data.config?.status_column || ''}
            getVisitCount={getVisitCount}
            goToPreviousMonth={goToPreviousMonth}
            goToNextMonth={goToNextMonth}
            setSelectedDate={setSelectedDate}
            setSelectedLeadId={setSelectedLeadId}
            isToday={(date) => isSameDayTz(date, todayInTz)}
          />
        )}
      </div>

      {selectedLeadId && (
        <LeadDetailDrawer
          leadId={selectedLeadId}
          open={!!selectedLeadId}
          onOpenChange={(open) => !open && setSelectedLeadId(null)}
        />
      )}
    </div>
  );
}

interface LayoutProps {
  currentMonth: Date;
  selectedDate: Date | null;
  calendarDays: Date[];
  visitsByDate: Map<string, EnrichedVisit[]>;
  selectedDateVisits: EnrichedVisit[];
  cardColumns: string[];
  columnsMap: Map<string, CustomColumn>;
  dateColumn: string;
  statusColumn: string;
  getVisitCount: (date: Date) => number;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  setSelectedDate: (date: Date) => void;
  setSelectedLeadId: (id: string | null) => void;
  isToday: (date: Date) => boolean;
}

function MobileLayout({
  currentMonth,
  selectedDate,
  calendarDays,
  selectedDateVisits,
  cardColumns,
  columnsMap,
  dateColumn,
  statusColumn,
  getVisitCount,
  goToPreviousMonth,
  goToNextMonth,
  setSelectedDate,
  setSelectedLeadId,
  isToday,
}: LayoutProps) {
  return (
    <div className="p-4 pb-24 space-y-4">
      <CompactCalendar
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        calendarDays={calendarDays}
        getVisitCount={getVisitCount}
        goToPreviousMonth={goToPreviousMonth}
        goToNextMonth={goToNextMonth}
        setSelectedDate={setSelectedDate}
        isToday={isToday}
      />
      
      <VisitsList
        selectedDate={selectedDate}
        selectedDateVisits={selectedDateVisits}
        cardColumns={cardColumns}
        columnsMap={columnsMap}
        dateColumn={dateColumn}
        statusColumn={statusColumn}
        setSelectedLeadId={setSelectedLeadId}
        isMobileView={true}
      />
    </div>
  );
}

function DesktopLayout({
  currentMonth,
  selectedDate,
  calendarDays,
  selectedDateVisits,
  cardColumns,
  columnsMap,
  dateColumn,
  statusColumn,
  getVisitCount,
  goToPreviousMonth,
  goToNextMonth,
  setSelectedDate,
  setSelectedLeadId,
  isToday,
}: LayoutProps) {
  return (
    <div className="h-full flex gap-4 p-4">
      <div className="w-72 shrink-0">
        <CompactCalendar
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          calendarDays={calendarDays}
          getVisitCount={getVisitCount}
          goToPreviousMonth={goToPreviousMonth}
          goToNextMonth={goToNextMonth}
          setSelectedDate={setSelectedDate}
          isToday={isToday}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <VisitsList
          selectedDate={selectedDate}
          selectedDateVisits={selectedDateVisits}
          cardColumns={cardColumns}
          columnsMap={columnsMap}
          dateColumn={dateColumn}
          statusColumn={statusColumn}
          setSelectedLeadId={setSelectedLeadId}
        />
      </div>
    </div>
  );
}

interface CompactCalendarProps {
  currentMonth: Date;
  selectedDate: Date | null;
  calendarDays: Date[];
  getVisitCount: (date: Date) => number;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  setSelectedDate: (date: Date) => void;
  isToday: (date: Date) => boolean;
}

function CompactCalendar({
  currentMonth,
  selectedDate,
  calendarDays,
  getVisitCount,
  goToPreviousMonth,
  goToNextMonth,
  setSelectedDate,
  isToday,
}: CompactCalendarProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-sm font-medium" data-testid="text-current-month">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={goToNextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={`${day}-${i}`} className="text-center text-xs font-medium text-muted-foreground py-0.5">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}
          
          {calendarDays.map(day => {
            const visitCount = getVisitCount(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isDayToday = isToday(day);  // Using timezone-aware isToday from props
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "h-8 flex flex-col items-center justify-center rounded-md text-xs transition-colors relative",
                  isSelected && "bg-primary text-primary-foreground",
                  !isSelected && isDayToday && "ring-1 ring-primary",
                  !isSelected && !isDayToday && "hover:bg-muted",
                  visitCount > 0 && !isSelected && "font-semibold"
                )}
                data-testid={`button-date-${format(day, 'yyyy-MM-dd')}`}
              >
                <span className={cn(
                  !isSameMonth(day, currentMonth) && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                {visitCount > 0 && (
                  <div className={cn(
                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface VisitsListProps {
  selectedDate: Date | null;
  selectedDateVisits: EnrichedVisit[];
  cardColumns: string[];
  columnsMap: Map<string, CustomColumn>;
  dateColumn: string;
  statusColumn: string;
  setSelectedLeadId: (id: string | null) => void;
  isMobileView?: boolean;
}

function VisitsList({
  selectedDate,
  selectedDateVisits,
  cardColumns,
  columnsMap,
  dateColumn,
  statusColumn,
  setSelectedLeadId,
  isMobileView = false,
}: VisitsListProps) {
  if (!selectedDate) {
    return (
      <Card className="flex items-center justify-center shadow-sm">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a date to view visits</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-medium text-sm" data-testid="text-selected-date">
          {format(selectedDate, 'EEE, MMM d')}
        </h2>
        <Badge variant="secondary" className="text-xs">{selectedDateVisits.length} visit{selectedDateVisits.length !== 1 ? 's' : ''}</Badge>
      </div>

      {selectedDateVisits.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No visits scheduled</p>
          </CardContent>
        </Card>
      ) : isMobileView ? (
        <div className="grid grid-cols-1 gap-2">
          {selectedDateVisits.map(visit => (
            <VisitCard
              key={visit.id}
              visit={visit}
              cardColumns={cardColumns}
              columnsMap={columnsMap}
              dateColumn={dateColumn}
              statusColumn={statusColumn}
              onClick={() => setSelectedLeadId(visit.id)}
            />
          ))}
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pr-2">
            {selectedDateVisits.map(visit => (
              <VisitCard
                key={visit.id}
                visit={visit}
                cardColumns={cardColumns}
                columnsMap={columnsMap}
                dateColumn={dateColumn}
                statusColumn={statusColumn}
                onClick={() => setSelectedLeadId(visit.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface VisitCardProps {
  visit: EnrichedVisit;
  cardColumns: string[];
  columnsMap: Map<string, CustomColumn>;
  dateColumn: string;
  statusColumn: string;
  onClick: () => void;
}

function VisitCard({ visit, cardColumns, columnsMap, dateColumn, statusColumn, onClick }: VisitCardProps) {
  const displayColumns = cardColumns.length > 0 ? cardColumns : ['requirement', 'project_location'];
  
  // Get the actual visit date from the lead's date column
  const visitDate = useMemo(() => {
    const dateValue = visit.custom_fields?.[dateColumn];
    if (!dateValue) return null;
    try {
      return parseISO(String(dateValue).split('T')[0]);
    } catch {
      return null;
    }
  }, [visit.custom_fields, dateColumn]);
  
  // Determine if last update was NOT done the day before the visit
  const isFollowUpMissing = useMemo(() => {
    if (!visit.last_update || !visitDate) return false;
    
    const lastUpdateDate = startOfDay(parseISO(visit.last_update.created_at));
    const dayBeforeVisit = startOfDay(subDays(visitDate, 1));
    
    // Highlight if the last update was NOT on the day before the visit
    // The follow-up should happen exactly on the previous day
    // Using isSameDay to check if they match
    return !isSameDay(lastUpdateDate, dayBeforeVisit);
  }, [visit.last_update, visitDate]);
  
  const getFieldValue = (key: string): any => {
    const enrichedFields: Record<string, any> = {
      sheet_name: visit.sheet_name,
      owner_name: visit.owner_name,
    };
    return enrichedFields[key] ?? visit.custom_fields?.[key];
  };
  
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    const column = columnsMap.get(key);
    if ((column?.type === 'date' || column?.type === 'datetime') && value) {
      try {
        return format(parseISO(String(value)), 'MMM d, h:mm a');
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const fullName = visit.custom_fields?.full_name || visit.custom_fields?.["Full Name"] || "Unknown";
  const mobile = visit.custom_fields?.mobile_no || visit.custom_fields?.["Mobile No"] || "";

  const cleanMobile = mobile ? String(mobile).replace(/[^0-9]/g, '') : "";
  const whatsappNumber = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cleanMobile) {
      window.location.href = `tel:${cleanMobile}`;
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cleanMobile) {
      window.open(`https://wa.me/${whatsappNumber}`, '_blank');
    }
  };

  const sheetColorClass = getSheetColor(visit.sheet_name);

  return (
    <Card 
      className="cursor-pointer hover-elevate transition-all shadow-sm group"
      onClick={onClick}
      data-testid={`card-visit-${visit.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate text-sm leading-tight" data-testid={`text-visit-name-${visit.id}`}>
              {fullName}
            </h3>
            {mobile && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{mobile}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {cleanMobile && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCall}
                  data-testid={`button-call-${visit.id}`}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleWhatsApp}
                  className="text-green-600"
                  data-testid={`button-whatsapp-${visit.id}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <div className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
            sheetColorClass
          )}>
            {visit.sheet_name}
          </div>
          {visit.custom_fields?.["visit_type"] && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-visit-type-${visit.id}`}>
              {String(visit.custom_fields["visit_type"])}
            </Badge>
          )}
        </div>

        {displayColumns.filter(colKey => colKey !== 'full_name' && colKey !== 'mobile_no' && colKey !== dateColumn).length > 0 && (
          <div className="mt-2 pt-2 border-t border-dashed space-y-0.5">
            {displayColumns.map(colKey => {
              if (colKey === 'full_name' || colKey === 'mobile_no' || colKey === dateColumn) return null;
              const column = columnsMap.get(colKey);
              const value = getFieldValue(colKey);
              if (!column || value === undefined || value === null || value === '') return null;
              
              return (
                <div key={colKey} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-muted-foreground truncate">{column.name}</span>
                  <span className="font-medium truncate text-right">{formatValue(colKey, value)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-dashed space-y-1">
          {visit.custom_fields?.next_followup_date && (
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground">Next Follow-up</span>
              <span className="font-medium text-primary">
                {(() => {
                  try {
                    return format(parseISO(String(visit.custom_fields.next_followup_date)), 'MMM d, h:mm a');
                  } catch {
                    return String(visit.custom_fields.next_followup_date);
                  }
                })()}
              </span>
            </div>
          )}
          {visit.last_update ? (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Update
                </span>
                <span className={cn(
                  "text-xs font-medium",
                  isFollowUpMissing ? "text-destructive" : "text-muted-foreground"
                )}>
                  {format(parseISO(visit.last_update.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              {visit.last_update.remark && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  "{visit.last_update.remark}"
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last Update
              </span>
              <span className="text-xs text-destructive font-medium">No updates</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
