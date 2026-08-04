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
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/slugify";
import { mediaUrl } from "@/services/api-client";
import { createNews, updateNews } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";
import type { NewsItem } from "@/types/api";

const newsSchema = z.object({
  judul: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  deskripsi: z.string().min(1, "Content is required"),
});

type NewsValues = z.infer<typeof newsSchema>;

const EMPTY: NewsValues = { judul: "", slug: "", deskripsi: "" };

function toValues(news: NewsItem): NewsValues {
  return { judul: news.judul, slug: news.slug, deskripsi: news.deskripsi };
}

interface NewsFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  news?: NewsItem | null;
}

export function NewsFormDialog({ open, onOpenChange, news }: NewsFormDialogProps) {
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewsValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: news ? toValues(news) : EMPTY,
  });

  function handleTitleChange(value: string) {
    setValue("judul", value);
    if (!slugTouched && !news) setValue("slug", slugify(value));
  }

  const mutation = useMutation({
    mutationFn: async (values: NewsValues) => {
      const form = new FormData();
      form.append("judul", values.judul);
      form.append("slug", values.slug);
      form.append("deskripsi", values.deskripsi);
      if (photo) form.append("foto", photo);
      return news ? updateNews(news.id, form) : createNews(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.news });
      toast.success(news ? "News updated" : "News created");
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
          <DialogTitle>{news ? "Edit news" : "New news"}</DialogTitle>
          <DialogDescription>
            {news ? `Update ${news.judul}.` : "Publish a new announcement or story."}
          </DialogDescription>
        </DialogHeader>

        <form id="news-form" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {photo ? (
                    <img
                      src={URL.createObjectURL(photo)}
                      alt="Cover preview"
                      className="size-full object-cover"
                    />
                  ) : news?.foto ? (
                    <img
                      src={mediaUrl(news.foto) ?? undefined}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <label className="cursor-pointer text-sm font-medium text-primary">
                  Upload cover
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="n-judul">Title</Label>
              <Input
                id="n-judul"
                className="mt-2"
                placeholder="News title"
                aria-invalid={!!errors.judul}
                {...register("judul")}
                onChange={(event) => handleTitleChange(event.target.value)}
              />
              {errors.judul ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.judul.message}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="n-slug">Slug</Label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="n-slug"
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

            <div className="sm:col-span-2">
              <Label htmlFor="n-deskripsi">Content</Label>
              <Textarea
                id="n-deskripsi"
                rows={6}
                className="mt-2 resize-none"
                placeholder="Write the story…"
                aria-invalid={!!errors.deskripsi}
                {...register("deskripsi")}
              />
              {errors.deskripsi ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.deskripsi.message}</p>
              ) : null}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="news-form" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {news ? "Save changes" : "Publish news"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
