import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Wordmark } from "@/components/layout/wordmark";

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { workspace } = await searchParams;
  const settingsHref = workspace ? `/${workspace}/admin/settings` : "/onboarding";

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-8">
      <section className="w-full max-w-sm text-center">
        <Wordmark className="justify-center mb-8" iconClassName="brand-icon-mark size-9" textClassName="text-xl" />

        <div className="card p-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">Payment received</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Paddle is confirming your subscription. Your workspace plan will update within a few seconds once the webhook arrives.
          </p>
          <div className="mt-6 space-y-2">
            <Link href={settingsHref} className="primary-button w-full justify-center rounded-lg">
              Open workspace settings
            </Link>
            {workspace && (
              <Link href={`/${workspace}/admin`} className="secondary-button w-full justify-center rounded-lg">
                Go to dashboard
              </Link>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Didn&apos;t complete? <Link href="/checkout" className="underline underline-offset-2 hover:text-foreground">Try again</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
