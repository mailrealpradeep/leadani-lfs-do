import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, MapPin, User, Clock, Building2, AlertCircle, Settings, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
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
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 sm:p-6">
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
      <div className="flex-1 p-4 sm:p-6">
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-4 bg-background">
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
        <div className="p-4 sm:p-6 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={goToPreviousMonth} data-testid="button-prev-month">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-lg" data-testid="text-current-month">
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={goToNextMonth} data-testid="button-next-month">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-2">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
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
                        "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative",
                        "hover-elevate",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && isDayToday && "ring-2 ring-primary ring-offset-2",
                        !isSelected && !isDayToday && "hover:bg-muted"
                      )}
                      data-testid={`button-date-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <span className={cn(
                        "font-medium",
                        !isSameMonth(day, currentMonth) && "text-muted-foreground"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {visitCount > 0 && (
                        <span className={cn(
                          "text-[10px] sm:text-xs font-medium mt-0.5",
                          isSelected ? "text-primary-foreground/80" : "text-primary"
                        )}>
                          {visitCount} visit{visitCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold" data-testid="text-selected-date">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h2>
                <Badge variant="outline">{selectedDateVisits.length} visit{selectedDateVisits.length !== 1 ? 's' : ''}</Badge>
              </div>

              {selectedDateVisits.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No visits scheduled for this date</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedDateVisits.map(visit => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      cardColumns={cardColumns}
                      columnsMap={columnsMap}
                      dateColumn={data.config?.date_column || ''}
                      onClick={() => setSelectedLeadId(visit.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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
  const visitTime = visit.custom_fields?.[dateColumn];

  return (
    <Card 
      className="cursor-pointer hover-elevate transition-all"
      onClick={onClick}
      data-testid={`card-visit-${visit.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate" data-testid={`text-visit-name-${visit.id}`}>
              {fullName}
            </h3>
            {mobile && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{mobile}</span>
              </div>
            )}
          </div>
          {visitTime && (
            <Badge variant="secondary" className="shrink-0">
              <Clock className="h-3 w-3 mr-1" />
              {formatValue(dateColumn, visitTime)}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{visit.sheet_name}</span>
          <span className="mx-1">•</span>
          <User className="h-3 w-3" />
          <span className="truncate">{visit.owner_name}</span>
        </div>

        {displayColumns.length > 0 && (
          <div className="pt-2 border-t space-y-1.5">
            {displayColumns.slice(0, 4).map(colKey => {
              if (colKey === 'full_name' || colKey === 'mobile_no' || colKey === dateColumn) return null;
              const column = columnsMap.get(colKey);
              const value = visit.custom_fields?.[colKey];
              if (!column || value === undefined || value === null || value === '') return null;
              
              return (
                <div key={colKey} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{column.name}</span>
                  <span className="font-medium truncate max-w-[60%]">{formatValue(colKey, value)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 text-right">
          <span className="text-xs text-primary font-medium">
            View Details →
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
