# Stage 1 — R.Q.M.1 Operating System Foundation

Permanent shell that every future stage plugs into. Nothing here is throwaway. Existing code (Earth, Entity engine, AI Core, Auth) is extended, never replaced.

---

## 1. Directory layout (permanent)

```text
src/
├── os/                          ← the OS kernel (new)
│   ├── shell/
│   │   ├── AppShell.tsx         ← composes all layers
│   │   ├── layers/
│   │   │   ├── TopNav.tsx
│   │   │   ├── LeftDock.tsx
│   │   │   ├── RightDock.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── CenterWorkspace.tsx      ← <Outlet/> host
│   │   │   ├── FloatingWindowsLayer.tsx
│   │   │   ├── ModalLayer.tsx
│   │   │   ├── NotificationLayer.tsx
│   │   │   ├── AILayer.tsx              ← floating orb + panel
│   │   │   ├── ContextMenuLayer.tsx
│   │   │   └── CommandPaletteLayer.tsx
│   │   └── responsive.ts        ← breakpoint tokens + useBreakpoint
│   ├── stores/                  ← zustand slices (one per domain)
│   │   ├── ui.store.ts          ← docks open/collapsed, active layer, theme
│   │   ├── map.store.ts         ← camera, layers, picking (moved from index.tsx)
│   │   ├── search.store.ts      ← query, filters, facets
│   │   ├── entity.store.ts      ← selection, drafts
│   │   ├── user.store.ts        ← session mirror + preferences
│   │   ├── notification.store.ts
│   │   ├── ai.store.ts          ← AI Core panel state
│   │   ├── window.store.ts      ← floating windows registry
│   │   └── command.store.ts     ← palette open, recent commands
│   ├── commands/                ← universal command bus
│   │   ├── registry.ts          ← Command type + register()
│   │   ├── bus.ts               ← execute(id, ctx), keybindings
│   │   ├── builtins/            ← search, create, navigate, open, close,
│   │   │                          share, save, delete, edit, translate,
│   │   │                          analyze, ai-chat, toggle-theme, toggle-locale
│   │   └── useCommand.ts
│   ├── windows/                 ← floating window manager
│   │   ├── WindowManager.tsx    ← renders window.store
│   │   ├── FloatingWindow.tsx   ← move/resize/min/max/dock/pin
│   │   ├── useWindow.ts         ← openWindow({id, title, component, props})
│   │   └── types.ts
│   ├── icons/
│   │   └── registry.tsx         ← single source; re-exports named icons
│   ├── i18n/
│   │   ├── index.ts             ← useLocale, t(), dir
│   │   ├── locales/en.ts
│   │   └── locales/ar.ts
│   └── a11y/
│       ├── useReducedMotion.ts
│       ├── useHighContrast.ts
│       └── FocusRing.tsx
├── design/                      ← design system (new)
│   ├── tokens.css               ← imported by styles.css; all tokens
│   ├── motion.ts                ← durations, easings, spring presets
│   ├── glass.ts                 ← glass tier variants
│   └── particles/               ← aurora, meteors, stars (reusable)
```

Nothing in `os/` or `design/` is Stage-1-only. Later stages import from these.

---

## 2. Design system (tokens, no hardcoding)

Extend `src/styles.css` by importing `src/design/tokens.css`. Adds:

- **Color** — `--rqm-primary #00D9FF`, `--rqm-secondary #6C63FF`, `--rqm-accent #00FFA3`, `--rqm-warning`, `--rqm-danger`, `--rqm-success`, `--rqm-bg #050816`, `--rqm-panel #0B1220`, `--rqm-border rgba(255,255,255,.08)`, plus mapped shadcn tokens via `@theme inline`.
- **Spacing** — `--space-0…--space-16` on a 4px grid.
- **Radius** — `--radius-sm/md/lg/xl/2xl/full`.
- **Elevation** — 6 shadow tiers (`--elev-1…--elev-6`) including aurora glow.
- **Glass tiers** — `.rqm-glass-1/2/3` utilities via `@utility` (backdrop-blur only, no hand-written `-webkit-` prefixes).
- **Motion** — `--dur-fast/base/slow`, `--ease-out/in-out/spring`; `prefers-reduced-motion` overrides all durations to 1ms.
- **Typography** — Space Grotesk (headings) + Inter (body) already loaded via `<link>` in `__root.tsx`; token names formalized.
- **Particles** — aurora + meteor keyframes as reusable `@utility` classes.

Enforcement: ESLint rule config note in AGENTS.md warning against hex literals in components (advisory, not blocking).

---

## 3. Icon registry

`src/os/icons/registry.tsx` re-exports every icon used in the app under semantic names:

```ts
export { Home as HomeIcon, Globe2 as EarthIcon, Search as SearchIcon, ... } from "lucide-react";
```

All modules import from `@/os/icons`. Adding a new icon = one line in the registry. Enables future swap to custom icon set without touching consumers.

---

## 4. State managers (zustand)

One store per domain (list in §1). Each store exports `useX()` hook + selector helpers. Rules:

- No cross-store imports; stores communicate via the command bus.
- Session mirror in `user.store` is hydrated from `useSession()` in `__root.tsx` — auth logic stays in `src/hooks/use-session.ts` and `_authenticated` gate. Never duplicated.
- `map.store` absorbs the camera/picking/filter state currently inline in `src/routes/index.tsx` so multiple modules can read it.

Zustand chosen (tiny, no provider, SSR-safe with `create` + lazy hydration). Added to `package.json`.

---

## 5. Command system

`src/os/commands/registry.ts`:

```ts
interface Command {
  id: string;                    // "entity.create", "nav.home", "ai.chat"
  title: string;                 // i18n key
  icon?: IconName;
  group: "search" | "create" | "navigate" | "action" | "ai" | "system";
  keybinding?: string;           // "mod+k", "mod+shift+n"
  when?: (ctx) => boolean;       // auth/role/route gates
  run: (ctx) => void | Promise<void>;
}
```

- `bus.execute(id)` is the ONLY way to fire cross-module actions from Stage 2 onward.
- Command Palette (`⌘K`) opens `CommandPaletteLayer`, filters registry, respects `when`.
- Universal `+` button, top-nav voice/scan/AI, right-click context menus all resolve through the bus.
- Built-ins ship in Stage 1: navigate.*, entity.create.*, ai.chat.open, ui.toggle-theme, ui.toggle-locale, search.focus.

---

## 6. Window manager

`src/os/windows/`:

- `window.store` holds `{ id, title, component, props, x, y, w, h, z, state: "normal|min|max|docked", pinned }[]`.
- `WindowManager` renders inside `FloatingWindowsLayer`.
- `FloatingWindow` uses framer-motion drag + resize handles; focus brings to front (z-index bump).
- Public API: `openWindow({ id, title, component: () => <MarketplacePanel/>, dock: "right" })`.
- Stage 2+ modules (Marketplace, Wallet, Messaging) open as windows over the Earth instead of route replacements — router still supports deep-links; opening a route can auto-open the corresponding window.

---

## 7. Layer stack (z-index contract)

Fixed z-scale in tokens.css so no layer ever conflicts:

```text
0    Earth canvas
10   CenterWorkspace overlays (type filters, results panel)
20   Docks (left/right/bottom)
30   TopNav
40   Floating Windows
50   AI Layer (orb)
60   Context Menus
70   Modals
80   Command Palette
90   Notifications (toasts)
```

---

## 8. Responsive strategy

`src/os/shell/responsive.ts` exports `useBreakpoint()` → `"mobile" | "tablet" | "desktop"`.

- **Desktop** (≥1024): Top + Left + Right docks, no BottomNav.
- **Tablet** (≥640): Top + collapsed Left dock, no Right dock (moved into a top-nav menu), no BottomNav.
- **Mobile** (<640): Top (compact) + BottomNav, docks accessible via drawer.
- Future desktop app (Tauri/Electron) and mobile app (Capacitor) reuse the same shell — capability flags in `ui.store` (`platform: "web|desktop|mobile-native"`) let native shells hide web-only affordances.

---

## 9. Routing (non-breaking)

- Keep every existing route: `/`, `/auth`, `/entity/$id`, `/_authenticated/manage`, `/_authenticated/ai-core`.
- `__root.tsx` wraps `<Outlet/>` in `<AppShell>`.
- `src/routes/index.tsx` loses its inline header (moved into TopNav) but keeps Earth-specific overlays inside `CenterWorkspace`. Camera/filter state migrates from local `useState` to `map.store` — behavior unchanged, references updated.
- No new placeholder routes. Future modules attach via `openWindow` and register their route later in their own stage.

---

## 10. i18n / RTL

- Tiny in-house dictionary (`en`, `ar`) — no i18next dep. `useLocale()` reads/writes `localStorage`, mutates `document.documentElement.{lang,dir}` inside `useEffect` (SSR-safe per execution-model rules).
- Only new shell strings are translated in Stage 1; per-module translation lands with each future stage.
- Toggle in TopNav + RightDock. Default `en` LTR.
- All layout uses logical CSS (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) so RTL flips correctly.

---

## 11. Accessibility

- Keyboard: every dock button focusable, `⌘K` palette, `Esc` closes top layer, arrow-key nav in palette.
- ARIA: docks are `<nav aria-label>`, workspace is single `<main>`, floating windows are `role="dialog" aria-modal="false"`.
- Screen readers: icon-only buttons carry `aria-label` from the command title.
- Reduced motion: `useReducedMotion` disables aurora/meteor + framer springs.
- High contrast: `useHighContrast` toggles a `.hc` class that swaps to WCAG-AAA token variants.

---

## 12. Performance

- Every layer component wrapped in `React.lazy` + `Suspense` inside AppShell (docks/palette/windows load on first interaction).
- Zustand selectors + `useShallow` to avoid re-renders.
- `map.store` continues to feed the existing viewport-clustering query; request cancellation via TanStack Query's built-in AbortController.
- Command palette uses virtualized list (`@tanstack/react-virtual`, already a transitive dep) when >100 commands.
- Route-level code splitting stays automatic (TanStack default).

---

## 13. Security

- No new tables, no new server functions, no new RLS in Stage 1.
- `user.store` mirrors session but NEVER stores tokens; auth stays in Supabase client.
- Command `when` gates use existing `useSession` — no parallel auth logic.
- Floating windows respect the same `_authenticated` gate as routes: opening a protected window while signed out routes through the command bus to `/auth`.

---

## 14. Future-module readiness

After Stage 1 each future stage adds ONLY:

1. Its data layer (migration + server fns).
2. Its window/panel component.
3. Command registrations in `os/commands/builtins/<module>.ts`.
4. Optional route file.

Shell architecture does not change again.

---

## 15. Verification checklist (before closing Stage 1)

- `bun run build` + typecheck + lint clean.
- `/` shows Earth with entities/clusters (regression parity with current behavior).
- Docks render on desktop, collapse on tablet, become BottomNav on mobile.
- `⌘K` opens palette, executes `navigate.home`, `entity.create.business`, `ai.chat.open`.
- Language toggle flips whole shell to Arabic RTL and back with no layout breakage.
- Reduced-motion OS setting kills aurora/meteor animations.
- Opening a demo floating window (dev-only command) supports move/resize/min/max/dock/pin.
- No hex color literals introduced in new components (all via tokens).
- No icon imported from `lucide-react` in shell/module code — only via `@/os/icons`.

---

## Deliverables summary

~30 new files under `src/os/` and `src/design/`, edits to `__root.tsx`, `styles.css`, `index.tsx`, `package.json` (+ `zustand`). Existing files touched only to move state into stores or route imports through the icon registry — no functional regressions.

Reply **"go"** to switch to build mode and start Stage 1. Say **"adjust: …"** to change scope before I build.المخطط الذي عرضته ممتاز كأساس، لكن إذا كان هدف **R.Q.M.1** هو أن يصبح نظام تشغيل عالمي مبني حول الأرض التفاعلية، فأنا أوصي بعدم البدء ببناء Stage 1 كما هو مباشرة، بل بإعادة ترتيب الأولويات حتى لا تضطر لإعادة كتابة أجزاء كبيرة لاحقًا.

الترتيب الذي أوصي به هو:

```
Foundation
│
├── Core Engine
│
├── OS Layer
│
├── Earth Engine
│
├── Entity Engine
│
├── Search Engine
│
├── AI Core
│
├── Marketplace
│
├── Wallet
│
├── Live
│
├── Analytics
│
└── Admin

```

أما بالنسبة لـ **Stage 1** فأنا سأعتبره ليس مجرد Shell، بل سيكون نواة النظام بالكامل.

---

# Stage 1 Final Goal

بمجرد انتهاء Stage 1 يجب أن يصبح المشروع يمتلك:

✅ Operating System

✅ Design System

✅ Component Library

✅ Window Manager

✅ Command Bus

✅ Theme Engine

✅ Language Engine

✅ Icon Registry

✅ Responsive Engine

✅ Accessibility Layer

✅ State Management

✅ Plugin Loader

أي أن أي شيء يتم بناؤه بعد ذلك لن يحتاج لتعديل هذه الطبقة مرة أخرى.

---

# Stage 1 Architecture

```
R.Q.M.1

Operating System

├── Kernel
│
├── Shell
│
├── Windows
│
├── Commands
│
├── Plugins
│
├── Events
│
├── Theme
│
├── Locale
│
├── Notifications
│
├── AI
│
└── Workspace

```

---

# Every Future Module

أي Module جديد سيكون بهذه البنية:

```
Marketplace

├── UI

├── Commands

├── Windows

├── Routes

├── Database

├── Services

├── AI

├── Analytics

└── Permissions

```

أي Module مستقل تمامًا.

---

# Command Bus

كل شيء في النظام لا يستدعي Module آخر مباشرة.

بدلاً من ذلك:

```
User clicks

↓

Command

↓

Command Bus

↓

Module

↓

Event

↓

UI Updates

```

مثال:

```
User presses +

↓

entity.create.business

↓

Entity Module

↓

Create Entity Window

↓

Database

↓

Realtime

↓

Earth Updates

```

---

# Event System

كل العمليات تعتمد على الأحداث.

```
Entity Created

↓

Earth

↓

Search

↓

Analytics

↓

Notifications

↓

AI

↓

Marketplace

```

كل Module يستمع فقط للأحداث التي يحتاجها.

---

# Plugin System

كل نظام داخل R.Q.M.1 Plugin.

```
Earth Plugin

Search Plugin

Wallet Plugin

Marketplace Plugin

Ads Plugin

Live Plugin

Maps Plugin

AI Plugin

Media Plugin

```

يمكن تعطيل أي Plugin بدون كسر النظام.

---

# Universal Window System

لا توجد صفحات منفصلة.

كل شيء عبارة عن Window.

```
Earth

↓

Search Window

↓

Marketplace Window

↓

Wallet Window

↓

AI Window

↓

Business Window

↓

Profile Window

```

حتى Dashboard عبارة عن Window.

---

# AI Integration

الذكاء الاصطناعي ليس صفحة.

هو طبقة داخل النظام.

```
User

↓

AI Layer

↓

Command Bus

↓

Entity Engine

↓

Maps

↓

Search

↓

Response

```

---

# Universal Search

البحث لا يعرف نوع البيانات.

```
Search

↓

Entity Engine

↓

Everything

```

ثم يعرض النتائج حسب النوع.

---

# Earth Engine

الأرض ليست Component.

بل Engine مستقل.

```
Earth Engine

↓

Camera

↓

LOD

↓

Atmosphere

↓

Clouds

↓

Weather

↓

Entities

↓

Routes

↓

Heatmaps

↓

Navigation

```

---

# Entity Engine

```
Entity

↓

Validation

↓

Permissions

↓

Media

↓

Location

↓

AI

↓

Analytics

↓

Search

↓

Database

```

---

# Security Layer

كل طلب يمر بالتسلسل التالي:

```
Client

↓

Validation

↓

Rate Limit

↓

Authentication

↓

Authorization

↓

RLS

↓

Business Logic

↓

Database

↓

Audit

```

ولا يوجد أي استثناء.

---

# Data Flow

```
User

↓

UI

↓

Command

↓

Command Bus

↓

Module

↓

Server Function

↓

Database

↓

Realtime

↓

Subscribers

↓

Earth

↓

Search

↓

Analytics

↓

Notifications

↓

UI

```

---

# Complete Startup Flow

```
Application

↓

Kernel

↓

Configuration

↓

Theme

↓

Language

↓

Plugins

↓

Authentication

↓

Permissions

↓

Maps

↓

Earth

↓

Search

↓

AI

↓

Realtime

↓

Shell

↓

Application Ready

```

---

# Long-Term Vision

بعد اكتمال جميع المراحل، سيكون **R.Q.M.1** منصة موحدة تعمل كنظام تشغيل رقمي عالمي، حيث تكون الأرض التفاعلية هي الواجهة الرئيسية، وكل الكيانات (أعمال، عقارات، وظائف، منتجات، أحداث، مستخدمون، خدمات، بث مباشر، ووكلاء ذكاء اصطناعي) تُدار من خلال محركات موحدة، مع قابلية توسع كبيرة دون الحاجة إلى إعادة تصميم البنية الأساسية.

&nbsp;