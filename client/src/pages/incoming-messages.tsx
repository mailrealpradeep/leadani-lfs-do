import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Search, Copy, ExternalLink, Filter,
  Inbox, RefreshCw
} from "lucide-react";

const PAGE_SIZE = 50;

function truncate(text: string, max = 120) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function formatDateTime(dt: string | null) {
  if (!dt) return "—";
  try {
    return format(new Date(dt), "dd MMM yy, hh:mm a");
  } catch {
    return dt;
  }
}

function CopyButton({ text }: { text: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      data-testid="button-copy-message"
    >
      <Copy className={`h-3.5 w-3.5 ${copied ? "text-green-500" : ""}`} />
    </Button>
  );
}

export default function IncomingMessagesPage() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [executivePhone, setExecutivePhone] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [uniqueMode, setUniqueMode] = useState(false);

  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: executives = [] } = useQuery<{ executive_phone: string; executive_name: string | null }[]>({
    queryKey: ["/api/saila/incoming-messages/executives"],
  });

  const buildParams = useCallback((offset: number) => {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    if (uniqueMode) p.set("unique", "true");
    if (fromDate) p.set("from_date", fromDate);
    if (toDate) p.set("to_date", toDate);
    if (executivePhone !== "all") p.set("executive_phone", executivePhone);
    if (debouncedSearch) p.set("search", debouncedSearch);
    return p.toString();
  }, [uniqueMode, fromDate, toDate, executivePhone, debouncedSearch]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
  } = useInfiniteQuery<{ rows: any[]; total: number }>({
    queryKey: ["/api/saila/incoming-messages", { fromDate, toDate, executivePhone, search: debouncedSearch, uniqueMode }],
    queryFn: async ({ pageParam = 0 }) => {
      const params = buildParams(pageParam as number);
      return apiRequest("GET", `/api/saila/incoming-messages?${params}`);
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.rows.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });

  const allRows = data?.pages.flatMap(p => p.rows) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleViewLead = (leadId: string) => {
    setDrawerLeadId(leadId);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" />
                Incoming Messages
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                All inbound WhatsApp messages received by Saila.AI
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={uniqueMode ? "default" : "outline"}
                size="sm"
                onClick={() => setUniqueMode(v => !v)}
                data-testid="button-toggle-unique"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                {uniqueMode ? "Unique Messages" : "All Messages"}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {uniqueMode && (
            <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-2.5">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Unique Mode</strong> — Deduplicated by message text. Shows how many times each distinct message was received.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search messages, phone, name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                data-testid="input-search"
              />
            </div>

            <Input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-[145px] h-9 text-sm"
              data-testid="input-from-date"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-[145px] h-9 text-sm"
              data-testid="input-to-date"
            />

            {executives.length > 0 && (
              <Select value={executivePhone} onValueChange={setExecutivePhone}>
                <SelectTrigger className="w-[190px] h-9 text-sm" data-testid="select-executive">
                  <SelectValue placeholder="All executives" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All executives</SelectItem>
                  {executives.map(e => (
                    <SelectItem key={e.executive_phone} value={e.executive_phone}>
                      {e.executive_name ? `${e.executive_name} (${e.executive_phone})` : e.executive_phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {!isLoading && (
              <span className="text-xs text-muted-foreground ml-auto">
                {allRows.length} of {total} results
              </span>
            )}
          </div>

          {uniqueMode ? (
            <UniqueTable
              rows={allRows}
              isLoading={isLoading}
            />
          ) : (
            <NormalTable
              rows={allRows}
              isLoading={isLoading}
              onViewLead={handleViewLead}
            />
          )}

          <div ref={sentinelRef} className="py-2 flex justify-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading more…
              </div>
            )}
            {!hasNextPage && allRows.length > 0 && !isLoading && (
              <p className="text-xs text-muted-foreground">All {total} messages loaded</p>
            )}
          </div>
        </div>
      </div>

      <LeadDetailDrawer
        leadId={drawerLeadId}
        sheetId={null}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}

const NORMAL_COLS = 9;

function NormalTable({ rows, isLoading, onViewLead }: { rows: any[]; isLoading: boolean; onViewLead: (id: string) => void }) {
  if (isLoading) {
    return (
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Date/Time</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Mob No</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Sender Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Message</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Saila Reply</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Executive</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Lead Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Sheet</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: NORMAL_COLS }).map((__, j) => (
                    <td key={j} className="px-3 py-2.5"><Skeleton className="h-3.5 w-full" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <MessageSquare className="h-10 w-10 opacity-30" />
        <p className="text-sm">No incoming messages match your filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Date/Time</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Mob No</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Sender Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Message</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Saila Reply</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Executive</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Lead Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Sheet</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                data-testid={`row-message-${row.id ?? i}`}
              >
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(row.message_date_time)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs font-mono">{row.sender_phone || "—"}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs truncate max-w-[110px] block">{row.sender_name || "—"}</span>
                </td>
                <td className="px-3 py-2.5 max-w-[240px]">
                  {row.message_type !== "text" ? (
                    <span className="text-xs text-muted-foreground">(Media)</span>
                  ) : (
                    <p className="text-xs leading-snug" title={row.message_text || ""}>
                      {truncate(row.message_text || "", 120)}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 max-w-[220px]">
                  {row.saila_reply ? (
                    <p className="text-xs text-muted-foreground leading-snug" title={row.saila_reply}>
                      {truncate(row.saila_reply, 100)}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div>
                    <div className="text-xs font-mono leading-tight">{row.executive_phone || "—"}</div>
                    {row.executive_name && (
                      <div className="text-xs text-muted-foreground">{row.executive_name}</div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs truncate max-w-[110px] block">
                    {row.lead_name || <span className="text-muted-foreground/50">—</span>}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-muted-foreground truncate max-w-[90px] block">
                    {row.sheet_name || "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {row.lead_id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onViewLead(row.lead_id)}
                      data-testid={`button-view-lead-${row.id ?? i}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UniqueTable({ rows, isLoading }: { rows: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Message</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-28">Times Received</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-36">Most Recent</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-3 py-2.5"><Skeleton className="h-3.5 w-full" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <MessageSquare className="h-10 w-10 opacity-30" />
        <p className="text-sm">No unique messages match your filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Message</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-32 whitespace-nowrap">Times Received</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-36 whitespace-nowrap">Most Recent</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.message_text_normalized ?? i}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                data-testid={`row-unique-${i}`}
              >
                <td className="px-3 py-2.5">
                  <p
                    className="text-xs leading-snug"
                    title={row.message_text || ""}
                  >
                    {truncate(row.message_text || "", 200)}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Badge variant="secondary" className="text-xs no-default-active-elevate">
                    {Number(row.times_received).toLocaleString()}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(row.most_recent_at)}
                </td>
                <td className="px-3 py-2.5">
                  <CopyButton text={row.message_text || ""} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
