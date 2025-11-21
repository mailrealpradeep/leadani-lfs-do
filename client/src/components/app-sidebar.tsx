import { Home, LayoutGrid, BarChart3, Settings, Users, Webhook, History, Plus, FileUp, Settings as SettingsIcon, Search, Flame, Eye, Download } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useDashboard } from "./dashboard-context";
import { SheetSelector } from "./sheet-selector";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, company, logout, isSuperAdmin, isCompanyAdmin } = useAuth();
  const {
    selectedSheetId,
    setSelectedSheetId,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    actions,
  } = useDashboard();

  const mainItems = [
    {
      title: "My Sheets",
      url: "/",
      icon: LayoutGrid,
      testId: "link-sheets",
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
      testId: "link-reports",
    },
    {
      title: "Audit Logs",
      url: "/audit",
      icon: History,
      testId: "link-audit",
    },
    {
      title: "Webhooks",
      url: "/webhooks",
      icon: Webhook,
      testId: "link-webhooks",
    },
  ];

  const adminItems = (isSuperAdmin || isCompanyAdmin)
    ? [
        {
          title: "Admin Console",
          url: "/admin",
          icon: Users,
          testId: "link-admin",
        },
      ]
    : [];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-4 py-3">
            Dabluz CRM
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={item.testId}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={item.testId}
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {location === "/" && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4">Current Sheet</SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                <div className="space-y-2">
                  <SheetSelector
                    selectedSheetId={selectedSheetId}
                    onSheetSelect={setSelectedSheetId}
                  />
                  {selectedSheetId && (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={actions.onAddLead}
                        className="w-full justify-start"
                        data-testid="button-add-lead"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Lead
                      </Button>
                      <Button
                        variant="outline"
                        onClick={actions.onImport}
                        className="w-full justify-start"
                        data-testid="button-import-leads"
                      >
                        <FileUp className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                      {isCompanyAdmin && (
                        <Button
                          variant="outline"
                          onClick={() => window.location.href = "/admin"}
                          className="w-full justify-start"
                          data-testid="button-manage-columns"
                        >
                          <SettingsIcon className="h-4 w-4 mr-2" />
                          Column Schema
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {selectedSheetId && (
              <SidebarGroup>
                <SidebarGroupLabel className="px-4">Filter & Search</SidebarGroupLabel>
                <SidebarGroupContent className="px-2">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-leads"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v)}>
                      <SelectTrigger className="w-full" data-testid="select-category-filter">
                        <SelectValue placeholder="All Leads" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        <SelectItem value="hot">
                          <div className="flex items-center gap-2">
                            <Flame className="h-4 w-4 text-red-500" />
                            Hot Leads
                          </div>
                        </SelectItem>
                        <SelectItem value="warm">
                          <div className="flex items-center gap-2">
                            <Flame className="h-4 w-4 text-orange-500" />
                            Warm Leads
                          </div>
                        </SelectItem>
                        <SelectItem value="cold">Cold Leads</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={actions.onToggleColumns}
                      className="w-full justify-start"
                      data-testid="button-toggle-columns"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Toggle Columns
                    </Button>
                    <Button
                      variant="outline"
                      onClick={actions.onExport}
                      className="w-full justify-start"
                      data-testid="button-export"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user?.name?.substring(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            {company && (
              <p className="text-xs text-muted-foreground truncate" data-testid="text-company-name">
                {company.name}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="w-full"
          data-testid="button-logout"
        >
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
