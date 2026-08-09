import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  QrCode,
  ReceiptText,
  ScanLine,
  Settings2,
  TicketCheck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { mediaUrl, getStoredToken } from "@/services/api-client";
import { currentUserQuery } from "@/services/queries";
import { logout } from "@/services/mzt-api";
import type { AppRole } from "@/types/api";
import { ORG } from "@/constants/content";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ location }) => {
    if (!getStoredToken()) {
      throw redirect({ to: "/login", replace: true, from: location.href });
    }
  },
  component: DashboardLayout,
});

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["dashboard"] },
  {
    to: "/dashboard/finance",
    label: "Finance",
    icon: Wallet,
    roles: ["finance", "ketua", "admin"],
  },
  {
    to: "/dashboard/finance/tickets",
    label: "Tiket & Operasional",
    icon: TicketCheck,
    roles: ["dashboard", "event", "finance", "ketua", "admin"],
  },
  { to: "/dashboard/members", label: "Members", icon: Users, roles: ["anggota"] },
  { to: "/dashboard/events", label: "Events", icon: CalendarDays, roles: ["event"] },
  { to: "/dashboard/attendance", label: "Attendance", icon: QrCode, roles: ["prisensi"] },
  {
    to: "/dashboard/checkin",
    label: "Check-In",
    icon: ScanLine,
    roles: ["prisensi", "event", "finance", "ketua", "admin"],
  },
  { to: "/dashboard/news", label: "News", icon: Newspaper, roles: ["berita"] },
  { to: "/dashboard/transactions", label: "Transactions", icon: ReceiptText, roles: ["event"] },
  { to: "/dashboard/activity", label: "Activity", icon: Activity, roles: ["aktivitas_user"] },
  { to: "/dashboard/content", label: "Content", icon: Settings2, roles: ["tampilan"] },
  { to: "/dashboard/id-card", label: "ID Cards", icon: BadgeCheck, roles: ["id_card"] },
  { to: "/dashboard/profile", label: "Profile", icon: UserRound, roles: ["profil"] },
];

const ROLE_LABEL: Record<string, string> = {
  dashboard: "Admin",
  anggota: "Members",
  event: "Events",
  berita: "News",
  tampilan: "Content",
  aktivitas_user: "Activity",
  id_card: "ID Card",
  prisensi: "Attendance",
};

function DashboardLayout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(currentUserQuery());

  const roles = user?.roles ?? [];
  const navItems = NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.some((role) => roles.includes(role)),
  );

  async function handleLogout() {
    await logout();
    queryClient.clear();
    await router.navigate({ to: "/login", replace: true });
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg">
                <Link to="/">
                  <span className="gradient-emerald inline-flex size-8 items-center justify-center rounded-lg font-display text-xs font-bold text-primary-foreground">
                    MZT
                  </span>
                  <span className="grid gap-0.5 text-left">
                    <span className="font-display text-sm font-semibold">{ORG.name}</span>
                    <span className="text-xs text-muted-foreground">Admin Console</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Manage</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={false} tooltip={item.label}>
                      <Link
                        to={item.to}
                        activeOptions={{ exact: item.to === "/dashboard" }}
                        activeProps={{
                          className: "bg-sidebar-accent text-sidebar-accent-foreground",
                        }}
                      >
                        <item.icon aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to public site">
                <Link to="/">
                  <Menu aria-hidden />
                  <span>Public site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={mediaUrl(user?.foto) ?? undefined} alt="" />
                    <AvatarFallback>{(user?.name ?? "U").charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                    {roles
                      .slice(0, 2)
                      .map((role) => ROLE_LABEL[role] ?? role)
                      .join(", ")}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
