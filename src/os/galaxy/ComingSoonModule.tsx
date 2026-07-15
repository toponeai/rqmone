import { useT } from "@/os/i18n";
import type { en } from "@/os/i18n/locales/en";
import type { Planet } from "./planets";

type TKey = keyof typeof en;


/**
 * Placeholder window content for planets not yet shipped. Keeps the OS
 * navigable while individual modules land in later stages.
 */
export function ComingSoonModule({ planet }: { planet: Planet }) {
  const t = useT();
  const Icon = planet.icon;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${planet.color}cc, ${planet.color}44 70%, transparent)`,
          boxShadow: `0 0 40px ${planet.color}66`,
        }}
      >
        <Icon className="h-10 w-10 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{t(planet.labelKey as TKey)}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {planet.soonKey ? t(planet.soonKey as TKey) : t("module.soon.body")}
        </p>
      </div>
      <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        {t("soon.badge")}
      </span>
    </div>
  );
}
