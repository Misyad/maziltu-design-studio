import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireApplicant } from "@/lib/auth";
import { applicantLogout } from "@/services/mzt-api";
import { applicantMeQuery } from "@/services/queries";

export const Route = createFileRoute("/pendaftar")({
  ssr: false,
  beforeLoad: ({ context, location }) => {
    if (location.pathname.replace(/\/+$/, "") === "/pendaftar/login") return;
    return requireApplicant(context.queryClient, location.href);
  },
  component: ApplicantLayout,
});

function ApplicantLayout() {
  const router = useRouter();
  const location = useLocation();
  const queryClient = useQueryClient();
  const loginPage = location.pathname.replace(/\/+$/, "") === "/pendaftar/login";
  const { data: application } = useQuery({ ...applicantMeQuery(), enabled: !loginPage });

  async function handleLogout() {
    await applicantLogout();
    queryClient.removeQueries({ queryKey: ["applicant"] });
    await router.navigate({ to: "/pendaftar/login", replace: true });
  }

  if (loginPage) return <Outlet />;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container-page flex h-16 items-center gap-4">
          <Link to="/pendaftar" className="font-display text-lg font-bold text-primary">
            MZT Pendaftar
          </Link>
          <span className="ml-auto hidden text-sm text-muted-foreground sm:inline">
            {application?.email}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
            <LogOut aria-hidden /> Keluar
          </Button>
        </div>
      </header>
      <main className="container-page py-10">
        <Outlet />
      </main>
    </div>
  );
}
