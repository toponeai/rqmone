import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "@/os/icons";

import { Button } from "@/components/ui/button";
import { InteractiveEarth } from "@/modules/maps/InteractiveEarth";
import { getEntityById } from "@/modules/entity/entity.functions";
import { ENTITY_TYPE_CONFIG } from "@/modules/config/entity-types";

export const Route = createFileRoute("/entity/$id")({
  loader: async ({ params }) => {
    const entity = await getEntityById({ data: { id: params.id } });
    if (!entity) throw notFound();
    return entity;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Entity not found — R.Q.M.1" }, { name: "robots", content: "noindex" }],
      };
    }
    const label = ENTITY_TYPE_CONFIG[loaderData.type].label;
    const title = `${loaderData.title} — R.Q.M.1`;
    const description =
      loaderData.description?.slice(0, 155) ||
      `A ${label.toLowerCase()} discoverable on the R.Q.M.1 interactive Earth.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: EntityDetail,
  errorComponent: ({ error }) => (
    <CenteredMessage title="This entity didn't load" body={error.message} />
  ),
  notFoundComponent: () => (
    <CenteredMessage
      title="Entity not found"
      body="This entity doesn't exist or is no longer published."
    />
  ),
});

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/">Back to Earth</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function EntityDetail() {
  const entity = Route.useLoaderData();
  const router = useRouter();
  const config = ENTITY_TYPE_CONFIG[entity.type as keyof typeof ENTITY_TYPE_CONFIG];
  const Icon = config.icon;

  const metaEntries = Object.entries(entity.metadata ?? {}).filter(
    ([, v]) => v != null && v !== "",
  );

  const point = {
    id: entity.id,
    type: entity.type,
    title: entity.title,
    lat: entity.lat,
    lng: entity.lng,
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <InteractiveEarth points={[point]} focus={{ lat: entity.lat, lng: entity.lng }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/30 to-transparent" />

      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Button
          variant="outline"
          className="gap-2 bg-card/80 backdrop-blur"
          onClick={() => router.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Earth
        </Button>
      </div>

      <section className="absolute bottom-4 left-4 top-20 z-10 flex w-[26rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-2xl backdrop-blur-md">
        <div className="overflow-y-auto p-6">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${config.color}22`, color: config.color }}
          >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight">{entity.title}</h1>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {entity.lat.toFixed(3)}, {entity.lng.toFixed(3)}
          </p>

          {entity.description && (
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">{entity.description}</p>
          )}

          {metaEntries.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {metaEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-border/50 bg-background/40 px-3 py-2"
                >
                  <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    {key}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    </main>
  );
}
