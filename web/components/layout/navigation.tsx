"use client";

import Link from "next/link";
import Image from "next/image";
import { Fragment, startTransition, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell, BookOpen, BarChart3, Camera, Check, ChevronDown, ChevronRight,
  Files, Home, LogOut, Plane, Plus, Receipt, Search, Settings,
  UserRound, UserCog, Wallet, X, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { MeResponse } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Wordmark } from "@/components/layout/wordmark";
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

type OrgEntry = { id: string; name: string; slug: string; role: string };

type SearchResult = {
  type: "trip" | "expense";
  id: string;
  label: string;
  sub: string;
};

type NotifCounts = {
  pendingApprovals: number;
  submittedExpenses: number;
  missingReceipts: number;
  total: number;
};

const SIDEBAR_KEY = "expenn-sidebar-open";

function adminNav(slug: string, role: "admin" | "manager") {
  const root = `/${slug}/admin`;
  return [
    { label: "Trips", href: root, icon: Plane },
    ...(role === "manager" ? [] : [{ label: "Analytics", href: `${root}/analytics`, icon: BarChart3 }]),
    { label: "Settings", href: `${root}/settings`, icon: Settings },
  ] as const;
}

function travelerNav(slug: string, personal?: boolean) {
  const root = `/${slug}/traveler`;
  return [
    { label: "Home", href: root, icon: Home },
    { label: "Expenses", href: `${root}/expenses`, icon: Wallet },
    { label: "Capture", href: `${root}/capture`, icon: Camera },
    ...(personal ? [{ label: "Account", href: `${root}/account`, icon: UserCog }] : []),
  ] as const;
}

export function AppShell({
  role,
  children,
  breadcrumbs,
  personal,
}: {
  role: "admin" | "manager" | "traveler";
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  personal?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const slug = getWorkspaceSlug(pathname);
  const nav = role === "traveler" ? travelerNav(slug, personal) : adminNav(slug, role);
  const userName = me?.name ?? "Account";
  const userEmail = me?.email ?? "";

  useEffect(() => {
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      if (stored !== null) startTransition(() => setSidebarOpen(stored !== "false"));
    } catch {}
  }, []);

  function toggleSidebar() {
    const next = !sidebarOpen;
    setSidebarOpen(next);
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

  return (
    <div className="dashboard-shell">
      <div className="dashboard-frame">
        {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
        <aside className={cn("dashboard-sidebar hidden lg:flex lg:flex-col", !sidebarOpen && "dashboard-sidebar-collapsed")}>

          {/* Brand + toggle */}
          {sidebarOpen ? (
            <div className="dashboard-sidebar-brand">
              <Wordmark className="flex-1 min-w-0" />
              <button
                onClick={toggleSidebar}
                className="icon-button ml-auto shrink-0"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </div>
          ) : (
            <div className="dashboard-sidebar-brand flex-col items-center justify-center gap-2">
              <Link href="/" className="flex items-center justify-center" aria-label="Home">
                <span className="brand-icon-mark size-8 rounded-lg">
                  <Image src="/icon.png" alt="" width={32} height={32} className="size-full object-contain" />
                </span>
              </Link>
              <button
                onClick={toggleSidebar}
                className="icon-button"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </div>
          )}

          {/* Nav items */}
          <nav
            className="dashboard-sidebar-nav flex-1 space-y-0.5"
            aria-label={role === "traveler" ? "Traveler navigation" : "Admin navigation"}
          >
            {nav.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn("nav-link", isActive(pathname, href) && "nav-link-active", !sidebarOpen && "justify-center gap-0 px-0")}
                aria-label={!sidebarOpen ? label : undefined}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon className="size-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </Link>
            ))}
          </nav>

          {/* Bottom: docs + theme (same row) + account */}
          <div className="mt-4 space-y-1">
            <div className={cn("flex items-center", sidebarOpen ? "justify-between" : "flex-col gap-2 items-center")}>
              <Link
                href="/docs"
                className="icon-button"
                title="Documentation"
                aria-label="Documentation"
              >
                <BookOpen className="size-4" />
              </Link>
              <ThemeToggle />
            </div>

            <AccountMenu
              userName={userName}
              userEmail={userEmail}
              role={role}
              slug={slug}
              collapsed={!sidebarOpen}
              onSignOut={handleSignOut}
              signingOut={signingOut}
            />
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="dashboard-main">
          <header className="top-bar">
            {/* Left: wordmark (mobile/tablet) + org switcher + breadcrumbs */}
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              <Wordmark className="hidden sm:inline-flex lg:hidden shrink-0 mr-1" />
              <OrgSwitcher slug={slug} />
              {breadcrumbs?.map((item, i) => (
                <Fragment key={i}>
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground/35" />
                  {item.items && item.items.length > 0 ? (
                    <BreadcrumbDropdown item={item} currentPathname={pathname} />
                  ) : item.href ? (
                    <Link href={item.href} className="truncate text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-semibold text-foreground">{item.label}</span>
                  )}
                </Fragment>
              ))}
            </div>

            {/* Right action buttons */}
            <div className="flex shrink-0 items-center gap-1">
              {/* Desktop-only action buttons */}
              <div className="hidden lg:flex items-center gap-1">
                <SearchButton slug={slug} role={role} />
                <NotifButton />
                {role === "traveler" && (
                  <Link
                    href={`/${slug}/traveler/documents`}
                    className="icon-button"
                    title="My documents"
                    aria-label="My documents"
                  >
                    <Files className="size-4" />
                  </Link>
                )}
              </div>

              {/* Mobile-only fallbacks */}
              <Link href="/docs" className="icon-button lg:hidden" aria-label="Documentation" title="Docs">
                <BookOpen className="size-4" />
              </Link>
              <span className="lg:hidden"><ThemeToggle /></span>
              <span className="lg:hidden">
                <AccountMenu
                  userName={userName}
                  userEmail={userEmail}
                  role={role}
                  slug={slug}
                  collapsed={true}
                  onSignOut={handleSignOut}
                  signingOut={signingOut}
                />
              </span>
            </div>
          </header>
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ───────────────────────────────────────────── */}
      <nav className="mobile-nav lg:hidden">
        <ul className={cn("grid text-center", nav.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
          {nav.map(({ label, href, icon: Icon }) => {
            const isCapture = href.endsWith("/capture");
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn("mobile-nav-link", active && "mobile-nav-link-active", isCapture && !active && "text-primary")}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={cn(
                    "mobile-nav-icon",
                    isCapture && "bg-gradient-primary text-primary-foreground shadow-elegant",
                    active && !isCapture && "bg-primary/12 text-primary",
                  )}>
                    <Icon className="size-4" />
                  </span>
                  <span className="mobile-nav-label">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/* ── Search button ──────────────────────────────────────────────────────── */
function SearchButton({ slug, role }: { slug: string; role: "admin" | "manager" | "traveler" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => { setResults(data.results ?? []); setActiveIndex(-1); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchResults]);

  useEffect(() => {
    if (!open) { startTransition(() => { setQuery(""); setResults([]); setActiveIndex(-1); }); return; }
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); return; }
      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        navigateTo(results[activeIndex]);
      }
    }
    function onMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [open, activeIndex, results]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigateTo(result: SearchResult) {
    setOpen(false);
    if (result.type === "trip") {
      router.push(`/${slug}/${role === "traveler" ? "traveler" : "admin"}/trips/${result.id}`);
    } else {
      router.push(`/${slug}/traveler/expenses`);
    }
  }

  const trips = results.filter((r) => r.type === "trip");
  const expenses = results.filter((r) => r.type === "expense");

  return (
    <div className="relative" ref={ref}>
      <button
        className="icon-button"
        title="Search"
        aria-label="Search"
        onClick={() => setOpen((v) => !v)}
      >
        <Search className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 rounded-xl border border-border bg-popover shadow-soft overflow-hidden animate-fade-in">
          {/* Input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trips, expenses…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading ? (
              <Spinner className="size-3.5 text-muted-foreground" />
            ) : query ? (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground" aria-label="Clear">
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Results */}
          {query.trim() && !loading && results.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No results for &quot;{query}&quot;</p>
          )}

          {!query.trim() && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Type to search trips and expenses</p>
          )}

          {results.length > 0 && (
            <div className="max-h-72 overflow-y-auto py-1">
              {trips.length > 0 && (
                <div>
                  <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Trips</p>
                  {trips.map((r) => {
                    const idx = results.indexOf(r);
                    return (
                      <button
                        key={r.id}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors",
                          activeIndex === idx && "bg-secondary"
                        )}
                        onClick={() => navigateTo(r)}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Plane className="size-3" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{r.label}</span>
                          {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {expenses.length > 0 && (
                <div>
                  <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Expenses</p>
                  {expenses.map((r) => {
                    const idx = results.indexOf(r);
                    return (
                      <button
                        key={r.id}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors",
                          activeIndex === idx && "bg-secondary"
                        )}
                        onClick={() => navigateTo(r)}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                          <Receipt className="size-3" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{r.label}</span>
                          {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Notification button ────────────────────────────────────────────────── */
function NotifButton() {
  const [counts, setCounts] = useState<NotifCounts | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const total = counts?.total ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        className="icon-button relative"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[0.6rem] font-bold text-white leading-none">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-xl border border-border bg-popover shadow-soft overflow-hidden animate-fade-in">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
          </div>

          {!counts || total === 0 ? (
            <p className="px-3 py-5 text-center text-xs text-muted-foreground">All caught up — nothing pending.</p>
          ) : (
            <div className="py-1">
              {counts.pendingApprovals > 0 && (
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                    <Plane className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {counts.pendingApprovals} approval{counts.pendingApprovals !== 1 ? "s" : ""} pending
                    </p>
                    <p className="text-xs text-muted-foreground">Trip requests awaiting decision</p>
                  </div>
                </div>
              )}
              {counts.submittedExpenses > 0 && (
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">
                    <Receipt className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {counts.submittedExpenses} expense{counts.submittedExpenses !== 1 ? "s" : ""} to review
                    </p>
                    <p className="text-xs text-muted-foreground">Submitted and awaiting approval</p>
                  </div>
                </div>
              )}
              {counts.missingReceipts > 0 && (
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300">
                    <X className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {counts.missingReceipts} missing receipt{counts.missingReceipts !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Expenses without a receipt attached</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Org switcher ───────────────────────────────────────────────────────── */
function OrgSwitcher({ slug }: { slug: string }) {
  const [orgs, setOrgs] = useState<OrgEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me/orgs").then((r) => r.json()).then(setOrgs).catch(() => {});
  }, []);

  const current = orgs.find((o) => o.slug === slug);
  const displayName = current?.name ?? slug;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex max-w-[9rem] items-center gap-1.5 overflow-hidden rounded-md px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-secondary"
          aria-label="Switch workspace"
        >
          <span className="brand-letter-mark size-5 shrink-0 rounded-[0.3rem] text-[0.6rem]">
            {displayName[0]?.toUpperCase() ?? "W"}
          </span>
          <span className="truncate">{displayName}</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {orgs.length > 0 && (
          <>
            <p className="px-2.5 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Workspaces
            </p>
            {orgs.map((org) => (
              <form key={org.id} action={switchOrgAction}>
                <input type="hidden" name="organizationId" value={org.id} />
                <input type="hidden" name="slug" value={org.slug} />
                <input type="hidden" name="role" value={org.role} />
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full cursor-pointer">
                    <span className="brand-letter-mark mr-2 size-5 shrink-0 rounded-[0.3rem] text-[0.6rem]">
                      {org.name[0]?.toUpperCase()}
                    </span>
                    <span className="truncate flex-1">{org.name}</span>
                    {org.slug === slug && <Check className="size-3.5 text-primary shrink-0" />}
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

/* ── Breadcrumb dropdown ────────────────────────────────────────────────── */
function BreadcrumbDropdown({ item, currentPathname }: { item: BreadcrumbItem; currentPathname: string }) {
  const peers = item.items ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex max-w-[12rem] items-center gap-1 overflow-hidden rounded-md px-2 py-1 text-sm font-semibold text-foreground hover:bg-secondary transition-colors group">
          <span className="truncate">{item.label}</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {peers.length > 0 && (
          <p className="px-2.5 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Switch
          </p>
        )}
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
        {peers.length === 0 && !item.addHref && (
          <p className="px-3 py-3 text-center text-sm text-muted-foreground">No other items</p>
        )}
        {item.addHref && (
          <>
            {peers.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem asChild>
              <Link
                href={item.addHref}
                className="flex items-center gap-2 text-sm font-semibold text-primary"
              >
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/12">
                  <Plus className="size-2.5" />
                </span>
                {item.addLabel ?? "New"}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function getWorkspaceSlug(pathname: string) {
  const [segment] = pathname.split("/").filter(Boolean);
  return segment && !["dashboard", "login", "register", "onboarding"].includes(segment)
    ? segment : "workspace";
}

function isActive(pathname: string, href: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  const h = href.split("?")[0].replace(/\/$/, "") || "/";
  if (path === h) return true;
  // For root admin/traveler, activate for nested routes that aren't named siblings
  if (/\/(admin|traveler)$/.test(h)) {
    const after = path.slice(h.length);
    if (!after.startsWith("/")) return false;
    const seg = after.slice(1).split("/")[0];
    return !["analytics", "settings", "capture", "expenses", "documents"].includes(seg);
  }
  return path.startsWith(`${h}/`);
}

/* ── Account menu ───────────────────────────────────────────────────────── */
function AccountMenu({
  userName, userEmail, role, slug, collapsed, onSignOut, signingOut, asIconOnly,
}: {
  userName: string; userEmail: string;
  role: "admin" | "manager" | "traveler"; slug: string;
  collapsed: boolean;
  onSignOut: () => void; signingOut: boolean; asIconOnly?: boolean;
}) {
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  const trigger = asIconOnly ? (
    <button
      className="icon-button"
      type="button"
      aria-label="Account"
      title="Account"
    >
      <span className="flex size-5 items-center justify-center rounded-md bg-gradient-primary text-[0.6rem] font-bold text-primary-foreground">
        {initials}
      </span>
    </button>
  ) : (
    <button
      className={cn("sidebar-user w-full text-left", collapsed && "sidebar-user-collapsed")}
      type="button"
      aria-label="Account"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-[0.7rem] font-bold text-primary-foreground shadow-elegant">
        {initials}
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{userName}</span>
          <span className="block truncate text-xs text-muted-foreground">{userEmail}</span>
        </span>
      )}
    </button>
  );

  const otherHref = role === "traveler" ? `/${slug}/admin` : `/${slug}/traveler`;
  const switchLabel = role === "traveler" ? "Switch to Admin view" : "Switch to Traveler view";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-[0.75rem] font-bold text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={otherHref} className="flex items-center gap-2 text-sm">
            <UserRound className="size-4" />
            {switchLabel}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} disabled={signingOut} className="text-sm">
          {signingOut ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Status badge ───────────────────────────────────────────────────────── */
export function StatusBadge({ value }: { value: string }) {
  const { cls, dot } = (
    {
      approved: { cls: "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200", dot: "bg-teal-500" },
      active: { cls: "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200", dot: "bg-teal-500" },
      submitted: { cls: "bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-200", dot: "bg-blue-500" },
      requested: { cls: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200", dot: "bg-amber-500" },
      draft: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300", dot: "bg-amber-400" },
      rejected: { cls: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200", dot: "bg-rose-500" },
      completed: { cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200", dot: "bg-emerald-500" },
      reimbursed: { cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200", dot: "bg-emerald-500" },
    } as Record<string, { cls: string; dot: string }>
  )[value] ?? { cls: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground/60" };

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize", cls)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      {value}
    </span>
  );
}
