import { createFileRoute } from "@tanstack/react-router";
import { MEMBER_ADMIN_ROLES, requireRoles } from "@/lib/auth";
import { ApplicationsPage } from "@/routes/dashboard/applications";

export const Route = createFileRoute("/dashboard/members/registrations/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, MEMBER_ADMIN_ROLES, location.href),
  component: ApplicationsPage,
});
