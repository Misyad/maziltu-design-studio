import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/slugify";
import { mediaUrl } from "@/services/api-client";
import { createEvent, updateEvent } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";
import type { EventItem } from "@/types/api";
import { formatPrice } from "@/features/events/event-card";

const eventSchema = z.object({
  judul_event: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  lokasi: z.string().min(1, "Location is required"),
  harga: z.string(),
  deskripsi: z.string().min(1, "Description is required"),
  tanggal_mulai: z.string().min(1, "Start date is required"),
  tanggal_selesai: z.string().min(1, "End date is required"),
  is_active: z.boolean(),
});

type EventValues = z.infer<typeof eventSchema>;

const EMPTY: EventValues = {
  judul_event: "",
  slug: "",
  lokasi: "",
  harga: "",
  deskripsi: "",
  tanggal_mulai: "",
  tanggal_selesai: "",
  is_active: true,
};

function toValues(event: EventItem): EventValues {
  return {
    judul_event: event.judul_event,
    slug: event.slug,
    lokasi: event.lokasi,
    harga: String(event.harga ?? ""),
    deskripsi: event.deskripsi,
    tanggal_mulai: event.tanggal_mulai,
    tanggal_selesai: event.tanggal_selesai,
    is_active: Boolean(event.is_active),
  };
}

function toDMY(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventItem | null;
}

export function EventFormDialog({ open, onOpenChange, event }: EventFormDialogProps) {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: event ? toValues(event) : EMPTY,
  });

  function handleTitleChange(value: string) {
    setValue("judul_event", value);
    if (!slugTouched && !event) setValue("slug", slugify(value));
  }

  const mutation = useMutation({
    mutationFn: async (values: EventValues) => {
      const form = new FormData();
      form.append("judul_event", values.judul_event);
      form.append("slug", values.slug);
      form.append("lokasi", values.lokasi);
      if (values.harga) form.append("harga", values.harga);
      form.append("deskripsi", values.deskripsi);
      form.append("tanggal", `${toDMY(values.tanggal_mulai)} - ${toDMY(values.tanggal_selesai)}`);
      form.append("tanggal_mulai", values.tanggal_mulai);
      form.append("tanggal_selesai", values.tanggal_selesai);
      form.append("is_active", values.is_active ? "1" : "0");
      if (banner) form.append("banner", banner);
      return event ? updateEvent(event.id, form) : createEvent(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      toast.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {event ? `Update ${event.judul_event}.` : "Schedule a new event for members."}
          </DialogDescription>
        </DialogHeader>

        <form id="event-form" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-4">
                <div className="relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {banner ? (
                    <img
                      src={URL.createObjectURL(banner)}
                      alt="Banner preview"
                      className="size-full object-cover"
                    />
                  ) : event?.banner ? (
                    <img
                      src={mediaUrl(event.banner) ?? undefined}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <label className="cursor-pointer text-sm font-medium text-primary">
                  Upload banner
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(eventTarget) => setBanner(eventTarget.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="e-judul">Title</Label>
              <Input
                id="e-judul"
                className="mt-2"
                placeholder="Event title"
                aria-invalid={!!errors.judul_event}
                {...register("judul_event")}
                onChange={(event) => handleTitleChange(event.target.value)}
              />
              {errors.judul_event ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.judul_event.message}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="e-lokasi">Location</Label>
              <Input
                id="e-lokasi"
                className="mt-2"
                placeholder="Venue or city"
                aria-invalid={!!errors.lokasi}
                {...register("lokasi")}
              />
              {errors.lokasi ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.lokasi.message}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="e-slug">Slug</Label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="e-slug"
                  className="flex-1 font-mono text-sm"
                  aria-invalid={!!errors.slug}
                  {...register("slug")}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setValue("slug", event.target.value);
                  }}
                />
              </div>
              {errors.slug ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.slug.message}</p>
              ) : null}
              <p className="mt-1.5 text-xs text-muted-foreground">
                Auto-generated from the title — edit if you like. Must be unique.
              </p>
            </div>
            <div>
              <Label htmlFor="e-harga">Contribution (IDR)</Label>
              <Input
                id="e-harga"
                type="number"
                className="mt-2"
                placeholder="0 for free"
                {...register("harga")}
              />
              {watch("harga") ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {formatPrice(Number(watch("harga")))}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="e-active">Active</Label>
              <div className="mt-2 flex items-center gap-2">
                <Switch
                  id="e-active"
                  checked={watch("is_active")}
                  onCheckedChange={(checked) => setValue("is_active", checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {watch("is_active") ? "Visible" : "Hidden"}
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="e-tmulai">Start date</Label>
              <Input
                id="e-tmulai"
                type="date"
                className="mt-2"
                aria-invalid={!!errors.tanggal_mulai}
                {...register("tanggal_mulai")}
              />
              {errors.tanggal_mulai ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.tanggal_mulai.message}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="e-tselesai">End date</Label>
              <Input
                id="e-tselesai"
                type="date"
                className="mt-2"
                aria-invalid={!!errors.tanggal_selesai}
                {...register("tanggal_selesai")}
              />
              {errors.tanggal_selesai ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.tanggal_selesai.message}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="e-deskripsi">Description</Label>
              <Textarea
                id="e-deskripsi"
                rows={4}
                className="mt-2 resize-none"
                placeholder="Describe the event…"
                {...register("deskripsi")}
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="event-form" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {event ? "Save changes" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
