import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/features/dashboard/page-header";
import { mediaUrl } from "@/services/api-client";
import { updateCarousel, updateMztInfo, updatePesantrenInfo } from "@/services/mzt-api";
import { carouselQuery, mztInfoQuery, pesantrenInfoQuery, queryKeys } from "@/services/queries";
import type { OrgInfo } from "@/types/api";

export const Route = createFileRoute("/dashboard/content/")({
  component: ContentPage,
});

interface InfoFormValues {
  judul: string;
  deskripsi: string;
  alamat: string;
  telpon: string;
  email: string;
}

function toInfoForm(info: OrgInfo): InfoFormValues {
  return {
    judul: info.judul,
    deskripsi: info.deskripsi,
    alamat: info.alamat,
    telpon: info.telpon,
    email: info.email ?? "",
  };
}

function InfoForm({
  title,
  description,
  query,
  mutation,
  photoUrl,
}: {
  title: string;
  description: string;
  query: { data?: OrgInfo; isPending: boolean };
  mutation: ReturnType<typeof useMutation<unknown, Error, FormData>>;
  photoUrl: string | null;
}) {
  const [values, setValues] = useState<InfoFormValues | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const info = values ?? (query.data ? toInfoForm(query.data) : null);

  function set<K extends keyof InfoFormValues>(key: K, value: string) {
    setValues((current) => ({ ...(current ?? toInfoForm(query.data!)), [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!info) return;
    const form = new FormData();
    form.append("judul", info.judul);
    form.append("deskripsi", info.deskripsi);
    form.append("alamat", info.alamat);
    form.append("telpon", info.telpon);
    form.append("email", info.email);
    if (photo) form.append("foto", photo);
    mutation.mutate(form);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : !info ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {photo ? (
                  <img
                    src={URL.createObjectURL(photo)}
                    alt="Preview"
                    className="size-full object-cover"
                  />
                ) : photoUrl ? (
                  <img src={photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
                )}
              </div>
              <label className="cursor-pointer text-sm font-medium text-primary">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div>
              <Label htmlFor={`${title}-judul`}>Title</Label>
              <Input
                id={`${title}-judul`}
                className="mt-2"
                value={info.judul}
                onChange={(event) => set("judul", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`${title}-alamat`}>Address</Label>
              <Input
                id={`${title}-alamat`}
                className="mt-2"
                value={info.alamat}
                onChange={(event) => set("alamat", event.target.value)}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${title}-telpon`}>Phone</Label>
                <Input
                  id={`${title}-telpon`}
                  className="mt-2"
                  value={info.telpon}
                  onChange={(event) => set("telpon", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`${title}-email`}>Email</Label>
                <Input
                  id={`${title}-email`}
                  type="email"
                  className="mt-2"
                  value={info.email}
                  onChange={(event) => set("email", event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`${title}-deskripsi`}>Description</Label>
              <Textarea
                id={`${title}-deskripsi`}
                rows={5}
                className="mt-2 resize-none"
                value={info.deskripsi}
                onChange={(event) => set("deskripsi", event.target.value)}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="rounded-full">
              {mutation.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Save aria-hidden />
              )}
              Save changes
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function CarouselTab() {
  const queryClient = useQueryClient();
  const carousel = useQuery(carouselQuery());
  const [photos, setPhotos] = useState<Record<number, File>>({});

  const updateSlide = useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData }) => updateCarousel(id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.carousel });
      toast.success("Carousel updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {carousel.isPending
        ? Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
          ))
        : carousel.data?.map((slide) => {
            const file = photos[slide.id];
            return (
              <Card key={slide.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-sm">
                    {slide.judul ?? `Slide ${slide.id}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {file ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : slide.foto ? (
                      <img
                        src={mediaUrl(slide.foto) ?? undefined}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <label className="mt-3 block cursor-pointer text-center text-sm font-medium text-primary">
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const next = event.target.files?.[0];
                        if (next) setPhotos((current) => ({ ...current, [slide.id]: next }));
                      }}
                    />
                  </label>
                  <Button
                    className="mt-2 w-full rounded-full"
                    size="sm"
                    disabled={!file || updateSlide.isPending}
                    onClick={() => {
                      if (!file) return;
                      const form = new FormData();
                      form.append("foto", file);
                      updateSlide.mutate({ id: slide.id, form });
                    }}
                  >
                    {updateSlide.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Save aria-hidden />
                    )}
                    Save image
                  </Button>
                </CardContent>
              </Card>
            );
          })}
    </div>
  );
}

function ContentPage() {
  const pesantren = useQuery(pesantrenInfoQuery());
  const mzt = useQuery(mztInfoQuery());
  const queryClient = useQueryClient();

  const updatePesantren = useMutation({
    mutationFn: updatePesantrenInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.infoPesantren });
      toast.success("Pesantren info updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const updateMzt = useMutation({
    mutationFn: updateMztInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.infoMzt });
      toast.success("MZT info updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content"
        description="Manage the carousel and organisation info shown on the public site."
      />

      <Tabs defaultValue="carousel">
        <TabsList>
          <TabsTrigger value="carousel">Carousel</TabsTrigger>
          <TabsTrigger value="pesantren">Info Pesantren</TabsTrigger>
          <TabsTrigger value="mzt">Info MZT</TabsTrigger>
        </TabsList>

        <TabsContent value="carousel" className="mt-6">
          <CarouselTab />
        </TabsContent>

        <TabsContent value="pesantren" className="mt-6">
          <InfoForm
            title="Info Pesantren"
            description="Details shown about the pesantren on the public site."
            query={pesantren}
            mutation={updatePesantren}
            photoUrl={pesantren.data?.foto ? mediaUrl(pesantren.data.foto) : null}
          />
        </TabsContent>

        <TabsContent value="mzt" className="mt-6">
          <InfoForm
            title="Info MZT"
            description="Details shown about Maziltu Tholiban on the public site."
            query={mzt}
            mutation={updateMzt}
            photoUrl={mzt.data?.foto ? mediaUrl(mzt.data.foto) : null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
