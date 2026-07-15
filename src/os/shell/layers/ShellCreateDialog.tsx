import { useCreateStore } from "@/os/stores/create.store";
import { CreateEntityDialog } from "@/modules/entity/CreateEntityDialog";

/**
 * Shell-level create dialog wired to `useCreateStore`. This is the single
 * source of truth for entity creation — TopNav, LeftDock, BottomNav, the
 * UniversalCreateMenu, the command palette, and Earth clicks all route
 * through this store, and only this component renders the dialog.
 */
export function ShellCreateDialog() {
  const open = useCreateStore((s) => s.dialogOpen);
  const coords = useCreateStore((s) => s.pickedCoords);
  const desiredType = useCreateStore((s) => s.desiredType);
  const closeDialog = useCreateStore((s) => s.closeDialog);
  const requestPick = useCreateStore((s) => s.requestPick);

  return (
    <CreateEntityDialog
      open={open}
      onOpenChange={(v) => (v ? null : closeDialog())}
      coords={coords}
      initialType={desiredType ?? undefined}
      onRequestPick={requestPick}
    />
  );
}