import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { mediaUrl } from "@/services/api-client";
import {
  activityLogQuery,
  dashboardCalendarQuery,
  dashboardEventsQuery,
  dashboardStatsQuery,
} from "@/services/queries";
import type { DashboardEvent } from "@/types/api";

export const Route = createFileRoute("/dashboard/")({
  component: OverviewPage,
});

const STATUS_LABEL: Record<DashboardEvent["status"], string> = {
  Upcomming: "Upcoming",
  Ongoing: "Ongoing",
  Complate: "Completed",
};

const STATUS_CLASS: Record<DashboardEvent["status"], string> = {
  Upcomming: "border-primary/30 bg-primary-soft text-accent-foreground",
  Ongoing: "border-gold-soft bg-gold-soft text-gold",
  Complate: "border-border bg-muted text-muted-foreground",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function OverviewPage() {
  const stats = useQuery(dashboardStatsQuery());
  const events = useQuery(dashboardEventsQuery());
  const calendar = useQuery(dashboardCalendarQuery());
  const activity = useQuery(activityLogQuery());

  const chartData = [
    { name: "Members", value: stats.data?.total_anggota ?? 0, fill: "var(--color-members)" },
    { name: "Total", value: stats.data?.event ?? 0, fill: "var(--color-total)" },
    { name: "Upcoming", value: stats.data?.event_mendatang ?? 0, fill: "var(--color-upcoming)" },
    { name: "Done", value: stats.data?.event_selesai ?? 0, fill: "var(--color-done)" },
  ];

  const chartConfig = {
    members: { label: "Members", color: "var(--chart-1)" },
    total: { label: "Total events", color: "var(--chart-2)" },
    upcoming: { label: "Upcoming", color: "var(--chart-3)" },
    done: { label: "Completed", color: "var(--chart-4)" },
  } satisfies ChartConfig;

  const statCards = [
    {
      label: "Total members",
      value: stats.data?.total_anggota,
      icon: Users,
      loading: stats.isPending,
    },
    {
      label: "Total events",
      value: stats.data?.event,
      icon: CalendarDays,
      loading: stats.isPending,
    },
    {
      label: "Upcoming events",
      value: stats.data?.event_mendatang,
      icon: Clock,
      loading: stats.isPending,
    },
    {
      label: "Completed events",
      value: stats.data?.event_selesai,
      icon: CheckCircle2,
      loading: stats.isPending,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="A snapshot of members, events and recent activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <stat.icon className="size-5" aria-hidden />
              </span>
              <div>
                {stat.loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="font-display text-2xl font-semibold">{stat.value ?? "—"}</p>
                )}
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Community at a glance</CardTitle>
            <CardDescription>Headline numbers across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isPending ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <ChartContainer config={chartConfig} className="aspect-[16/7] w-full">
                <BarChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ top: 8, left: 4, right: 4 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={8} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Upcoming dates</CardTitle>
            <CardDescription>Next scheduled events.</CardDescription>
          </CardHeader>
          <CardContent>
            {calendar.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : calendar.data && calendar.data.length > 0 ? (
              <ul className="space-y-3">
                {calendar.data.slice(0, 5).map((entry, index) => (
                  <li
                    key={`${entry.title}-${index}`}
                    className="rounded-xl border border-border p-3"
                  >
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(entry.start)} — {formatDate(entry.end)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-display">Recent events</CardTitle>
              <CardDescription>The latest scheduled gatherings.</CardDescription>
            </div>
            <Link
              to="/dashboard/events"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {events.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : events.data && events.data.length > 0 ? (
              <ul className="divide-y divide-border">
                {events.data.slice(0, 6).map((event) => (
                  <li key={event.id} className="flex items-center gap-4 py-3">
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {event.banner ? (
                        <img
                          src={mediaUrl(event.banner) ?? undefined}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{event.judul_event}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {event.lokasi} · {formatDate(event.tanggal)}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATUS_CLASS[event.status]}>
                      {STATUS_LABEL[event.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Recent activity</CardTitle>
            <CardDescription>Latest actions across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : activity.data && activity.data.length > 0 ? (
              <ul className="space-y-4">
                {activity.data.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    <div>
                      <p className="text-sm leading-snug">{entry.aktivitas}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.dataUser?.nama ?? `User #${entry.id_users}`} ·{" "}
                        {new Date(entry.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
