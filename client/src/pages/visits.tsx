import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, MapPin, User, Clock, Building2, AlertCircle, Settings, Phone } from "lucide-react";
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
}

interface VisitsResponse {
  visits: EnrichedVisit[];
  config: SiteVisitConfig | null;
  total: number;
  message?: string;
}

export default function Visits() {
  const { isCompanyAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
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
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
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
          <Skeleton className="h-64 w-full lg:w-80" />
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
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-4 bg-background shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Visit Schedules</h1>
          {data?.total > 0 && (
            <Badge variant="secondary">{data.total} this month</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-go-to-today">
          Today
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
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
            visitsByDate={visitsByDate}
            selectedDateVisits={selectedDateVisits}
            cardColumns={cardColumns}
            columnsMap={columnsMap}
            dateColumn={data.config?.date_column || ''}
            getVisitCount={getVisitCount}
            goToPreviousMonth={goToPreviousMonth}
            goToNextMonth={goToNextMonth}
            setSelectedDate={setSelectedDate}
            setSelectedLeadId={setSelectedLeadId}
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
  getVisitCount: (date: Date) => number;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  setSelectedDate: (date: Date) => void;
  setSelectedLeadId: (id: string | null) => void;
}

function MobileLayout({
  currentMonth,
  selectedDate,
  calendarDays,
  selectedDateVisits,
  cardColumns,
  columnsMap,
  dateColumn,
  getVisitCount,
  goToPreviousMonth,
  goToNextMonth,
  setSelectedDate,
  setSelectedLeadId,
}: LayoutProps) {
  return (
    <div className="p-4 space-y-4">
      <CompactCalendar
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        calendarDays={calendarDays}
        getVisitCount={getVisitCount}
        goToPreviousMonth={goToPreviousMonth}
        goToNextMonth={goToNextMonth}
        setSelectedDate={setSelectedDate}
      />
      
      <VisitsList
        selectedDate={selectedDate}
        selectedDateVisits={selectedDateVisits}
        cardColumns={cardColumns}
        columnsMap={columnsMap}
        dateColumn={dateColumn}
        setSelectedLeadId={setSelectedLeadId}
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
  getVisitCount,
  goToPreviousMonth,
  goToNextMonth,
  setSelectedDate,
  setSelectedLeadId,
}: LayoutProps) {
  return (
    <div className="h-full flex gap-6 p-6">
      <div className="w-80 shrink-0">
        <CompactCalendar
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          calendarDays={calendarDays}
          getVisitCount={getVisitCount}
          goToPreviousMonth={goToPreviousMonth}
          goToNextMonth={goToNextMonth}
          setSelectedDate={setSelectedDate}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <VisitsList
          selectedDate={selectedDate}
          selectedDateVisits={selectedDateVisits}
          cardColumns={cardColumns}
          columnsMap={columnsMap}
          dateColumn={dateColumn}
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
}

function CompactCalendar({
  currentMonth,
  selectedDate,
  calendarDays,
  getVisitCount,
  goToPreviousMonth,
  goToNextMonth,
  setSelectedDate,
}: CompactCalendarProps) {
  return (
    <Card>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base" data-testid="text-current-month">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={`${day}-${i}`} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}
          
          {calendarDays.map(day => {
            const visitCount = getVisitCount(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isDayToday = isToday(day);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "h-9 flex flex-col items-center justify-center rounded-md text-sm transition-colors relative",
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
  setSelectedLeadId: (id: string | null) => void;
}

function VisitsList({
  selectedDate,
  selectedDateVisits,
  cardColumns,
  columnsMap,
  dateColumn,
  setSelectedLeadId,
}: VisitsListProps) {
  if (!selectedDate) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Select a date to view visits</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 h-full">
      <div className="flex items-center gap-2 shrink-0">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold" data-testid="text-selected-date">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h2>
        <Badge variant="outline">{selectedDateVisits.length} visit{selectedDateVisits.length !== 1 ? 's' : ''}</Badge>
      </div>

      {selectedDateVisits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No visits scheduled for this date</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {selectedDateVisits.map(visit => (
              <VisitCard
                key={visit.id}
                visit={visit}
                cardColumns={cardColumns}
                columnsMap={columnsMap}
                dateColumn={dateColumn}
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
  onClick: () => void;
}

function VisitCard({ visit, cardColumns, columnsMap, dateColumn, onClick }: VisitCardProps) {
  const displayColumns = cardColumns.length > 0 ? cardColumns : ['full_name', 'mobile_no'];
  
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    const column = columnsMap.get(key);
    if (column?.type === 'date' && value) {
      try {
        return format(parseISO(String(value)), 'MMM d, yyyy');
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const fullName = visit.custom_fields?.full_name || visit.custom_fields?.["Full Name"] || "Unknown";
  const mobile = visit.custom_fields?.mobile_no || visit.custom_fields?.["Mobile No"] || "";

  return (
    <Card 
      className="cursor-pointer hover-elevate transition-all"
      onClick={onClick}
      data-testid={`card-visit-${visit.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate text-sm" data-testid={`text-visit-name-${visit.id}`}>
              {fullName}
            </h3>
            {mobile && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{mobile}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{visit.sheet_name}</span>
          <span className="mx-0.5">•</span>
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{visit.owner_name}</span>
        </div>

        {displayColumns.length > 0 && (
          <div className="pt-2 border-t space-y-1">
            {displayColumns.slice(0, 3).map(colKey => {
              if (colKey === 'full_name' || colKey === 'mobile_no' || colKey === dateColumn) return null;
              const column = columnsMap.get(colKey);
              const value = visit.custom_fields?.[colKey];
              if (!column || value === undefined || value === null || value === '') return null;
              
              return (
                <div key={colKey} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{column.name}</span>
                  <span className="font-medium truncate max-w-[60%]">{formatValue(colKey, value)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-right">
          <span className="text-xs text-primary font-medium">
            View Details →
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
