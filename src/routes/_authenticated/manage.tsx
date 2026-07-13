import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Globe2,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { getMyEntities, deleteEntity, updateEntity } from "@/modules/entity/entity.functions";
import { ENTITY_TYPE_CONFIG } from "@/modules/config/entity-types";
import type { MyEntity } from "@/modules/entity/types";
import { EditEntityDialog } from "@/modules/entity/EditEntityDialog";

export const Route = createFileRoute("/_authenticated/manage")({
  head: () => ({
    meta: [
      { title: "Your entities — R.Q.M.1" },
      {
        name: "description",
        content:
          "Manage the businesses, properties, events and products you've placed on the Earth.",
      },
    ],
  }),
  component: ManagePage,
});

function ManagePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchMine = useServerFn(getMyEntities);
  const deleteFn = useServerFn(deleteEntity);
  const updateFn = useServerFn(updateEntity);

  const [editing, setEditing] = useState<MyEntity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MyEntity | null>(null);

  const query = useQuery({
    queryKey: ["my-entities"],
    queryFn: () => fetchMine(),
  });

  const togglePublish = useMutation({
    mutationFn: (e: MyEntity) =>
      updateFn({
        data: {
          id: e.id,
          title: e.title,
          description: e.description,
          lat: e.lat,
          lng: e.lng,
          metadata: e.metadata,
          published: !e.published,
        },
      }),
    onSuccess: (_r, e) => {
      toast.success(e.published ? "Unpublished" : "Published");
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (err: Error) => toast.error("Couldn't update", { description: err.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed from Earth");
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (err: Error) => toast.error("Couldn't delete", { description: err.message }),
  });

  const items = query.data ?? [];

  return (
    <main className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 10% -10%, hsl(var(--primary) / 0.15), transparent 55%), radial-gradient(ellipse at 90% 100%, hsl(var(--accent) / 0.15), transparent 55%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Earth
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Globe2 className="h-5 w-5 text-primary" />
            R.Q.M.<span className="text-primary">1</span>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your entities</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length === 0
                ? "You haven't placed anything on Earth yet."
                : `${items.length} ${items.length === 1 ? "entity" : "entities"} live on the planet.`}
            </p>
          </div>
          <Button onClick={() => navigate({ to: "/" })} className="gap-2">
            <Plus className="h-4 w-4" />
            Add to Earth
          </Button>
        </div>

        {query.isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-12 text-center">
            <p className="text-muted-foreground">
              Head back to the globe and place your first entity on Earth.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {items.map((e) => {
              const c = ENTITY_TYPE_CONFIG[e.type];
              const Icon = c.icon;
              return (
                <li
                  key={e.id}
                  className="group rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur transition-colors hover:border-border"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${c.color}22`, color: c.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/entity/$id"
                          params={{ id: e.id }}
                          className="truncate text-base font-semibold hover:underline"
                        >
                          {e.title}
                        </Link>
                        <Badge
                          variant="outline"
                          className="border-transparent text-xs"
                          style={{ backgroundColor: `${c.color}22`, color: c.color }}
                        >
                          {c.label}
                        </Badge>
                        {!e.published && (
                          <Badge variant="outline" className="text-xs">
                            Draft
                          </Badge>
                        )}
                      </div>
                      {e.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {e.description}
                        </p>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 text-primary" />
                        {e.lat.toFixed(3)}, {e.lng.toFixed(3)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={e.published ? "Unpublish" : "Publish"}
                        onClick={() => togglePublish.mutate(e)}
                        disabled={togglePublish.isPending}
                      >
                        {e.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => setEditing(e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => setConfirmDelete(e)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <EditEntityDialog
        entity={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this entity from Earth?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.title} will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) remove.mutate(confirmDelete.id);
              }}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
