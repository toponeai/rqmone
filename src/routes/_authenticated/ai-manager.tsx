import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Flame,
  Loader2,
  MessageSquare,
  Plus,
  ScrollText,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  getAiStats,
  listConversations,
  deleteConversation,
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  listPlans,
  createPlan,
  updatePlanTaskStatus,
  updatePlanStatus,
  deletePlan,
  listTemplates,
  createTemplate,
  deleteTemplate,
  listAiLogs,
} from "@/modules/ai/ai.functions";
import { MODEL_OPTIONS, type AiAgent, type AiPlan, type AiPromptTemplate } from "@/modules/ai/types";
import { HOURLY_REQUEST_LIMIT, HOURLY_TOKEN_LIMIT } from "@/modules/ai/rate-limiter.server";

export const Route = createFileRoute("/_authenticated/ai-manager")({
  head: () => ({
    meta: [
      { title: "AI Manager — R.Q.M.1" },
      { name: "description", content: "Manage AI agents, conversations, plans, and templates." },
    ],
  }),
  component: AiManagerPage,
});

// ── Page ──────────────────────────────────────────────────────────────────────

function AiManagerPage() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="icon-sm">
          <Link to="/ai-core">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/70 to-accent shadow-[0_0_20px_-4px_hsl(var(--primary))]">
            <BrainCircuit className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI Manager</h1>
            <p className="text-[10px] text-muted-foreground">R.Q.M.1 · command centre</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="flex h-full flex-col">
          <div className="border-b border-border/60 bg-card/20 px-4 backdrop-blur">
            <TabsList className="h-9 gap-0 rounded-none bg-transparent p-0">
              {[
                { value: "overview", label: "Overview", icon: Sparkles },
                { value: "conversations", label: "Conversations", icon: MessageSquare },
                { value: "agents", label: "Agents", icon: Bot },
                { value: "plans", label: "Plans", icon: ClipboardList },
                { value: "templates", label: "Templates", icon: FileText },
                { value: "logs", label: "Logs", icon: ScrollText },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-9 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab />
              </TabsContent>
              <TabsContent value="conversations" className="mt-0">
                <ConversationsTab />
              </TabsContent>
              <TabsContent value="agents" className="mt-0">
                <AgentsTab />
              </TabsContent>
              <TabsContent value="plans" className="mt-0">
                <PlansTab />
              </TabsContent>
              <TabsContent value="templates" className="mt-0">
                <TemplatesTab />
              </TabsContent>
              <TabsContent value="logs" className="mt-0">
                <LogsTab />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </main>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab() {
  const fetchStats = useServerFn(getAiStats);
  const statsQuery = useQuery({ queryKey: ["ai", "stats"], queryFn: () => fetchStats(), staleTime: 30_000 });
  const stats = statsQuery.data;

  const statCards = [
    {
      label: "Conversations",
      value: stats?.total_conversations ?? "—",
      icon: MessageSquare,
      color: "text-blue-400",
    },
    {
      label: "Messages today",
      value: stats?.total_messages_today ?? "—",
      icon: Zap,
      color: "text-yellow-400",
    },
    {
      label: "Active agents",
      value: stats?.total_agents ?? "—",
      icon: Bot,
      color: "text-purple-400",
    },
    {
      label: "Active plans",
      value: stats?.active_plans ?? "—",
      icon: ClipboardList,
      color: "text-green-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/60 bg-card/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {statsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rate limit status */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-orange-400" />
            Rate Limit — This Hour
          </CardTitle>
          <CardDescription className="text-xs">
            {HOURLY_REQUEST_LIMIT} requests / {(HOURLY_TOKEN_LIMIT / 1000).toLocaleString()}K tokens per hour
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RateLimitBar
            label="Requests"
            used={stats?.requests_this_hour ?? 0}
            limit={HOURLY_REQUEST_LIMIT}
          />
          <RateLimitBar
            label="Tokens"
            used={stats?.tokens_this_hour ?? 0}
            limit={HOURLY_TOKEN_LIMIT}
            format={(n) => `${(n / 1000).toFixed(1)}K`}
          />
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "Open AI Core chat", to: "/ai-core", icon: MessageSquare },
          ].map(({ label, to, icon: Icon }) => (
            <Button key={to} asChild variant="outline" size="sm" className="justify-start gap-2">
              <Link to={to as "/"}>
                <Icon className="h-3.5 w-3.5" />
                {label}
                <ChevronRight className="ml-auto h-3 w-3 opacity-40" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RateLimitBar({
  label,
  used,
  limit,
  format = (n) => String(n),
}: {
  label: string;
  used: number;
  limit: number;
  format?: (n: number) => string;
}) {
  const pct = Math.min(100, limit > 0 ? (used / limit) * 100 : 0);
  const color = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-primary";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {format(used)} / {format(limit)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Conversations ─────────────────────────────────────────────────────────────

function ConversationsTab() {
  const queryClient = useQueryClient();
  const fetchConvs = useServerFn(listConversations);
  const deleteConv = useServerFn(deleteConversation);

  const query = useQuery({
    queryKey: ["ai", "conversations"],
    queryFn: () => fetchConvs(),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteConv({ data: { id } }),
    onSuccess: () => {
      toast.success("Conversation deleted");
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (query.isLoading) return <LoadingSpinner />;
  const conversations = query.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{conversations.length} conversations</p>
        <Button asChild size="sm" variant="outline">
          <Link to="/ai-core">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New chat
          </Link>
        </Button>
      </div>
      {conversations.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-8 w-8" />} text="No conversations yet" />
      ) : (
        <div className="space-y-1.5">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2"
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{conv.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {conv.message_count ?? 0} messages · {conv.model}
                </p>
              </div>
              <time className="text-[10px] text-muted-foreground">
                {new Date(conv.updated_at).toLocaleDateString()}
              </time>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => deleteMut.mutate(conv.id)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Agents ────────────────────────────────────────────────────────────────────

const agentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).default(""),
  system_prompt: z.string().min(10, "System prompt must be at least 10 characters").max(50000),
  model: z.string().default("google/gemini-2.5-flash"),
  provider: z.enum(["lovable-gateway", "openai", "google"]).default("lovable-gateway"),
  tools: z.string().default(""),
});

type AgentFormValues = z.infer<typeof agentSchema>;

function AgentsTab() {
  const queryClient = useQueryClient();
  const fetchAgents = useServerFn(listAgents);
  const createAgentFn = useServerFn(createAgent);
  const updateAgentFn = useServerFn(updateAgent);
  const deleteAgentFn = useServerFn(deleteAgent);

  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ["ai", "agents"],
    queryFn: () => fetchAgents(),
    staleTime: 30_000,
  });

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema) as Resolver<AgentFormValues>,
    defaultValues: {
      name: "",
      description: "",
      system_prompt: "",
      model: "google/gemini-2.5-flash",
      provider: "lovable-gateway",
      tools: "",
    },
  });

  const saveMut = useMutation({
    mutationFn: (values: AgentFormValues) => {
      const tools = values.tools
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (editingAgent) {
        return updateAgentFn({
          data: {
            id: editingAgent.id,
            name: values.name,
            description: values.description,
            system_prompt: values.system_prompt,
            model: values.model,
            provider: values.provider as "lovable-gateway" | "openai" | "google",
            tools,
          },
        });
      }
      return createAgentFn({
        data: {
          name: values.name,
          description: values.description,
          system_prompt: values.system_prompt,
          model: values.model,
          provider: values.provider as "lovable-gateway" | "openai" | "google",
          tools,
        },
      });
    },
    onSuccess: () => {
      toast.success(editingAgent ? "Agent updated" : "Agent created");
      queryClient.invalidateQueries({ queryKey: ["ai", "agents"] });
      setDialogOpen(false);
      setEditingAgent(null);
      form.reset();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleMut = useMutation({
    mutationFn: (agent: AiAgent) =>
      updateAgentFn({ data: { id: agent.id, is_active: !agent.is_active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai", "agents"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAgentFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Agent deleted");
      queryClient.invalidateQueries({ queryKey: ["ai", "agents"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function openForEdit(agent: AiAgent) {
    setEditingAgent(agent);
    form.reset({
      name: agent.name,
      description: agent.description,
      system_prompt: agent.system_prompt,
      model: agent.model,
      provider: agent.provider as "lovable-gateway" | "openai" | "google",
      tools: agent.tools.join(", "),
    });
    setDialogOpen(true);
  }

  function openForCreate() {
    setEditingAgent(null);
    form.reset();
    setDialogOpen(true);
  }

  if (query.isLoading) return <LoadingSpinner />;
  const agents = query.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{agents.length} agents</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openForCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingAgent ? "Edit agent" : "Create agent"}</DialogTitle>
              <DialogDescription>
                Agents have a custom system prompt, model, and tool set.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => saveMut.mutate(v))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Entity Consultant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="What this agent specialises in" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="system_prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="You are an expert…"
                          className="min-h-[120px] resize-y font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MODEL_OPTIONS.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lovable-gateway">Lovable Gateway</SelectItem>
                            <SelectItem value="openai">OpenAI (direct)</SelectItem>
                            <SelectItem value="google">Google (direct)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="tools"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tools</FormLabel>
                      <FormControl>
                        <Input placeholder="tool_a, tool_b" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Comma-separated MCP tool names
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMut.isPending}>
                    {saveMut.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {editingAgent ? "Save changes" : "Create agent"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <EmptyState icon={<Bot className="h-8 w-8" />} text="No agents yet — create one above" />
      ) : (
        <div className="space-y-1.5">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  {!agent.is_active && (
                    <Badge variant="secondary" className="text-[10px]">
                      inactive
                    </Badge>
                  )}
                </div>
                <p className="truncate text-[10px] text-muted-foreground">
                  {agent.description || agent.model}
                </p>
              </div>
              <Switch
                checked={agent.is_active}
                onCheckedChange={() => toggleMut.mutate(agent)}
                disabled={toggleMut.isPending}
                aria-label="Toggle agent active"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => openForEdit(agent)}>
                <FileText className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => deleteMut.mutate(agent.id)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Plans ─────────────────────────────────────────────────────────────────────

const planSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).default(""),
  goal: z.string().min(10, "Describe the goal in at least 10 characters").max(5000),
});

type PlanFormValues = z.infer<typeof planSchema>;

function PlansTab() {
  const queryClient = useQueryClient();
  const fetchPlans = useServerFn(listPlans);
  const createPlanFn = useServerFn(createPlan);
  const updateTaskFn = useServerFn(updatePlanTaskStatus);
  const updateStatusFn = useServerFn(updatePlanStatus);
  const deletePlanFn = useServerFn(deletePlan);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["ai", "plans"],
    queryFn: () => fetchPlans(),
    staleTime: 30_000,
  });

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema) as Resolver<PlanFormValues>,
    defaultValues: { title: "", description: "", goal: "" },
  });

  const createMut = useMutation({
    mutationFn: (v: PlanFormValues) => createPlanFn({ data: v }),
    onSuccess: () => {
      toast.success("Plan created");
      queryClient.invalidateQueries({ queryKey: ["ai", "plans"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const taskStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "in_progress" | "completed" | "failed" | "skipped" }) =>
      updateTaskFn({ data: { id, status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai", "plans"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const planStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "in_progress" | "completed" | "failed" | "cancelled" }) =>
      updateStatusFn({ data: { id, status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai", "plans"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePlanFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Plan deleted");
      queryClient.invalidateQueries({ queryKey: ["ai", "plans"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const plans = query.data ?? [];

  const statusColor: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    in_progress: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    cancelled: "bg-muted/50 text-muted-foreground",
    skipped: "bg-muted/50 text-muted-foreground",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{plans.length} plans</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create AI plan</DialogTitle>
              <DialogDescription>
                Describe a goal and the AI will generate an ordered task list.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMut.mutate(v))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan title</FormLabel>
                      <FormControl>
                        <Input placeholder="Expand presence in Europe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="I want to add 10 business entities in major European cities and optimise their descriptions for discovery…"
                          className="min-h-[100px] resize-y text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The AI will decompose this into actionable tasks.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      "Generate plan"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {query.isLoading ? (
        <LoadingSpinner />
      ) : plans.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-8 w-8" />} text="No plans yet — create one above" />
      ) : (
        <div className="space-y-2">
          {plans.map((plan: AiPlan) => (
            <div key={plan.id} className="rounded-lg border border-border/60 bg-card/60">
              <div
                className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              >
                <ClipboardList className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{plan.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {plan.tasks?.length ?? 0} tasks · {new Date(plan.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={`text-[10px] ${statusColor[plan.status] ?? ""}`}>
                  {plan.status.replace("_", " ")}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMut.mutate(plan.id);
                  }}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                </Button>
              </div>

              {expandedPlan === plan.id && (
                <>
                  <Separator />
                  <div className="space-y-1 p-3">
                    {plan.description && (
                      <p className="mb-2 text-xs text-muted-foreground">{plan.description}</p>
                    )}
                    {(plan.tasks ?? []).map((task) => (
                      <div key={task.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
                        <Select
                          value={task.status}
                          onValueChange={(s) =>
                            taskStatusMut.mutate({
                              id: task.id,
                              status: s as "pending" | "in_progress" | "completed" | "failed" | "skipped",
                            })
                          }
                        >
                          <SelectTrigger className="h-5 w-28 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["pending", "in_progress", "completed", "failed", "skipped"].map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {s.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex-1">
                          <p className="text-xs font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end gap-1.5 pt-2">
                      {plan.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => planStatusMut.mutate({ id: plan.id, status: "in_progress" })}
                          disabled={planStatusMut.isPending}
                        >
                          Start
                        </Button>
                      )}
                      {plan.status === "in_progress" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => planStatusMut.mutate({ id: plan.id, status: "completed" })}
                          disabled={planStatusMut.isPending}
                        >
                          Mark complete
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Templates ─────────────────────────────────────────────────────────────────

const templateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).default(""),
  template: z.string().min(10, "Template must be at least 10 characters").max(50000),
  variables: z.string().default(""),
  category: z.string().max(50).default("general"),
  is_public: z.boolean().default(false),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

function TemplatesTab() {
  const queryClient = useQueryClient();
  const fetchTemplates = useServerFn(listTemplates);
  const createTemplateFn = useServerFn(createTemplate);
  const deleteTemplateFn = useServerFn(deleteTemplate);

  const [dialogOpen, setDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ["ai", "templates"],
    queryFn: () => fetchTemplates(),
    staleTime: 60_000,
  });

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema) as Resolver<TemplateFormValues>,
    defaultValues: { name: "", description: "", template: "", variables: "", category: "general", is_public: false },
  });

  const createMut = useMutation({
    mutationFn: (v: TemplateFormValues) =>
      createTemplateFn({
        data: {
          ...v,
          variables: v.variables.split(",").map((s) => s.trim()).filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Template created");
      queryClient.invalidateQueries({ queryKey: ["ai", "templates"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTemplateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["ai", "templates"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const templates = query.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{templates.length} templates</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create prompt template</DialogTitle>
              <DialogDescription>
                Templates can include variables using {"{{variable_name}}"} syntax.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMut.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My template" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="general" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="What this template is for" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="You are an expert in {{topic}}. Help the user with {{task}}."
                          className="min-h-[120px] resize-y font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="variables"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variables</FormLabel>
                      <FormControl>
                        <Input placeholder="topic, task" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Comma-separated variable names</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Public template</FormLabel>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Create template
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {query.isLoading ? (
        <LoadingSpinner />
      ) : templates.length === 0 ? (
        <EmptyState icon={<FileText className="h-8 w-8" />} text="No templates yet" />
      ) : (
        <div className="space-y-1.5">
          {templates.map((tpl: AiPromptTemplate) => (
            <div
              key={tpl.id}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5"
            >
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {tpl.category}
                  </Badge>
                  {tpl.is_public && (
                    <Badge className="text-[10px]">public</Badge>
                  )}
                  {tpl.user_id === null && (
                    <Badge variant="outline" className="text-[10px]">system</Badge>
                  )}
                </div>
                <p className="truncate text-[10px] text-muted-foreground">
                  {tpl.description || `${tpl.variables.length} variable(s)`}
                </p>
              </div>
              {tpl.user_id !== null && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteMut.mutate(tpl.id)}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Logs ──────────────────────────────────────────────────────────────────────

function LogsTab() {
  const fetchLogs = useServerFn(listAiLogs);
  const query = useQuery({
    queryKey: ["ai", "logs"],
    queryFn: () => fetchLogs({ data: { limit: 100, offset: 0 } }),
    staleTime: 30_000,
  });

  const logs = query.data ?? [];

  const eventColor: Record<string, string> = {
    chat: "text-blue-400",
    conversation_created: "text-green-400",
    conversation_deleted: "text-red-400",
    agent_created: "text-purple-400",
    agent_updated: "text-purple-300",
    agent_deleted: "text-red-400",
    plan_created: "text-orange-400",
    plan_executed: "text-orange-300",
    task_executed: "text-yellow-400",
    template_created: "text-teal-400",
    rate_limited: "text-red-500",
    error: "text-red-500",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{logs.length} recent events</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {query.isLoading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-8 w-8" />} text="No log entries yet" />
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 rounded-md border border-border/40 bg-card/40 px-3 py-2"
            >
              <span className={`font-mono text-[10px] font-medium ${eventColor[log.event_type] ?? "text-muted-foreground"}`}>
                {log.event_type}
              </span>
              <span className="text-[10px] text-muted-foreground">{log.model ?? "—"}</span>
              {log.latency_ms != null && (
                <span className="text-[10px] text-muted-foreground">{log.latency_ms}ms</span>
              )}
              {log.error && (
                <span className="truncate text-[10px] text-red-400">{log.error}</span>
              )}
              <time className="ml-auto flex-shrink-0 text-[10px] text-muted-foreground">
                {new Date(log.created_at).toLocaleTimeString()}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 py-12 text-muted-foreground">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
