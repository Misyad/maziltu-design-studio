import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/features/news/news-card";
import { mediaUrl } from "@/services/api-client";
import { publicNewsItemQuery } from "@/services/queries";

export const Route = createFileRoute("/news/$id")({
  head: () => ({
    meta: [{ title: "News — MZT Apps | Maziltu Tholiban" }],
  }),
  component: NewsDetailPage,
});

function NewsDetailPage() {
  const { id } = Route.useParams();
  const item = useQuery(publicNewsItemQuery(id));

  if (item.isPending) {
    return (
      <section className="container-page py-20 lg:py-28">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="mt-6 h-[24rem] w-full rounded-[2rem]" />
        <Skeleton className="mt-10 h-12 w-2/3 rounded-2xl" />
        <Skeleton className="mt-6 h-64 w-full rounded-3xl" />
      </section>
    );
  }

  if (item.isError || !item.data) {
    return (
      <section className="container-page py-24 text-center lg:py-32">
        <p className="eyebrow justify-center">News</p>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Story not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          This story may have been unpublished or removed.
        </p>
        <Button asChild className="mt-8 rounded-full px-6">
          <Link to="/news">Browse all news</Link>
        </Button>
      </section>
    );
  }

  const detail = item.data;
  const cover = mediaUrl(detail.foto) ?? "";

  return (
    <article className="container-page py-16 lg:py-24">
      <Link
        to="/news"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All news
      </Link>

      <header className="mx-auto mt-8 max-w-3xl text-center">
        <p className="eyebrow justify-center">News & announcements</p>
        <h1 className="mt-4 font-display text-3xl leading-tight font-bold text-balance sm:text-4xl">
          {detail.judul}
        </h1>
        <p className="mt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(detail.created_at)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5" aria-hidden />
            {detail.pembuat ?? "Secretariat"}
          </span>
        </p>
      </header>

      {cover ? (
        <img
          src={cover}
          alt={detail.judul}
          className="mt-10 aspect-16/8 size-full rounded-[2rem] object-cover shadow-elevated"
        />
      ) : null}

      <div className="mx-auto mt-10 max-w-3xl">
        <div className="prose-content text-base">
          <div dangerouslySetInnerHTML={{ __html: detail.deskripsi }} />
        </div>
        <div className="mt-12 flex justify-center">
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link to="/news">
              <ArrowLeft className="size-4" aria-hidden />
              Back to all news
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
