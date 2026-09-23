import { createFileRoute, Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Ticket,
  UserRound,
} from "lucide-react";
import { Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { DASHBOARD_ROLES, requireUser } from "@/lib/auth";
import { homePathFor } from "@/lib/roles";
import { ORG } from "@/constants/content";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: ({ context, location }) => requireUser(context.queryClient, location.href),
  component: PortalLayout,
});

interface PortalNavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: readonly PortalNavItem[] = [
  { to: "/portal", label: "Beranda", icon: Home },
  { to: "/portal/profil", label: "Profil Saya", icon: UserRound },
  { to: "/portal/id-card", label: "ID Card", icon: CreditCard },
  { to: "/portal/event", label: "Event", icon: CalendarDays },
  { to: "/portal/orders", label: "Order Saya", icon: Ticket },
  { to: "/portal/berita", label: "Berita", icon: Newspaper },
  { to: "/portal/ubah-password", label: "Ubah Password", icon: KeyRound },
];

function PortalLayout() {
  const router = useRouter();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(currentUserQuery());
  const setupRequired = user?.account_setup_required === true;
  const forced = setupRequired || user?.must_change_password === true;
  const canAccessDashboard = user?.roles?.some((role) => DASHBOARD_ROLES.includes(role)) ?? false;
  const dashboardPath = user ? homePathFor(user) : "/portal";
  const navItems = setupRequired
    ? [{ to: "/account/setup", label: "Pengaturan Akun", icon: KeyRound }]
    : forced
      ? NAV_ITEMS.filter((item) => item.to === "/portal/ubah-password")
      : NAV_ITEMS;

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
              {forced ? (
                <SidebarMenuButton size="lg">
                  <span className="gradient-emerald inline-flex size-8 items-center justify-center rounded-lg font-display text-xs font-bold text-primary-foreground">
                    MZT
                  </span>
                  <span className="grid gap-0.5 text-left">
                    <span className="font-display text-sm font-semibold">{ORG.name}</span>
                    <span className="text-xs text-muted-foreground">Portal Alumni</span>
                  </span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton asChild size="lg">
                  <Link to="/portal">
                    <span className="gradient-emerald inline-flex size-8 items-center justify-center rounded-lg font-display text-xs font-bold text-primary-foreground">
                      MZT
                    </span>
                    <span className="grid gap-0.5 text-left">
                      <span className="font-display text-sm font-semibold">{ORG.name}</span>
                      <span className="text-xs text-muted-foreground">Portal Alumni</span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={false}
                      tooltip={item.label}
                      className={
                        location.pathname === item.to
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }
                    >
                      <Link
                        to={item.to}
                        activeOptions={{ exact: item.to === "/portal" }}
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

        {!forced && canAccessDashboard ? (
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Menu admin">
                  <Link to={dashboardPath}>
                    <LayoutDashboard aria-hidden />
                    <span>Dashboard Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        ) : null}
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
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
                  <p className="p-0 mt-0.5 text-xs font-normal text-muted-foreground">
                    {user?.id_anggota}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!forced ? (
                  <DropdownMenuItem asChild>
                    <Link to="/portal/profil">
                      <BadgeCheck aria-hidden />
                      Profil Saya
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut aria-hidden />
                  Keluar
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
