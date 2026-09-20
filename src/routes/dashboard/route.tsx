import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Printer,
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
import { mediaUrl } from "@/services/api-client";
import { currentUserQuery } from "@/services/queries";
import { logout } from "@/services/mzt-api";
import {
  ATTENDANCE_ROUTE_ROLES,
  CHECKIN_ROLES,
  DASHBOARD_ROLES,
  FINANCE_ROLES,
  KTA_CARD_ROLES,
  KTA_QUEUE_ROLES,
  MEMBER_ADMIN_ROLES,
  STAFF_ROLES,
  requireRoles,
} from "@/lib/auth";
import { homePathFor } from "@/lib/roles";
import { ORG } from "@/constants/content";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, DASHBOARD_ROLES, location.href),
  component: DashboardLayout,
});

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: readonly string[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: STAFF_ROLES },
  { to: "/dashboard/finance", label: "Finance", icon: Wallet, roles: FINANCE_ROLES },
  {
    to: "/dashboard/finance/verification",
    label: "Verifikasi Pembayaran",
    icon: ClipboardCheck,
    roles: FINANCE_ROLES,
  },
  { to: "/dashboard/kta", label: "Cetak KTA", icon: Printer, roles: KTA_QUEUE_ROLES },
  {
    to: "/dashboard/finance/tickets",
    label: "Tiket & Operasional",
    icon: TicketCheck,
    roles: STAFF_ROLES,
  },
  { to: "/dashboard/operations", label: "Operasional", icon: Gauge, roles: STAFF_ROLES },
  { to: "/dashboard/members", label: "Members", icon: Users, roles: STAFF_ROLES },
  { to: "/dashboard/events", label: "Events", icon: CalendarDays, roles: STAFF_ROLES },
  {
    to: "/dashboard/attendance",
    label: "Attendance",
    icon: QrCode,
    roles: ATTENDANCE_ROUTE_ROLES,
  },
  { to: "/dashboard/checkin", label: "Check-In", icon: ScanLine, roles: CHECKIN_ROLES },
  { to: "/dashboard/news", label: "News", icon: Newspaper, roles: STAFF_ROLES },
  { to: "/dashboard/transactions", label: "Transactions", icon: ReceiptText, roles: FINANCE_ROLES },
  { to: "/dashboard/activity", label: "Activity", icon: Activity, roles: FINANCE_ROLES },
  { to: "/dashboard/content", label: "Content", icon: Settings2, roles: STAFF_ROLES },
  { to: "/dashboard/id-card", label: "ID Cards", icon: BadgeCheck, roles: KTA_CARD_ROLES },
  { to: "/dashboard/profile", label: "Profile", icon: UserRound, roles: MEMBER_ADMIN_ROLES },
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
  const homePath = homePathFor({ roles });
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
                  <Link to={homePath}>Dashboard</Link>
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
