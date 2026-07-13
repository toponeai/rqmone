import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { updateEntity } from "@/modules/entity/entity.functions";
import type { JsonValue, MyEntity } from "@/modules/entity/types";
import { ENTITY_TYPE_CONFIG } from "@/modules/config/entity-types";

interface Props {
  entity: MyEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEntityDialog({ entity, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateEntity);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [published, setPublished] = useState(true);

  useEffect(() => {
    if (entity && open) {
      setTitle(entity.title);
      setDescription(entity.description);
      const m: Record<string, string> = {};
      for (const [k, v] of Object.entries(entity.metadata)) {
        if (v == null) continue;
        m[k] = typeof v === "string" ? v : String(v);
      }
      setMeta(m);
      setLat(String(entity.lat));
      setLng(String(entity.lng));
      setPublished(entity.published);
    }
  }, [entity, open]);

  const config = entity ? ENTITY_TYPE_CONFIG[entity.type] : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entity) throw new Error("No entity");
      const parsedLat = Number(lat);
      const parsedLng = Number(lng);
      if (!title.trim()) throw new Error("Title is required");
      if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
        throw new Error("Invalid coordinates");
      }
      const metadata: Record<string, JsonValue> = {};
      if (config) {
        for (const field of config.fields) {
          const v = meta[field.key];
          if (v != null && v !== "") metadata[field.key] = v;
        }
      }
      return updateFn({
        data: {
          id: entity.id,
          title: title.trim(),
          description: description.trim(),
          lat: parsedLat,
          lng: parsedLng,
          metadata,
          published,
        },
      });
    },
    onSuccess: () => {
      toast.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["my-entities"] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Couldn't update", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit entity</DialogTitle>
          <DialogDescription>
            {config ? `Update your ${config.label.toLowerCase()}.` : ""}
          </DialogDescription>
        </DialogHeader>

        {entity && config && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                maxLength={5000}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`edit-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`edit-${field.key}`}
                    value={meta[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setMeta((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Latitude"
                />
                <Input
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Longitude"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
              <div>
                <Label className="text-sm font-medium">Published</Label>
                <p className="text-xs text-muted-foreground">
                  When off, only you can see this entity.
                </p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
