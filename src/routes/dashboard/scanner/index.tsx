import { createFileRoute } from "@tanstack/react-router";
import { CHECKIN_ROLES, requireRoles } from "@/lib/auth";
import { ScannerPage } from "@/routes/dashboard/checkin";

export const Route = createFileRoute("/dashboard/scanner/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, CHECKIN_ROLES, location.href),
  component: ScannerPage,
});
