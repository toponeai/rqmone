import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Sparkles, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type AuthorizationDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string } | null;
  scope?: string | string[];
  redirect_url?: string;
  redirect_to?: string;
};

// The @supabase/supabase-js `auth.oauth` namespace is beta and not in the
// public types yet — narrow it here so we still call the real methods.
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
};
const oauthApi = (): OAuthApi => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <ConsentShell>
      <p className="text-sm text-destructive">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </ConsentShell>
  ),
});

function ConsentShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, hsl(var(--primary) / 0.25), transparent 55%), radial-gradient(ellipse at 80% 90%, hsl(var(--accent) / 0.25), transparent 55%)",
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-2xl backdrop-blur">
          {children}
        </div>
      </div>
    </main>
  );
}

function Consent() {
  const details = Route.useLoaderData() as AuthorizationDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an app";
  const scopes = Array.isArray(details?.scope)
    ? details?.scope
    : typeof details?.scope === "string"
      ? details.scope.split(/\s+/).filter(Boolean)
      : [];

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <ConsentShell>
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/70 to-accent shadow-[0_0_30px_-6px_hsl(var(--primary))]">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Connect {clientName} to R.Q.M.1</h1>
          <p className="text-xs text-muted-foreground">Authorize access as your R.Q.M.1 account</p>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{clientName}</span> will be able to call this
        app’s enabled tools while you are signed in — including reading and creating your entities
        on the Earth.
      </p>

      {scopes && scopes.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          {scopes.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
        This does not bypass R.Q.M.1’s permissions or backend policies. The client can only see and
        modify what you can see and modify.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button className="flex-1" disabled={busy !== null} onClick={() => void decide(true)}>
          {busy === "approve" && <Loader2 className="h-4 w-4 animate-spin" />}
          Approve
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy !== null}
          onClick={() => void decide(false)}
        >
          {busy === "deny" && <Loader2 className="h-4 w-4 animate-spin" />}
          Cancel connection
        </Button>
      </div>
    </ConsentShell>
  );
}
