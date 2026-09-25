import { createFileRoute } from "@tanstack/react-router";
import { ScannerOperatorPage } from "@/features/checkin/scanner-operator-page";
import { CHECKIN_ROLES, requireRoles } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/scanner/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, CHECKIN_ROLES, location.href),
  component: ScannerOperatorPage,
});
