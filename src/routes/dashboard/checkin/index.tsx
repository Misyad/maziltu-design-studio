import { createFileRoute, redirect } from "@tanstack/react-router";
import { CHECKIN_ROLES, requireRoles } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/checkin/")({
  beforeLoad: async ({ context, location }) => {
    await requireRoles(context.queryClient, CHECKIN_ROLES, location.href);
    throw redirect({ to: "/dashboard/scanner" });
  },
});
