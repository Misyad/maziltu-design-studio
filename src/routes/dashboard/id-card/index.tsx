import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberIdCard } from "@/features/dashboard/id-card";
import { PageHeader } from "@/features/dashboard/page-header";
import { membersQuery } from "@/services/queries";

export const Route = createFileRoute("/dashboard/id-card/")({
  component: IdCardPage,
});

function IdCardPage() {
  const members = useQuery(membersQuery());
  const [idUsers, setIdUsers] = useState<string>("");
  const member = members.data?.find((m) => String(m.id_users) === idUsers) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ID cards"
        description="Preview and print a digital ID card for any member."
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-base">Select member</CardTitle>
          <CardDescription>Search and pick a member to render their card.</CardDescription>
        </CardHeader>
        <CardContent>
          {members.isPending ? (
            <Skeleton className="h-10 w-80 rounded-xl" />
          ) : (
            <Select value={idUsers} onValueChange={setIdUsers}>
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue placeholder="Choose a member…" />
              </SelectTrigger>
              <SelectContent>
                {members.data?.map((m) => (
                  <SelectItem key={m.id_users} value={String(m.id_users)}>
                    {m.nama} · {m.id_anggota}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <div className="mx-auto max-w-sm">
        {!member ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Pick a member to preview their card.
          </div>
        ) : (
          <div className="space-y-4">
            <div id="print-area">
              <MemberIdCard member={member} />
            </div>
            <Button
              className="w-full rounded-full"
              onClick={() => window.print()}
              disabled={members.isPending}
            >
              <Printer aria-hidden />
              Print card
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
