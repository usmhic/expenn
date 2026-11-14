"use client";

import Link from "next/link";
import { Fragment, startTransition, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, Camera, Check, ChevronDown, ChevronRight,
  ChevronsUpDown, Files, Home, LayoutDashboard, LogOut, Map as MapIcon, PanelLeftClose,
  PanelLeftOpen, Plane, Plus, Receipt, Search, Send, Settings, UserCog, Users, Wallet, X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { MeResponse } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark, Wordmark } from "@/components/layout/wordmark";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { switchOrgAction } from "@/app/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  /** Peer items shown in the switcher dropdown */
  items?: Array<{ label: string; href: string }>;
  /** If set, shows a "New …" action at the bottom of the dropdown */
  addHref?: string;
  addLabel?: string;
};

type Role = "admin" | "manager" | "traveler";
type OrgEntry = { id: string; name: string; slug: string; role?: string; accountType?: string };
type NavItem = { label: string; href: string; icon: typeof Home; badgeKey?: keyof NotifCounts; exact?: boolean };
type NavSection = { label: string; items: NavItem[] };

type SearchResult = {
  type: "trip" | "expense";
  id: string;
  label: string;
  sub: string;
};

type NotifCounts = {
  pendingApprovals: number;
  pendingExpenses: number;
  awaitingPayment: number;
  rejectedExpenses: number;
  draftExpenses: number;
  total: number;
};

const SIDEBAR_KEY = "expenn-sidebar-collapsed";

function navFor(slug: string, role: Role, personal?: boolean): NavSection[] {
  if (role === "traveler") {
    const root = `/${slug}/traveler`;
    return [
      {
        label: "Spend",
        items: [
          { label: "Home", href: root, icon: Home, exact: true },
          { label: "Expenses", href: `${root}/expenses`, icon: Wallet, badgeKey: "rejectedExpenses" },
          { label: "Trips", href: `${root}/trips`, icon: MapIcon },
          { label: "Documents", href: `${root}/documents`, icon: Files },
        ],
      },
      ...(personal
        ? [{ label: "Account", items: [{ label: "Account", href: `${root}/account`, icon: UserCog }] }]
        : []),
    ];
  }
  const root = `/${slug}/admin`;
  return [
    {
      label: "Workspace",
      items: [
        { label: "Overview", href: root, icon: LayoutDashboard, exact: true },
        { label: "Trips", href: `${root}/trips`, icon: MapIcon, badgeKey: "pendingApprovals" },
        { label: "Review & pay", href: `${root}/expenses`, icon: Receipt, badgeKey: "pendingExpenses" },
        ...(role === "manager" ? [] : [{ label: "Analytics", href: `${root}/analytics`, icon: BarChart3 }]),
      ],
    },
    {
      label: "Organisation",
      items: [{ label: "People & settings", href: `${root}/settings`, icon: Settings }],
    },
  ];
}

function mobileNavFor(slug: string, role: Role): NavItem[] {
  if (role === "traveler") {
    const root = `/${slug}/traveler`;
    return [
      { label: "Home", href: root, icon: Home, exact: true },
      { label: "Expenses", href: `${root}/expenses`, icon: Wallet },
      { label: "Capture", href: `${root}/capture`, icon: Camera },
      { label: "Trips", href: `${root}/trips`, icon: MapIcon },
      { label: "Docs", href: `${root}/documents`, icon: Files },
    ];
  }
  const root = `/${slug}/admin`;
  return [
    { label: "Overview", href: root, icon: LayoutDashboard, exact: true },
    { label: "Trips", href: `${root}/trips`, icon: MapIcon },
    { label: "Review", href: `${root}/expenses`, icon: Receipt, badgeKey: "pendingExpenses" },
    role === "manager"
      ? { label: "Settings", href: `${root}/settings`, icon: Settings }
      : { label: "Analytics", href: `${root}/analytics`, icon: BarChart3 },
  ];
}

export function AppShell({
  role,
  children,
  breadcrumbs,
  personal,
  wide,
}: {
  role: Role;
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  personal?: boolean;
  /** Let the page use the full content width (maps, planners). */
  wide?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [counts, setCounts] = useState<NotifCounts | null>(null);
  const [orgs, setOrgs] = useState<OrgEntry[]>([]);
  const slug = getWorkspaceSlug(pathname);
  const isPersonal = personal ?? orgs.find((o) => o.slug === slug)?.accountType === "personal";
  const sections = navFor(slug, role, isPersonal);
  const mobileNav = mobileNavFor(slug, role);

  useEffect(() => {
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    fetch("/api/notifications").then((r) => r.json()).then(setCounts).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    fetch("/api/me/orgs").then((r) => r.json()).then(setOrgs).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      if (stored === "true") startTransition(() => setCollapsed(true));
    } catch {}
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch {}
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success("Signed out.");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  const canSwitchView = me?.organizationRole ? ["owner", "admin", "manager"].includes(me.organizationRole) : role !== "traveler";

  return (
    <div className="app-shell">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="app-sidebar" data-collapsed={collapsed}>
        <div className={cn("flex h-10 items-center gap-2 px-1", collapsed && "justify-center px-0")}>
          <Wordmark compact={collapsed} href={sections[0].items[0].href} iconClassName="size-8" />
          {!collapsed && (
            <button onClick={toggleSidebar} className="icon-button icon-button-sm ml-auto" aria-label="Collapse sidebar">
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>

        <WorkspaceSwitcher orgs={orgs} slug={slug} collapsed={collapsed} />

        {role === "traveler" && (
          <Link
            href={`/${slug}/traveler/capture`}
            className={cn("primary-button mt-2 w-full", collapsed && "px-0")}
            aria-label="Capture a receipt"
            title={collapsed ? "Capture a receipt" : undefined}
          >
            <Camera className="size-4" />
            {!collapsed && "Capture receipt"}
          </Link>
        )}

        <nav className="mt-1 flex-1 overflow-y-auto scrollbar-none" aria-label={role === "traveler" ? "Traveler navigation" : "Admin navigation"}>
          {sections.map((section) => (
            <div key={section.label}>
              {collapsed ? <div className="my-2 h-px bg-border" /> : <p className="nav-section-label">{section.label}</p>}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item);
                  const badge = item.badgeKey && counts ? counts[item.badgeKey] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn("nav-link", active && "nav-link-active", collapsed && "justify-center px-0")}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="size-[1.125rem] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && badge > 0 && <span className="nav-badge">{badge > 99 ? "99+" : badge}</span>}
                      {collapsed && badge > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-border pt-3">
          {canSwitchView && (
            <Link
              href={role === "traveler" ? `/${slug}/admin` : `/${slug}/traveler`}
              className={cn("nav-link", collapsed && "justify-center px-0")}
              title={collapsed ? "Switch view" : undefined}
            >
              <ArrowLeftRight className="size-[1.125rem] shrink-0" />
              {!collapsed && <span className="truncate">{role === "traveler" ? "Admin view" : "My travel view"}</span>}
            </Link>
          )}
          <div className={cn("flex items-center gap-1", collapsed ? "flex-col" : "justify-between px-1")}>
            <Link href="/docs" className="icon-button icon-button-sm" title="Help center" aria-label="Help center">
              <BookOpen className="size-4" />
            </Link>
            <ThemeToggle className="icon-button-sm" />
            {collapsed ? (
              <button onClick={toggleSidebar} className="icon-button icon-button-sm" aria-label="Expand sidebar">
                <PanelLeftOpen className="size-4" />
              </button>
            ) : null}
          </div>
          <AccountMenu
            me={me}
            role={role}
            slug={slug}
            collapsed={collapsed}
            onSignOut={handleSignOut}
            signingOut={signingOut}
          />
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="app-main" data-collapsed={collapsed}>
        <header className="app-topbar">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link href={sections[0].items[0].href} className="lg:hidden" aria-label="Home">
              <BrandMark className="size-8" />
            </Link>
            <div className="lg:hidden min-w-0">
              <WorkspaceSwitcher orgs={orgs} slug={slug} compactTrigger />
            </div>
            <Breadcrumbs items={breadcrumbs} pathname={pathname} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <CommandSearch slug={slug} role={role} />
            <NotificationsMenu slug={slug} role={role} counts={counts} />
            <span className="lg:hidden">
              <AccountMenu me={me} role={role} slug={slug} collapsed iconOnly onSignOut={handleSignOut} signingOut={signingOut} />
            </span>
          </div>
        </header>
        <main className={cn("app-content", wide && "app-content-wide")}>{children}</main>
      </div>

      {/* ── Mobile tab bar ──────────────────────────────────────────────── */}
      <nav className="mobile-tabbar" aria-label="Primary">
        <ul className="flex items-stretch">
          {mobileNav.map((item) => {
            const active = isActive(pathname, item);
            const isCapture = item.href.endsWith("/capture");
            const badge = item.badgeKey && counts ? counts[item.badgeKey] : 0;
            return (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link href={item.href} className="mobile-tab relative" aria-current={active ? "page" : undefined}>
                  {isCapture ? (
                    <span className="mobile-tab-fab" aria-hidden>
                      <item.icon className="size-6" />
                    </span>
                  ) : (
                    <item.icon className="size-5" />
                  )}
                  <span className={cn(isCapture && "-mt-0.5")}>{item.label}</span>
                  {badge > 0 && <span className="absolute right-[28%] top-1.5 size-2 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/* ── Breadcrumbs ────────────────────────────────────────────────────────── */
function Breadcrumbs({ items, pathname }: { items?: BreadcrumbItem[]; pathname: string }) {
  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 overflow-hidden lg:flex">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-subtle" />}
            {item.items && item.items.length > 0 ? (
              <BreadcrumbDropdown item={item} currentPathname={pathname} />
            ) : item.href && !last ? (
              <Link href={item.href} className="truncate rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="truncate px-1.5 text-sm font-semibold text-foreground">{item.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function BreadcrumbDropdown({ item, currentPathname }: { item: BreadcrumbItem; currentPathname: string }) {
  const peers = item.items ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex max-w-[14rem] items-center gap-1 overflow-hidden rounded-md px-1.5 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
          <span className="truncate">{item.label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {peers.map((sub) => {
          const active = currentPathname.startsWith(sub.href);
          return (
            <DropdownMenuItem key={sub.href} asChild>
              <Link href={sub.href} className={cn("flex items-center justify-between gap-2", active && "text-primary")}>
                <span className="truncate">{sub.label}</span>
                {active && <Check className="size-3.5 shrink-0" />}
              </Link>
            </DropdownMenuItem>
          );
        })}
        {item.addHref && (
          <>
            {peers.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem asChild>
              <Link href={item.addHref} className="flex items-center gap-2 font-semibold text-primary">
                <Plus className="size-4" /> {item.addLabel ?? "New"}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Command search (⌘K) ────────────────────────────────────────────────── */
function CommandSearch({ slug, role }: { slug: string; role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = role === "traveler" ? `/${slug}/traveler` : `/${slug}/admin`;

  const quickLinks: SearchResult[] = role === "traveler"
    ? [
        { type: "trip", id: "__trips", label: "Plan a trip", sub: "Open your trips and the route planner" },
        { type: "expense", id: "__capture", label: "Capture a receipt", sub: "Add an expense with a photo" },
      ]
    : [
        { type: "expense", id: "__review", label: "Review & pay", sub: "Expenses waiting for a decision" },
        { type: "trip", id: "__trips", label: "All trips", sub: "Budgets, approvals and itineraries" },
      ];

  const fetchResults = useCallback((q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => { setResults(data.results ?? []); setActiveIndex(0); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchResults]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const list = query.trim().length >= 2 ? results : quickLinks;

  function go(result: SearchResult) {
    setOpen(false);
    setQuery("");
    if (result.id === "__trips") return router.push(`${root}/trips`);
    if (result.id === "__capture") return router.push(`/${slug}/traveler/capture`);
    if (result.id === "__review") return router.push(`/${slug}/admin/expenses`);
    if (result.type === "trip") return router.push(`${root}/trips/${result.id}`);
    router.push(role === "traveler" ? `/${slug}/traveler/expenses` : `/${slug}/admin/expenses?tab=all`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-subtle shadow-xs transition-colors hover:border-border-strong md:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-border bg-muted px-1.5 text-[0.6875rem] font-medium text-muted-foreground">⌘K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} className="icon-button md:hidden" aria-label="Search">
        <Search className="size-[1.125rem]" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
        <DialogContent className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, list.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
                if (e.key === "Enter" && list[activeIndex]) { e.preventDefault(); go(list[activeIndex]); }
              }}
              placeholder="Search trips and expenses"
              className="h-14 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-subtle"
            />
            {loading && <Spinner className="size-4 text-muted-foreground" />}
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {query.trim().length < 2 && <p className="px-2 pb-1 pt-1 text-xs font-medium text-subtle">Jump to</p>}
            {query.trim().length >= 2 && !loading && results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No trips or expenses match “{query}”.</p>
            )}
            {list.map((r, idx) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => go(r)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                  activeIndex === idx && "bg-muted"
                )}
              >
                <span className={cn("icon-tile size-8", r.type === "trip" && "icon-tile-primary")}>
                  {r.type === "trip" ? <MapIcon className="size-4" /> : <Receipt className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.label}</span>
                  {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                </span>
                {activeIndex === idx && <ChevronRight className="size-4 text-subtle" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Notifications ──────────────────────────────────────────────────────── */
function NotificationsMenu({ slug, role, counts }: { slug: string; role: Role; counts: NotifCounts | null }) {
  const total = counts?.total ?? 0;
  const admin = `/${slug}/admin`;
  const traveler = `/${slug}/traveler`;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const items = counts
    ? ([
        role !== "traveler" && counts.pendingExpenses > 0 && {
          key: "review", href: `${admin}/expenses`, icon: Receipt, tone: "bg-accent text-primary",
          title: `${plural(counts.pendingExpenses, "expense")} to review`, sub: "Submitted and waiting for a decision",
        },
        role !== "traveler" && counts.awaitingPayment > 0 && {
          key: "pay", href: `${admin}/expenses?tab=approved`, icon: Wallet, tone: "bg-mint/15 text-teal-700 dark:text-teal-300",
          title: `${plural(counts.awaitingPayment, "expense")} to pay`, sub: "Approved and owed to travelers",
        },
        role !== "traveler" && counts.pendingApprovals > 0 && {
          key: "trips", href: `${admin}/trips`, icon: Plane, tone: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
          title: `${plural(counts.pendingApprovals, "trip request")} pending`, sub: "Travel approvals awaiting a decision",
        },
        counts.rejectedExpenses > 0 && {
          key: "rejected", href: `${traveler}/expenses?status=rejected`, icon: X, tone: "bg-destructive/10 text-destructive",
          title: `${plural(counts.rejectedExpenses, "expense")} sent back`, sub: "Fix and resubmit to get paid",
        },
        counts.draftExpenses > 0 && {
          key: "drafts", href: `${traveler}/expenses?status=draft`, icon: Send, tone: "bg-muted text-muted-foreground",
          title: `${plural(counts.draftExpenses, "draft")} not submitted`, sub: "Submit when you're ready",
        },
      ].filter(Boolean) as { key: string; href: string; icon: typeof Bell; tone: string; title: string; sub: string }[])
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="icon-button relative" aria-label={total > 0 ? `Notifications, ${total} need attention` : "Notifications"}>
          <Bell className="size-[1.125rem]" />
          {total > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold leading-4 text-white">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Needs your attention</p>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <span className="empty-state-icon mx-auto size-10"><Check className="size-5" /></span>
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="p-1.5">
            {items.map(({ key, href, icon: Icon, tone, title, sub }) => (
              <DropdownMenuItem key={key} asChild className="rounded-lg p-2.5">
                <Link href={href} className="flex items-center gap-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Workspace switcher ─────────────────────────────────────────────────── */
function WorkspaceSwitcher({ orgs, slug, collapsed, compactTrigger }: { orgs: OrgEntry[]; slug: string; collapsed?: boolean; compactTrigger?: boolean }) {
  const current = orgs.find((o) => o.slug === slug);
  const name = current?.name ?? slug;
  const initial = name[0]?.toUpperCase() ?? "W";
  const roleLabel = current ? workspaceLabel(current) : "Workspace";

  const trigger = compactTrigger ? (
    <button className="flex max-w-[11rem] items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-semibold hover:bg-muted" aria-label="Switch workspace">
      <span className="truncate">{name}</span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  ) : (
    <button
      className={cn(
        "mt-3 flex w-full items-center gap-2.5 rounded-lg border border-border bg-card p-2 text-left shadow-xs transition-colors hover:border-border-strong",
        collapsed && "justify-center border-transparent bg-transparent p-1 shadow-none"
      )}
      aria-label="Switch workspace"
      title={collapsed ? name : undefined}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-brand text-sm font-bold text-white">
        {initial}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-subtle" />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {orgs.length > 0 && (
          <>
            <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-subtle">Workspaces</p>
            {orgs.map((org) => (
              <form key={org.id} action={switchOrgAction}>
                <input type="hidden" name="organizationId" value={org.id} />
                <input type="hidden" name="slug" value={org.slug} />
                {org.role && <input type="hidden" name="role" value={org.role} />}
                <DropdownMenuItem asChild>
                  <button type="submit" className="flex w-full cursor-pointer items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-gradient-brand text-[0.6875rem] font-bold text-white">
                      {org.name[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate">{org.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{workspaceLabel(org)}</span>
                    </span>
                    {org.slug === slug && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                </DropdownMenuItem>
              </form>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/onboarding" className="flex items-center gap-2">
            <Plus className="size-4" /> New workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Account menu ───────────────────────────────────────────────────────── */
function AccountMenu({
  me, role, slug, collapsed, iconOnly, onSignOut, signingOut,
}: {
  me: MeResponse | null;
  role: Role;
  slug: string;
  collapsed: boolean;
  iconOnly?: boolean;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const userName = me?.name ?? "Account";
  const userEmail = me?.email ?? "";
  const initials = userName.split(/[\s.@_-]+/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const canSwitchView = me?.organizationRole ? ["owner", "admin", "manager"].includes(me.organizationRole) : role !== "traveler";

  const trigger = iconOnly ? (
    <button className="icon-button" type="button" aria-label="Account">
      <span className="avatar size-7 text-[0.6875rem]">{initials}</span>
    </button>
  ) : (
    <button
      type="button"
      aria-label="Account"
      className={cn("flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent", collapsed && "justify-center")}
    >
      <span className="avatar size-8">{initials}</span>
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">{userName}</span>
          <span className="block truncate text-xs text-muted-foreground">{userEmail}</span>
        </span>
      )}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={iconOnly ? "end" : "start"} side={iconOnly ? "bottom" : "top"} className="w-60">
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <span className="avatar size-9">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        {canSwitchView && (
          <DropdownMenuItem asChild>
            <Link href={role === "traveler" ? `/${slug}/admin` : `/${slug}/traveler`} className="flex items-center gap-2">
              <ArrowLeftRight className="size-4" /> {role === "traveler" ? "Switch to admin view" : "Switch to my travel view"}
            </Link>
          </DropdownMenuItem>
        )}
        {role !== "traveler" && (
          <DropdownMenuItem asChild>
            <Link href={`/${slug}/admin/settings`} className="flex items-center gap-2">
              <Users className="size-4" /> People & settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/docs" className="flex items-center gap-2">
            <BookOpen className="size-4" /> Help center
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} disabled={signingOut} className="flex items-center gap-2">
          {signingOut ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function workspaceLabel(org: OrgEntry) {
  if (org.role) return ({ owner: "Owner", admin: "Admin", manager: "Manager", traveler: "Traveler" } as Record<string, string>)[org.role] ?? org.role;
  return org.accountType === "personal" ? "Personal workspace" : "Team workspace";
}

function getWorkspaceSlug(pathname: string) {
  const [segment] = pathname.split("/").filter(Boolean);
  return segment && !["dashboard", "login", "register", "onboarding"].includes(segment) ? segment : "workspace";
}

function isActive(pathname: string, item: Pick<NavItem, "href" | "exact">) {
  const path = pathname.replace(/\/$/, "") || "/";
  const h = item.href.split("?")[0].replace(/\/$/, "") || "/";
  if (path === h) return true;
  if (item.exact) return false;
  return path.startsWith(`${h}/`);
}

/* ── Status badge ───────────────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, { cls: string; dot: string; label?: string }> = {
  approved: { cls: "bg-teal-500/12 text-teal-800 dark:text-teal-200", dot: "bg-teal-500" },
  active: { cls: "bg-teal-500/12 text-teal-800 dark:text-teal-200", dot: "bg-teal-500" },
  submitted: { cls: "bg-blue-500/12 text-blue-800 dark:text-blue-200", dot: "bg-blue-500", label: "In review" },
  requested: { cls: "bg-amber-500/14 text-amber-800 dark:text-amber-200", dot: "bg-amber-500", label: "Pending" },
  draft: { cls: "bg-muted text-muted-foreground", dot: "bg-subtle" },
  planning: { cls: "bg-muted text-muted-foreground", dot: "bg-subtle" },
  rejected: { cls: "bg-rose-500/12 text-rose-800 dark:text-rose-200", dot: "bg-rose-500" },
  completed: { cls: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500" },
  reimbursed: { cls: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500", label: "Paid" },
  archived: { cls: "bg-muted text-muted-foreground", dot: "bg-subtle" },
  booked: { cls: "bg-teal-500/12 text-teal-800 dark:text-teal-200", dot: "bg-teal-500", label: "Booked" },
  planned: { cls: "bg-amber-500/14 text-amber-800 dark:text-amber-200", dot: "bg-amber-500", label: "To book" },
  cancelled: { cls: "bg-muted text-muted-foreground line-through", dot: "bg-subtle" },
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const style = STATUS_STYLES[value] ?? { cls: "bg-muted text-muted-foreground", dot: "bg-subtle" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", style.cls)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
      {label ?? style.label ?? value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  );
}
