import { createFileRoute } from "@tanstack/react-router";
import { PortalAccountSetup } from "@/routes/portal/aktivasi-akun";
import { requireUser } from "@/lib/auth";

export const Route = createFileRoute("/account/setup")({
  ssr: false,
  beforeLoad: ({ context, location }) => requireUser(context.queryClient, location.href),
  component: PortalAccountSetup,
});
