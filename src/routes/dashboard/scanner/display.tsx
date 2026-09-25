import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ScannerDisplayPage } from "@/features/checkin/scanner-display-page";
import { CHECKIN_ROLES, requireRoles } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/scanner/display")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, CHECKIN_ROLES, location.href),
  validateSearch: z.object({
    session: z.string().uuid().catch(""),
  }),
  component: DisplayRoute,
});

function DisplayRoute() {
  const { session } = Route.useSearch();
  return <ScannerDisplayPage session={session} />;
}
