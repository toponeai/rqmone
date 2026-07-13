import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Globe2, Loader2, Mail, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — R.Q.M.1" },
      {
        name: "description",
        content:
          "Sign in to R.Q.M.1 to place your business, property, event or product on the living Earth.",
      },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(v: string | undefined): string {
  if (!v) return "/";
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return "/";
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const target = safeRedirect(search.redirect);
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: target, replace: true });
    }
  }, [loading, session, target, navigate]);

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
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-bold tracking-tight"
        >
          <Globe2 className="h-6 w-6 text-primary" />
          <span>
            R.Q.M.<span className="text-primary">1</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Earth</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to place and manage entities on the living planet.
          </p>

          <div className="mt-6">
            <GoogleButton redirectTo={target} />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border/60" />
            or with email
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-4">
              <SignInForm target={target} />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to Earth
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleButton({ redirectTo }: { redirectTo: string }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
      // Store intended destination in sessionStorage for post-OAuth navigation.
      if (typeof window !== "undefined" && redirectTo !== "/") {
        sessionStorage.setItem("rqm1:post-auth-redirect", redirectTo);
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: String(result.error) });
        setLoading(false);
        return;
      }
      // If redirected, the browser navigates away; otherwise session is set.
    } catch (e) {
      toast.error("Google sign-in failed", { description: (e as Error).message });
      setLoading(false);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
      Continue with Google
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.75-6-6.15S8.7 5.9 12 5.9c1.9 0 3.15.8 3.9 1.5l2.65-2.55C16.95 3.35 14.7 2.4 12 2.4 6.9 2.4 2.75 6.55 2.75 11.65S6.9 20.9 12 20.9c6.95 0 9.25-4.85 9.25-7.4 0-.5-.05-.9-.15-1.3H12z"
      />
    </svg>
  );
}

function SignInForm({ target }: { target: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Sign in failed", { description: error.message });
      return;
    }
    toast.success("Welcome back");
    navigate({ to: target, replace: true });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="si-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="si-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="si-password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="si-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            placeholder="••••••••"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name || undefined },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Sign up failed", { description: error.message });
      return;
    }
    toast.success("Check your inbox", {
      description: "Confirm your email to activate your account.",
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="su-name">Display name</Label>
        <Input
          id="su-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="su-email">Email</Label>
        <Input
          id="su-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="su-password">Password</Label>
        <Input
          id="su-password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
