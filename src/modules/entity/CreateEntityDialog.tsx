import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Loader2, Crosshair } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createEntity } from "@/modules/entity/entity.functions";
import type { EntityType, JsonValue } from "@/modules/entity/types";
import { ENTITY_TYPE_CONFIG, ENTITY_TYPE_LIST } from "@/modules/config/entity-types";

interface CreateEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coords: { lat: number; lng: number } | null;
  onRequestPick: () => void;
}

export function CreateEntityDialog({
  open,
  onOpenChange,
  coords,
  onRequestPick,
}: CreateEntityDialogProps) {
  const [type, setType] = useState<EntityType>("business");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const queryClient = useQueryClient();
  const createFn = useServerFn(createEntity);

  // Sync coords picked from the globe into the editable fields.
  const coordLat = coords ? coords.lat.toFixed(4) : lat;
  const coordLng = coords ? coords.lng.toFixed(4) : lng;

  const config = ENTITY_TYPE_CONFIG[type];

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedLat = Number(coordLat);
      const parsedLng = Number(coordLng);
      if (!title.trim()) throw new Error("Please enter a title.");
      if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
        throw new Error("Please set a valid location.");
      }
      const metadata: Record<string, JsonValue> = {};
      for (const field of config.fields) {
        const value = meta[field.key];
        if (value != null && value !== "") metadata[field.key] = value;
      }
      return createFn({
        data: {
          type,
          title: title.trim(),
          description: description.trim(),
          lat: parsedLat,
          lng: parsedLng,
          metadata,
        },
      });
    },
    onSuccess: () => {
      toast.success("Placed on Earth", {
        description: `${title.trim()} is now discoverable on the planet.`,
      });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      setTitle("");
      setDescription("");
      setMeta({});
      setLat("");
      setLng("");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Couldn't place entity", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Earth</DialogTitle>
          <DialogDescription>
            Every object lives on the planet. Place it at a real location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EntityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPE_LIST.map((c) => (
                  <SelectItem key={c.type} value={c.type}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Name of your ${config.label.toLowerCase()}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              maxLength={5000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what this is about…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {config.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={meta[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(e) => setMeta((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Location</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-primary"
                onClick={onRequestPick}
              >
                <Crosshair className="h-3.5 w-3.5" />
                Pick on globe
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                inputMode="decimal"
                value={coordLat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Latitude"
              />
              <Input
                inputMode="decimal"
                value={coordLng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Longitude"
              />
            </div>
            {coords && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 text-primary" />
                Location picked from the globe.
              </p>
            )}
          </div>
        </div>

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
            Place on Earth
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
