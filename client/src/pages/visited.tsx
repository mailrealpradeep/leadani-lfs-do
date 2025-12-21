import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, Clock, AlertCircle, Settings, Phone, MessageCircle, CalendarCheck, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCompanyTimezone } from "@/hooks/use-company-timezone";
import type { Lead, CustomColumn } from "@shared/schema";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";

interface SiteVisitedConfig {
  status_column?: string;
  status_values?: string[];
  date_column?: string;
  card_columns?: string[];
}

interface EnrichedVisited extends Lead {
  sheet_name: string;
  owner_name: string;
  current_lead_status: string | null;
  next_followup_date: string | null;
  last_update?: {
    created_at: string;
    remark: string | null;
    created_by_name: string | null;
  } | null;
}

interface VisitedResponse {
  visited: EnrichedVisited[];
  config: SiteVisitedConfig | null;
  total: number;
  message?: string;
  availableUsers?: Array<{ id: string; name: string }>;
  canFilterByUser?: boolean;
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

export default function Visited() {
  const { isCompanyAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { getCurrentDate } = useCompanyTimezone();
  
  const todayInTz = getCurrentDate();
  const [currentMonth, setCurrentMonth] = useState(todayInTz);
  const [selectedDate, setSelectedDate] = useState<Date | null>(todayInTz);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const userFilterParam = selectedUserId !== "all" ? `&user_id=${selectedUserId}` : "";
  
  const { data, isLoading, error } = useQuery<VisitedResponse>({
    queryKey: [`/api/visited?start_date=${startDate}&end_date=${endDate}${userFilterParam}`],
  });

  const { data: columnsData } = useQuery<CustomColumn[]>({
    queryKey: ["/api/company/columns"],
  });

  const columnsMap = useMemo(() => {
    const map = new Map<string, CustomColumn>();
    columnsData?.forEach(col => map.set(col.column_key, col));
    return map;
  }, [columnsData]);

  const visitedByDate = useMemo(() => {
    if (!data?.visited || !data?.config?.date_column) return new Map<string, EnrichedVisited[]>();
    
    const grouped = new Map<string, EnrichedVisited[]>();
    for (const visit of data.visited) {
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

  const selectedDateVisited = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return visitedByDate.get(dateStr) || [];
  }, [selectedDate, visitedByDate]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = getCurrentDate();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const getVisitCount = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return visitedByDate.get(dateStr)?.length || 0;
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
          <AlertTitle>Error loading visited leads</AlertTitle>
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
              <CheckCircle2 className="h-5 w-5" />
              Visited Calendar
            </CardTitle>
            <CardDescription>
              Configure visited status values to see completed visits here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription className="mt-2">
                {data?.message || "Visited calendar configuration is not set up yet."}
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
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h1 className="text-lg font-semibold">Visited Calendar</h1>
          {data?.total > 0 && (
            <Badge variant="secondary" className="text-xs">{data.total} this month</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data?.canFilterByUser && data?.availableUsers && data.availableUsers.length > 0 && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[160px] h-8 text-sm" data-testid="select-user-filter">
                <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-user-all">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    <span>All Users</span>
                  </div>
                </SelectItem>
                {data.availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id} data-testid={`select-user-${user.id}`}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-go-to-today">
            Today
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isMobile ? (
          <MobileLayout
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            calendarDays={calendarDays}
            visitedByDate={visitedByDate}
            selectedDateVisited={selectedDateVisited}
            cardColumns={cardColumns}
            columnsMap={columnsMap}
            dateColumn={data.config?.date_column || ''}
            statusColumn={data.config?.status_column || ''}
            getVisitCount={getVisitCount}
            goToPreviousMonth={goToPreviousMonth}
            goToNextMonth={goToNextMonth}
            setSelectedDate={setSelectedDate}
            setSelectedLeadId={setSelectedLeadId}
          />
        ) : (
          <DesktopLayout
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            calendarDays={calendarDays}
            visitedByDate={visitedByDate}
            selectedDateVisited={selectedDateVisited}
            cardColumns={cardColumns}
            columnsMap={columnsMap}
            dateColumn={data.config?.date_column || ''}
            statusColumn={data.config?.status_column || ''}
            getVisitCount={getVisitCount}
            goToPreviousMonth={goToPreviousMonth}
            goToNextMonth={goToNextMonth}
            setSelectedDate={setSelectedDate}
            setSelectedLeadId={setSelectedLeadId}
          />
        )}
      </div>

      <LeadDetailDrawer 
        leadId={selectedLeadId} 
        onClose={() => setSelectedLeadId(null)}
      />
    </div>
  );
}

interface LayoutProps {
  currentMonth: Date;
  selectedDate: Date | null;
  calendarDays: Date[];
  visitedByDate: Map<string, EnrichedVisited[]>;
  selectedDateVisited: EnrichedVisited[];
  cardColumns: string[];
  columnsMap: Map<string, CustomColumn>;
  dateColumn: string;
  statusColumn: string;
  getVisitCount: (date: Date) => number;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  setSelectedDate: (date: Date) => void;
  setSelectedLeadId: (id: string) => void;
}

function MobileLayout({
  currentMonth, selectedDate, calendarDays, visitedByDate, selectedDateVisited,
  cardColumns, columnsMap, dateColumn, statusColumn, getVisitCount,
  goToPreviousMonth, goToNextMonth, setSelectedDate, setSelectedLeadId
}: LayoutProps) {
  const { getCurrentDate } = useCompanyTimezone();
  const today = getCurrentDate();
  
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{day}</div>
        ))}
        
        {Array(calendarDays[0].getDay()).fill(null).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        
        {calendarDays.map(date => {
          const count = getVisitCount(date);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          
          return (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-md text-sm relative",
                isToday && "ring-1 ring-primary",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && count > 0 && "bg-green-100 dark:bg-green-900/30",
                !isSelected && !isToday && "hover:bg-muted"
              )}
              data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
            >
              {date.getDate()}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] leading-none",
                  isSelected ? "text-primary-foreground/80" : "text-green-600 dark:text-green-400 font-medium"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="pt-2 border-t">
          <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(selectedDate, 'EEEE, MMM d')}
            {selectedDateVisited.length > 0 && (
              <Badge variant="secondary" className="text-xs">{selectedDateVisited.length}</Badge>
            )}
          </h3>
          
          {selectedDateVisited.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No visits on this day</p>
          ) : (
            <div className="space-y-2">
              {selectedDateVisited.map(visit => (
                <VisitedCard
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
          )}
        </div>
      )}
    </div>
  );
}

function DesktopLayout({
  currentMonth, selectedDate, calendarDays, visitedByDate, selectedDateVisited,
  cardColumns, columnsMap, dateColumn, statusColumn, getVisitCount,
  goToPreviousMonth, goToNextMonth, setSelectedDate, setSelectedLeadId
}: LayoutProps) {
  const { getCurrentDate } = useCompanyTimezone();
  const today = getCurrentDate();
  
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 sm:p-6 h-full">
      <Card className="lg:w-80 shrink-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array(calendarDays[0].getDay()).fill(null).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {calendarDays.map(date => {
              const count = getVisitCount(date);
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-md text-sm relative transition-colors",
                    isToday && "ring-1 ring-primary",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && count > 0 && "bg-green-100 dark:bg-green-900/30",
                    !isSelected && !isToday && "hover:bg-muted"
                  )}
                  data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
                >
                  {date.getDate()}
                  {count > 0 && (
                    <span className={cn(
                      "text-[10px] leading-none",
                      isSelected ? "text-primary-foreground/80" : "text-green-600 dark:text-green-400 font-medium"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <VisitsList
        selectedDate={selectedDate}
        selectedDateVisited={selectedDateVisited}
        cardColumns={cardColumns}
        columnsMap={columnsMap}
        dateColumn={dateColumn}
        statusColumn={statusColumn}
        setSelectedLeadId={setSelectedLeadId}
      />
    </div>
  );
}

interface VisitsListProps {
  selectedDate: Date | null;
  selectedDateVisited: EnrichedVisited[];
  cardColumns: string[];
  columnsMap: Map<string, CustomColumn>;
  dateColumn: string;
  statusColumn: string;
  setSelectedLeadId: (id: string) => void;
}

function VisitsList({ selectedDate, selectedDateVisited, cardColumns, columnsMap, dateColumn, statusColumn, setSelectedLeadId }: VisitsListProps) {
  const isMobileView = useIsMobile();
  
  if (!selectedDate) {
    return (
      <Card className="flex-1">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a date to view visited leads</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-green-600" />
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h2>
        {selectedDateVisited.length > 0 && (
          <Badge variant="secondary">{selectedDateVisited.length} visited</Badge>
        )}
      </div>

      {selectedDateVisited.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No visits on this day</p>
          </CardContent>
        </Card>
      ) : isMobileView ? (
        <div className="grid grid-cols-1 gap-2">
          {selectedDateVisited.map(visit => (
            <VisitedCard
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
            {selectedDateVisited.map(visit => (
              <VisitedCard
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

interface VisitedCardProps {
  visit: EnrichedVisited;
  cardColumns: string[];
  columnsMap: Map<string, CustomColumn>;
  dateColumn: string;
  statusColumn: string;
  onClick: () => void;
}

function VisitedCard({ visit, cardColumns, columnsMap, dateColumn, statusColumn, onClick }: VisitedCardProps) {
  const displayColumns = cardColumns.length > 0 ? cardColumns : ['requirement', 'project_location', 'visit_type'];
  
  const getFieldValue = (key: string): any => {
    const enrichedFields: Record<string, any> = {
      lead_status: visit.current_lead_status,
      status: visit.current_lead_status,
      next_followup_date: visit.next_followup_date,
      nfdt: visit.next_followup_date,
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
      data-testid={`card-visited-${visit.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate text-sm leading-tight" data-testid={`text-visited-name-${visit.id}`}>
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

        <div className="flex flex-wrap items-center gap-1 mb-2">
          <div className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
            sheetColorClass
          )}>
            {visit.sheet_name}
          </div>
          {visit.current_lead_status && (
            <Badge variant="default" className="text-xs bg-primary/90" data-testid={`badge-status-${visit.id}`}>
              {visit.current_lead_status}
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
          {visit.next_followup_date && (
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground">Next Follow-up</span>
              <span className="font-medium text-primary">
                {(() => {
                  try {
                    return format(parseISO(String(visit.next_followup_date)), 'MMM d, h:mm a');
                  } catch {
                    return String(visit.next_followup_date);
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
                <span className="text-xs text-muted-foreground">
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
              <span className="text-xs text-muted-foreground">-</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
