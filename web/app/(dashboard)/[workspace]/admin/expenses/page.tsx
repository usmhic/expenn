import Link from "next/link";
import { Download, Timer } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { ReviewQueue } from "@/components/review-queue";
import { apiClient } from "@/lib/api-client";
import { formatTotals, pick } from "@/lib/expenses";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "submitted", label: "To review" },
  { key: "approved", label: "To pay" },
  { key: "reimbursed", label: "Paid" },
  { key: "rejected", label: "Sent back" },
  { key: "all", label: "All" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function AdminExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ workspace }, filters] = await Promise.all([params, searchParams]);
  const tab: TabKey = TABS.some((t) => t.key === filters.tab) ? (filters.tab as TabKey) : "submitted";
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [me, expenses, summary] = await Promise.all([
    api.auth.me(),
    api.expenses.list({}),
    api.expenses.summary(),
  ]);
  const role = me.organizationRole === "manager" ? "manager" : "admin";

  // Drafts are private to travelers until submitted.
  const reviewable = expenses.filter((e) => e.status !== "draft");
  const counts: Record<TabKey, number> = {
    submitted: reviewable.filter((e) => e.status === "submitted").length,
    approved: reviewable.filter((e) => e.status === "approved").length,
    reimbursed: reviewable.filter((e) => e.status === "reimbursed").length,
    rejected: reviewable.filter((e) => e.status === "rejected").length,
    all: reviewable.length,
  };
  const visible = tab === "all" ? reviewable : reviewable.filter((e) => e.status === tab);
  // Oldest first in the inbox tabs so nobody waits longest; newest first elsewhere.
  if (tab === "submitted" || tab === "approved") {
    visible.sort((a, b) => (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt));
  }
  const oldestWaitingDays = tab === "submitted" && visible[0] ? daysSince(visible[0].submittedAt ?? visible[0].createdAt) : 0;
  const exportHref = `/api/expenses/export${tab === "all" ? "" : `?status=${tab}`}`;
  const root = `/${workspace}/admin/expenses`;

  return (
    <AppShell role={role} breadcrumbs={[{ label: "Review" }]}>
      <section className="w-full space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Review &amp; pay</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Approve submitted expenses, then mark them paid once the money is out.
            </p>
          </div>
          <a href={exportHref} className="secondary-button rounded-lg text-sm" download>
            <Download className="size-4" /> Export CSV
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Waiting for review" value={formatTotals(pick(summary.byCurrency, "pending"), "Nothing pending")} sub={`${counts.submitted} expense${counts.submitted === 1 ? "" : "s"}`} tone={counts.submitted > 0 ? "amber" : "neutral"} />
          <SummaryTile label="Approved, to pay" value={formatTotals(pick(summary.byCurrency, "owed"), "Nothing owed")} sub="Reimbursable, not yet paid" tone="blue" />
          <SummaryTile label="Paid out" value={formatTotals(pick(summary.byCurrency, "reimbursed"), "—")} sub="All time" tone="neutral" />
        </div>

        <article className="card overflow-hidden p-0">
          <nav className="flex overflow-x-auto border-b border-border/60" aria-label="Review views" style={{ scrollbarWidth: "none" }}>
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "submitted" ? root : `${root}?tab=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-colors",
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[0.65rem]",
                    t.key === "submitted" && counts.submitted > 0
                      ? "bg-amber-100 font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"
                      : "text-muted-foreground/70"
                  )}
                >
                  {counts[t.key]}
                </span>
              </Link>
            ))}
          </nav>
          {oldestWaitingDays >= 3 && (
            <p className="flex items-center gap-1.5 border-b border-border/60 bg-amber-50/60 px-4 py-2 text-xs text-amber-800 dark:bg-amber-400/5 dark:text-amber-200">
              <Timer className="size-3.5" /> The oldest expense has waited {oldestWaitingDays} days. Fast reimbursement is the #1 thing travelers ask for.
            </p>
          )}
          <ReviewQueue expenses={visible} tab={tab} />
        </article>
      </section>
    </AppShell>
  );
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function SummaryTile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "amber" | "blue" | "neutral" }) {
  return (
    <article className="card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-bold tabular-nums leading-snug",
          tone === "amber" && "text-amber-700 dark:text-amber-300",
          tone === "blue" && "text-blue-700 dark:text-blue-300"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{sub}</p>
    </article>
  );
}
