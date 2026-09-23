import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CreditCard,
  Loader2,
  MapPin,
  Ticket,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/features/events/event-card";
import { mediaUrl } from "@/services/api-client";
import { registerEvent } from "@/services/mzt-api";
import { eventStatus, formatDateShort, parsePrice } from "@/services/public-content";
import { currentUserQuery, myOrdersQuery, publicEventQuery } from "@/services/queries";
import { cn } from "@/lib/utils";
import type { EventPaymentChoice } from "@/types/api";

export const Route = createFileRoute("/events/$id")({
  head: () => ({
    meta: [{ title: "Event — MZT Apps | Maziltu Tholiban" }],
  }),
  component: EventDetailPage,
});

const STATUS_LABEL = {
  Upcomming: "Upcoming",
  Ongoing: "Happening now",
  Complate: "Completed",
} as const;

function EventDetailPage() {
  const { id } = Route.useParams();
  const event = useQuery(publicEventQuery(id));

  if (event.isPending) {
    return (
      <section className="container-page py-20 lg:py-28">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="mt-6 h-[28rem] w-full rounded-[2rem]" />
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
        </div>
      </section>
    );
  }

  if (event.isError || !event.data) {
    return (
      <section className="container-page py-24 text-center lg:py-32">
        <p className="eyebrow justify-center">Event</p>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Event not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          This event may have been unpublished or removed.
        </p>
        <Button asChild className="mt-8 rounded-full px-6">
          <Link to="/events">Browse all events</Link>
        </Button>
      </section>
    );
  }

  const detail = event.data;
  const status = eventStatus(detail.tanggal_mulai, detail.tanggal_selesai);
  const banner = mediaUrl(detail.banner) ?? "";

  return (
    <section className="container-page py-16 lg:py-24">
      <Link
        to="/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All events
      </Link>

      <div className="relative mt-8 overflow-hidden rounded-[2rem] shadow-elevated">
        {banner ? (
          <img
            src={banner}
            alt={detail.judul_event}
            className="aspect-16/8 size-full object-cover"
          />
        ) : (
          <div className="gradient-emerald aspect-16/8 size-full" />
        )}
        <span className="absolute top-5 left-5 rounded-full border-0 bg-card/90 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="font-display text-3xl leading-tight font-bold sm:text-4xl">
            {detail.judul_event}
          </h1>
          <div className="prose-content mt-6 text-base">
            <div dangerouslySetInnerHTML={{ __html: detail.deskripsi }} />
          </div>
        </div>

        <aside className="h-fit rounded-3xl border border-border/70 bg-card p-6 shadow-soft lg:sticky lg:top-8">
          <h2 className="font-display text-lg font-semibold">Event details</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Dates
                </dt>
                <dd className="mt-0.5 font-medium">
                  {formatDateShort(detail.tanggal_mulai)} —{" "}
                  {formatDateShort(detail.tanggal_selesai)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Location
                </dt>
                <dd className="mt-0.5 font-medium">{detail.lokasi || "—"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Ticket className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Contribution
                </dt>
                <dd className="mt-0.5 font-medium">{formatPrice(parsePrice(detail.harga))}</dd>
              </div>
            </div>
            {detail.venue ? (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Venue
                  </dt>
                  <dd className="mt-0.5 font-medium">{detail.venue}</dd>
                </div>
              </div>
            ) : null}
            {typeof detail.kuota === "number" && detail.kuota > 0 ? (
              <div className="flex items-start gap-3">
                <Ticket className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Capacity
                  </dt>
                  <dd className="mt-0.5 font-medium">{detail.kuota} seats</dd>
                </div>
              </div>
            ) : null}
          </dl>
          <RegisterPanel eventId={detail.id} isPrivate={detail.visibility === "private"} />
        </aside>
      </div>
    </section>
  );
}

const REGISTER_ERROR: Record<number, string> = {
  409: "You are already registered for this event.",
  403: "Registration is not available for this event.",
  404: "Event not found.",
};

function RegisterPanel({ eventId, isPrivate }: { eventId: number; isPrivate: boolean }) {
  const queryClient = useQueryClient();
  const [paymentChoice, setPaymentChoice] = useState<EventPaymentChoice>("pay_now");
  // Session probe on a public page — the query is `authCheck`-flagged so an
  // anonymous visitor gets a clean 401 instead of a hard redirect to /login.
  const { data: user } = useQuery(currentUserQuery());
  const loggedIn = !!user;
  const { data: orders } = useQuery({
    ...myOrdersQuery(),
    enabled: loggedIn,
    retry: 0,
  });
  const alreadyRegistered = (orders ?? []).some((order) => order.id_event === eventId);

  const mutation = useMutation({
    mutationFn: () => registerEvent(eventId, paymentChoice),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success(payload?.message ?? "Registration successful");
    },
    onError: (error: unknown) => {
      const status = (error as { status?: number })?.status;
      toast.error(
        status ? (REGISTER_ERROR[status] ?? "Registration failed") : "Registration failed",
      );
    },
  });

  if (isPrivate) {
    return (
      <Button disabled className="mt-6 w-full rounded-full">
        Invitation only
      </Button>
    );
  }

  if (!loggedIn) {
    return (
      <Button asChild className="mt-6 w-full rounded-full">
        <Link to="/login">Sign in to register</Link>
      </Button>
    );
  }

  if (alreadyRegistered) {
    return (
      <Button
        asChild
        variant="outline"
        className={cn(
          "mt-6 w-full rounded-full",
          mutation.isPending && "pointer-events-none opacity-60",
        )}
      >
        <Link to="/portal/orders">View my order</Link>
      </Button>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <p className="text-sm font-semibold">Pilih pembayaran</p>
        <RadioGroup
          value={paymentChoice}
          onValueChange={(value) => setPaymentChoice(value as EventPaymentChoice)}
          className="mt-3"
          disabled={mutation.isPending}
        >
          <Label
            htmlFor="pay-now"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
              paymentChoice === "pay_now" && "border-primary bg-primary-soft",
            )}
          >
            <RadioGroupItem id="pay-now" value="pay_now" className="mt-0.5" />
            <CreditCard className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="block text-sm font-medium">Bayar Sekarang</span>
              <span className="block text-xs text-muted-foreground">
                Selesaikan pembayaran sebelum datang.
              </span>
            </span>
          </Label>
          <Label
            htmlFor="pay-at-venue"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
              paymentChoice === "pay_at_venue" && "border-primary bg-primary-soft",
            )}
          >
            <RadioGroupItem id="pay-at-venue" value="pay_at_venue" className="mt-0.5" />
            <Banknote className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="block text-sm font-medium">Bayar di Tempat</span>
              <span className="block text-xs text-muted-foreground">
                Petugas mencatat pembayaran saat kedatangan.
              </span>
            </span>
          </Label>
        </RadioGroup>
      </div>
      <Button
        className="w-full rounded-full"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Daftar event
      </Button>
    </div>
  );
}
