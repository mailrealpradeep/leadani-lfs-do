import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { format, addDays, subDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Phone,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  User,
} from "lucide-react";
import type { SailaCallCommitment } from "@shared/schema";

function formatDisplayDate(dateStr: string) {
  try {
    const d = parseISO(dateStr);
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    if (dateStr === today) return `Today — ${format(d, 'EEE, dd MMM')}`;
    if (dateStr === yesterday) return `Yesterday — ${format(d, 'EEE, dd MMM')}`;
    if (dateStr === tomorrow) return `Tomorrow — ${format(d, 'EEE, dd MMM')}`;
    return format(d, 'EEE, dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-active-elevate">Completed</Badge>;
  }
  if (status === 'missed') {
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 no-default-active-elevate">Missed</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 no-default-active-elevate">Pending</Badge>;
}

function CommitmentCard({
  commitment,
  onMarkDone,
  onMarkMissed,
  isUpdating,
}: {
  commitment: SailaCallCommitment;
  onMarkDone: (id: string) => void;
  onMarkMissed: (id: string) => void;
  isUpdating: boolean;
}) {
  const customerLabel = commitment.sender_name || commitment.sender_phone;
  const isPending = commitment.status === 'pending';

  return (
    <Card data-testid={`card-commitment-${commitment.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              isPending ? 'bg-amber-100 dark:bg-amber-900/30' :
              commitment.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
              'bg-red-100 dark:bg-red-900/30'
            }`}>
              <Phone className={`h-4 w-4 ${
                isPending ? 'text-amber-600 dark:text-amber-400' :
                commitment.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                'text-red-600 dark:text-red-400'
              }`} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate" data-testid={`text-customer-${commitment.id}`}>
                  {customerLabel}
                </span>
                <StatusBadge status={commitment.status} />
              </div>
              <div className="flex items-center gap-1.5 text-primary font-semibold text-base">
                <Clock className="h-4 w-4" />
                <span data-testid={`text-calltime-${commitment.id}`}>{commitment.call_time_label}</span>
              </div>
            </div>

            <div className="space-y-1">
              {commitment.sender_name && (
                <a
                  href={`tel:${commitment.sender_phone}`}
                  className="block text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
                  data-testid={`link-phone-${commitment.id}`}
                >
                  {commitment.sender_phone}
                </a>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0" />
                <span>
                  {commitment.executive_name
                    ? `${commitment.executive_name} (${commitment.executive_phone})`
                    : commitment.executive_phone}
                </span>
              </div>
            </div>

            {isPending && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 dark:border-green-800 dark:text-green-400"
                  onClick={() => onMarkDone(commitment.id)}
                  disabled={isUpdating}
                  data-testid={`button-done-${commitment.id}`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Mark Done
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 dark:border-red-800 dark:text-red-400"
                  onClick={() => onMarkMissed(commitment.id)}
                  disabled={isUpdating}
                  data-testid={`button-missed-${commitment.id}`}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Mark Missed
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CallSchedulePage() {
  const { user, isCompanyAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [executivePhoneFilter, setExecutivePhoneFilter] = useState('all');

  const queryKey = ['/api/saila/call-commitments', { date: selectedDate, status: statusFilter, executive_phone: executivePhoneFilter }];

  const { data: commitments = [], isLoading } = useQuery<SailaCallCommitment[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (executivePhoneFilter !== 'all') params.set('executive_phone', executivePhoneFilter);
      return apiRequest("GET", `/api/saila/call-commitments?${params.toString()}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/saila/call-commitments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saila/call-commitments'] });
    },
  });

  const pendingCount = commitments.filter(c => c.status === 'pending').length;
  const completedCount = commitments.filter(c => c.status === 'completed').length;
  const missedCount = commitments.filter(c => c.status === 'missed').length;

  const uniquePhones = isCompanyAdmin
    ? Array.from(new Set(commitments.flatMap(c => c.executive_phone ? [c.executive_phone] : [])))
    : [];

  const goToPrevDay = () => setSelectedDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'));
  const goToNextDay = () => setSelectedDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'));
  const goToToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'));

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Call Schedule
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Call commitments from Saila Fixed Reply messages
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" onClick={goToPrevDay} data-testid="button-prev-day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background text-sm font-medium min-w-[200px] justify-center">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-selected-date">{formatDisplayDate(selectedDate)}</span>
              </div>
              <Button size="icon" variant="outline" onClick={goToNextDay} data-testid="button-next-day">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {!isToday && (
              <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
                Today
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')} data-testid="card-pending-count">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{isLoading ? '—' : pendingCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')} data-testid="card-completed-count">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{isLoading ? '—' : completedCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'missed' ? 'all' : 'missed')} data-testid="card-missed-count">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{isLoading ? '—' : missedCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Missed</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>

            {isCompanyAdmin && (
              <Select value={executivePhoneFilter} onValueChange={setExecutivePhoneFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-executive-filter">
                  <SelectValue placeholder="All executives" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All executives</SelectItem>
                  {uniquePhones.map(phone => (
                    <SelectItem key={phone} value={phone}>{phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : commitments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <PhoneOff className="h-10 w-10 opacity-30" />
                <p className="text-sm">No call commitments for this day</p>
              </div>
            ) : (
              commitments.map(commitment => (
                <CommitmentCard
                  key={commitment.id}
                  commitment={commitment}
                  onMarkDone={(id) => updateMutation.mutate({ id, status: 'completed' })}
                  onMarkMissed={(id) => updateMutation.mutate({ id, status: 'missed' })}
                  isUpdating={updateMutation.isPending}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
