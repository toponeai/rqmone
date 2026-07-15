import {
  BusinessIcon,
  EventIcon,
  PlusIcon,
  ProductIcon,
  PropertyIcon,
} from "@/os/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { executeCommand } from "@/os/commands/bus";
import { useT } from "@/os/i18n";

const items = [
  { id: "entity.create.business", label: "create.business", icon: BusinessIcon },
  { id: "entity.create.property", label: "create.property", icon: PropertyIcon },
  { id: "entity.create.event", label: "create.event", icon: EventIcon },
  { id: "entity.create.product", label: "create.product", icon: ProductIcon },
] as const;

export function UniversalCreateMenu() {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          aria-label={t("action.add")}
          className="h-10 w-10 rounded-full shadow-[var(--elev-aurora)]"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("create.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((it) => (
          <DropdownMenuItem key={it.id} onClick={() => void executeCommand(it.id)}>
            <it.icon className="me-2 h-4 w-4" />
            {t(it.label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}