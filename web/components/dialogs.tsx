"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check, MapPin, Plus, Send, Shield, Users, UserPlus, Wallet, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { DateButton } from "@/components/ui/date-button";
import {
  addToTeamDialogAction,
  assignTravelersDialogAction,
  bulkApproveApprovalsAction,
  createExpenseDialogAction,
  createTeamDialogAction,
  createTripDialogAction,
  inviteMemberDialogAction,
  requestApprovalDialogAction,
  reviewApprovalDialogAction,
  reviewExpenseDialogAction,
  submitExpenseAction,
  type DialogState,
} from "@/app/dialog-actions";

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
      {message}
    </div>
  );
}

function DialogFooterRow({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" className="secondary-button rounded-lg text-sm" onClick={onClose}>
        Cancel
      </button>
      <SubmitButton pendingText="Saving…" className="primary-button rounded-lg text-sm">
        Save
      </SubmitButton>
    </div>
  );
}

/* ── Reusable confirmation dialog ────────────────────────────────────────── */
function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  confirmClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="secondary-button rounded-lg text-sm" onClick={onClose}>
            Cancel
          </button>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Create Trip ─────────────────────────────────────────────────────────── */
export function CreateTripDialog({
  teams,
  travelers,
}: {
  teams: { id: string; name: string }[];
  travelers: { userId: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createTripDialogAction, null as DialogState);

  useEffect(() => {
    if (state?.success) {
      startTransition(() => setOpen(false));
      router.refresh();
      toast.success("Trip created.");
    }
  }, [state?.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="primary-button rounded-lg text-sm">
          <Plus className="size-4" /> New trip
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
              <MapPin className="size-3.5" />
            </span>
            New trip
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          {state?.error && <ErrorBanner message={state.error} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Trip name
              <input name="name" required placeholder="Paris client visit" className="form-control font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Destination
              <input name="destination" required placeholder="Paris, France" className="form-control font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Start date
              <DateButton name="startDate" required placeholder="Start date" className="w-full" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              End date
              <DateButton name="endDate" required placeholder="End date" className="w-full" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Budget
              <input name="budget" type="number" min="0" step="0.01" required placeholder="5000" className="form-control font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Currency
              <input name="currency" required defaultValue="USD" className="form-control font-normal uppercase" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Team
              <select name="teamId" required className="form-control font-normal">
                <option value="">Select team…</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Status
              <select name="status" className="form-control font-normal">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>
          {travelers.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Assign travelers</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {travelers.map((t) => (
                  <label key={t.userId} className="traveler-check">
                    <input type="checkbox" name="travelerUserIds" value={t.userId} />
                    <span className="traveler-avatar">{t.name[0]?.toUpperCase()}</span>
                    <span className="min-w-0 truncate text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {teams.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">No teams yet — create one in Settings first.</p>
          )}
          <DialogFooterRow onClose={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Create Expense ──────────────────────────────────────────────────────── */
export function CreateExpenseDialog({ trips }: { trips: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitNow, setSubmitNow] = useState(false);
  const [state, action] = useActionState(createExpenseDialogAction, null as DialogState);

  useEffect(() => {
    if (state?.success) {
      startTransition(() => setOpen(false));
      router.refresh();
      toast.success(submitNow ? "Expense submitted for review." : "Expense saved as draft.");
    }
  }, [state?.success, router, submitNow]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="primary-button rounded-lg text-sm">
          <Plus className="size-4" /> Add expense
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
              <Wallet className="size-3.5" />
            </span>
            Add expense
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          {state?.error && <ErrorBanner message={state.error} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Merchant
              <input name="merchant" required placeholder="e.g. Marriott Hotel" className="form-control font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Amount
              <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className="form-control font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Currency
              <input name="currency" required defaultValue="USD" className="form-control font-normal uppercase" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Category
              <input name="category" required placeholder="e.g. Meals" className="form-control font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Date
              <DateButton name="date" required placeholder="Expense date" className="w-full" />
            </label>
            <label className="grid gap-1 text-sm font-medium col-span-2 sm:col-span-1">
              Trip
              <select name="tripId" required={trips.length > 0} className="form-control font-normal">
                {trips.length > 0 ? (
                  <>
                    <option value="">Select a trip…</option>
                    {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </>
                ) : (
                  <option value="">No trips assigned</option>
                )}
              </select>
              {trips.length === 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">You need a trip assignment before adding expenses.</span>
              )}
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Payment method
            <select name="paymentMethod" className="form-control font-normal">
              <option value="">Select…</option>
              <option value="personal_card">Personal card</option>
              <option value="company_card">Company card</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Receipt (photo or PDF)
            <input name="receipt" type="file" accept="image/*,application/pdf" className="form-control font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Notes
            <textarea name="notes" placeholder="Optional notes for the reviewer" className="form-control min-h-16 font-normal" />
          </label>
          <input type="hidden" name="status" value={submitNow ? "submitted" : "draft"} />
          <label className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={submitNow}
              onChange={(e) => setSubmitNow(e.target.checked)}
              className="size-4 rounded accent-primary"
            />
            <span>Submit for review immediately</span>
          </label>
          <DialogFooterRow onClose={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Invite Member ───────────────────────────────────────────────────────── */
export function InviteMemberDialog({ compact }: { compact?: boolean } = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(inviteMemberDialogAction, null as DialogState);

  useEffect(() => {
    if (state?.success) {
      startTransition(() => setOpen(false));
      router.refresh();
      toast.success("Invitation sent.");
    }
  }, [state?.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <button className="secondary-button rounded-md text-sm">
            <UserPlus className="size-4" /> Invite
          </button>
        ) : (
          <button className="primary-button rounded-lg text-sm">
            <Plus className="size-4" /> Invite member
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
              <Users className="size-3.5" />
            </span>
            Invite member
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          {state?.error && <ErrorBanner message={state.error} />}
          <label className="grid gap-1 text-sm font-medium">
            Email address
            <input name="email" type="email" required placeholder="colleague@company.com" className="form-control font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Role
            <select name="role" className="form-control font-normal">
              <option value="traveler">Traveler</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">They&apos;ll receive an email with a link to join this workspace.</p>
          <DialogFooterRow onClose={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Create Team ─────────────────────────────────────────────────────────── */
export function CreateTeamDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createTeamDialogAction, null as DialogState);

  useEffect(() => {
    if (state?.success) {
      startTransition(() => setOpen(false));
      router.refresh();
      toast.success("Team created.");
    }
  }, [state?.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="secondary-button rounded-lg text-sm">
          <Plus className="size-4" /> New team
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Shield className="size-3.5" />
            </span>
            New team
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          {state?.error && <ErrorBanner message={state.error} />}
          <label className="grid gap-1 text-sm font-medium">
            Team name
            <input name="name" required placeholder="e.g. Engineering" className="form-control font-normal" />
          </label>
          <DialogFooterRow onClose={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Add to Team ─────────────────────────────────────────────────────────── */
export function AddToTeamDialog({
  members,
  teams,
}: {
  members: { userId: string; name: string; role: string }[];
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(addToTeamDialogAction, null as DialogState);

  useEffect(() => {
    if (state?.success) {
      startTransition(() => setOpen(false));
      router.refresh();
      toast.success("Member assigned.");
    }
  }, [state?.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="secondary-button rounded-lg text-sm">
          <UserPlus className="size-4" /> Assign to team
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserPlus className="size-3.5" />
            </span>
            Assign to team
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          {state?.error && <ErrorBanner message={state.error} />}
          <label className="grid gap-1 text-sm font-medium">
            Member
            <select name="userId" required className="form-control font-normal">
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.name} · {m.role}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Team
            <select name="teamId" required className="form-control font-normal">
              <option value="">Select team…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <DialogFooterRow onClose={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Assign Travelers ────────────────────────────────────────────────────── */
export function AssignTravelersDialog({
  tripId,
  travelers,
  assignedIds,
}: {
  tripId: string;
  travelers: { userId: string; name: string }[];
  assignedIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(assignTravelersDialogAction, null as DialogState);

  useEffect(() => {
    if (state?.success) {
      startTransition(() => setOpen(false));
      router.refresh();
      toast.success("Travelers updated.");
    }
  }, [state?.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="secondary-button rounded-md text-sm">
          <UserPlus className="size-4" /> Edit travelers
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="size-3.5" />
            </span>
            Assign travelers
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          {state?.error && <ErrorBanner message={state.error} />}
          <input type="hidden" name="tripId" value={tripId} />
          {travelers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No travelers to assign. Invite members first.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {travelers.map((t) => (
                <label key={t.userId} className="traveler-check">
                  <input
                    type="checkbox"
                    name="travelerUserIds"
                    value={t.userId}
                    defaultChecked={assignedIds.includes(t.userId)}
                  />
                  <span className="traveler-avatar">{t.name[0]?.toUpperCase()}</span>
                  <span className="min-w-0 truncate text-sm">{t.name}</span>
                </label>
              ))}
            </div>
          )}
          {travelers.length > 0 && <DialogFooterRow onClose={() => setOpen(false)} />}
          {travelers.length === 0 && (
            <div className="flex justify-end">
              <button type="button" className="secondary-button rounded-lg text-sm" onClick={() => setOpen(false)}>Close</button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Request Approval ────────────────────────────────────────────────────── */
export function RequestApprovalDialog({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(requestApprovalDialogAction, null as DialogState);

  useEffect(() => {
    if (state?.success) {
      startTransition(() => setOpen(false));
      router.refresh();
      toast.success("Approval requested.");
    }
  }, [state?.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="primary-button rounded-md text-sm">
          <Send className="size-4" /> Request approval
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
              <Send className="size-3.5" />
            </span>
            Request travel approval
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          {state?.error && <ErrorBanner message={state.error} />}
          <input type="hidden" name="tripId" value={tripId} />
          <label className="grid gap-1 text-sm font-medium">
            Purpose of travel
            <input name="purpose" placeholder="Client meeting, conference, etc." className="form-control font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Notes for approver
            <textarea name="notes" placeholder="Any relevant details…" className="form-control min-h-16 font-normal" />
          </label>
          <DialogFooterRow onClose={() => setOpen(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Review Approval (with confirmation dialogs) ─────────────────────────── */
export function ReviewApprovalButtons({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [approveState, approveAction] = useActionState(reviewApprovalDialogAction, null as DialogState);
  const [rejectState, rejectAction] = useActionState(reviewApprovalDialogAction, null as DialogState);
  const [confirmOpen, setConfirmOpen] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (approveState?.success || rejectState?.success) {
      startTransition(() => setConfirmOpen(null));
      router.refresh();
    }
  }, [approveState?.success, rejectState?.success, router]);

  const error = approveState?.error ?? rejectState?.error;

  return (
    <div className="flex flex-wrap gap-2">
      {error && <span className="w-full text-xs text-rose-600">{error}</span>}

      <button
        type="button"
        onClick={() => setConfirmOpen("approve")}
        className="secondary-button min-h-7 rounded-md px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-400"
      >
        <Check className="size-3.5" /> Approve
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen("reject")}
        className="secondary-button min-h-7 rounded-md px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
      >
        <X className="size-3.5" /> Reject
      </button>

      <ConfirmDialog
        open={confirmOpen === "approve"}
        onClose={() => setConfirmOpen(null)}
        title="Approve this request?"
        description="The traveler will be notified that their trip request is approved."
        confirmLabel="Approve"
        confirmClassName="primary-button rounded-lg text-sm"
      >
        <form action={approveAction}>
          <input type="hidden" name="id" value={approvalId} />
          <input type="hidden" name="status" value="approved" />
          <SubmitButton pendingText="Approving…" className="primary-button rounded-lg text-sm">
            Approve
          </SubmitButton>
        </form>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmOpen === "reject"}
        onClose={() => setConfirmOpen(null)}
        title="Reject this request?"
        description="The traveler will be notified that their trip request has been rejected."
        confirmLabel="Reject"
        confirmClassName="secondary-button rounded-lg text-sm text-rose-600 dark:text-rose-400"
      >
        <form action={rejectAction}>
          <input type="hidden" name="id" value={approvalId} />
          <input type="hidden" name="status" value="rejected" />
          <SubmitButton pendingText="Rejecting…" className="secondary-button rounded-lg text-sm text-rose-600 dark:text-rose-400">
            Reject
          </SubmitButton>
        </form>
      </ConfirmDialog>
    </div>
  );
}

/* ── Bulk Approve/Reject (with confirmation dialogs) ─────────────────────── */
export function BulkApproveButtons({ approvalIds }: { approvalIds: string[] }) {
  const router = useRouter();
  const [approveState, approveAction] = useActionState(bulkApproveApprovalsAction, null as DialogState);
  const [rejectState, rejectAction] = useActionState(bulkApproveApprovalsAction, null as DialogState);
  const [confirmOpen, setConfirmOpen] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (approveState?.success || rejectState?.success) {
      startTransition(() => setConfirmOpen(null));
      router.refresh();
    }
  }, [approveState?.success, rejectState?.success, router]);

  const error = approveState?.error ?? rejectState?.error;
  const n = approvalIds.length;

  if (n === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <span className="w-full text-xs text-rose-600">{error}</span>}
      <span className="text-xs text-muted-foreground">{n} selected</span>

      <button
        type="button"
        onClick={() => setConfirmOpen("approve")}
        className="secondary-button min-h-7 rounded-md px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-400"
      >
        <Check className="size-3.5" /> Approve all
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen("reject")}
        className="secondary-button min-h-7 rounded-md px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
      >
        <X className="size-3.5" /> Reject all
      </button>

      <ConfirmDialog
        open={confirmOpen === "approve"}
        onClose={() => setConfirmOpen(null)}
        title={`Approve ${n} request${n !== 1 ? "s" : ""}?`}
        description="All selected travelers will be notified that their trip requests are approved."
        confirmLabel="Approve all"
        confirmClassName="primary-button rounded-lg text-sm"
      >
        <form action={approveAction}>
          {approvalIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <input type="hidden" name="status" value="approved" />
          <SubmitButton pendingText="Approving…" className="primary-button rounded-lg text-sm">
            Approve all
          </SubmitButton>
        </form>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmOpen === "reject"}
        onClose={() => setConfirmOpen(null)}
        title={`Reject ${n} request${n !== 1 ? "s" : ""}?`}
        description="All selected travelers will be notified that their trip requests have been rejected."
        confirmLabel="Reject all"
        confirmClassName="secondary-button rounded-lg text-sm text-rose-600 dark:text-rose-400"
      >
        <form action={rejectAction}>
          {approvalIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <input type="hidden" name="status" value="rejected" />
          <SubmitButton pendingText="Rejecting…" className="secondary-button rounded-lg text-sm text-rose-600 dark:text-rose-400">
            Reject all
          </SubmitButton>
        </form>
      </ConfirmDialog>
    </div>
  );
}

/* ── Submit Expense (with confirmation) ──────────────────────────────────── */
export function SubmitExpenseButton({ expenseId, tripId }: { expenseId: string; tripId?: string }) {
  const router = useRouter();
  const [state, action] = useActionState(submitExpenseAction, null as DialogState);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      startTransition(() => setConfirmOpen(false));
      router.refresh();
      toast.success("Expense submitted for review.");
    }
    if (state?.error) toast.error(state.error);
  }, [state?.success, state?.error, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="secondary-button min-h-7 rounded-md px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400"
      >
        <Send className="size-3.5" /> Submit
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit this expense?"
        description="This expense will be sent to your admin for review. You won't be able to edit it after submission."
        confirmLabel="Submit"
        confirmClassName="primary-button rounded-lg text-sm"
      >
        <form action={action}>
          <input type="hidden" name="id" value={expenseId} />
          {tripId && <input type="hidden" name="tripId" value={tripId} />}
          <SubmitButton pendingText="Submitting…" className="primary-button rounded-lg text-sm">
            Submit
          </SubmitButton>
        </form>
      </ConfirmDialog>
    </>
  );
}

/* ── Review Expense (with confirmation dialogs) ───────────────────────────── */
export function ReviewExpenseButtons({ expenseId, tripId }: { expenseId: string; tripId?: string }) {
  const router = useRouter();
  const [approveState, approveAction] = useActionState(reviewExpenseDialogAction, null as DialogState);
  const [rejectState, rejectAction] = useActionState(reviewExpenseDialogAction, null as DialogState);
  const [reimburseState, reimburseAction] = useActionState(reviewExpenseDialogAction, null as DialogState);
  const [confirmOpen, setConfirmOpen] = useState<"approve" | "reject" | "reimburse" | null>(null);

  useEffect(() => {
    if (approveState?.success || rejectState?.success || reimburseState?.success) {
      startTransition(() => setConfirmOpen(null));
      router.refresh();
    }
  }, [approveState?.success, rejectState?.success, reimburseState?.success, router]);

  const error = approveState?.error ?? rejectState?.error ?? reimburseState?.error;

  return (
    <div className="flex flex-wrap gap-1.5">
      {error && <span className="w-full text-xs text-rose-600">{error}</span>}

      <button
        type="button"
        onClick={() => setConfirmOpen("approve")}
        className="secondary-button min-h-7 rounded-md px-2 py-0.5 text-xs text-teal-700 dark:text-teal-400"
      >
        <Check className="size-3.5" /> Approve
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen("reject")}
        className="secondary-button min-h-7 rounded-md px-2 py-0.5 text-xs text-rose-600 dark:text-rose-400"
      >
        <X className="size-3.5" /> Reject
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen("reimburse")}
        className="secondary-button min-h-7 rounded-md px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
      >
        <Check className="size-3.5" /> Reimburse
      </button>

      <ConfirmDialog
        open={confirmOpen === "approve"}
        onClose={() => setConfirmOpen(null)}
        title="Approve this expense?"
        description="The traveler will be notified that this expense has been approved."
        confirmLabel="Approve"
        confirmClassName="primary-button rounded-lg text-sm"
      >
        <form action={approveAction}>
          <input type="hidden" name="id" value={expenseId} />
          {tripId && <input type="hidden" name="tripId" value={tripId} />}
          <input type="hidden" name="status" value="approved" />
          <SubmitButton pendingText="Approving…" className="primary-button rounded-lg text-sm">
            Approve
          </SubmitButton>
        </form>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmOpen === "reject"}
        onClose={() => setConfirmOpen(null)}
        title="Reject this expense?"
        description="The traveler will be notified that this expense has been rejected."
        confirmLabel="Reject"
        confirmClassName="secondary-button rounded-lg text-sm text-rose-600 dark:text-rose-400"
      >
        <form action={rejectAction}>
          <input type="hidden" name="id" value={expenseId} />
          {tripId && <input type="hidden" name="tripId" value={tripId} />}
          <input type="hidden" name="status" value="rejected" />
          <SubmitButton pendingText="Rejecting…" className="secondary-button rounded-lg text-sm text-rose-600 dark:text-rose-400">
            Reject
          </SubmitButton>
        </form>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmOpen === "reimburse"}
        onClose={() => setConfirmOpen(null)}
        title="Mark as reimbursed?"
        description="This will mark the expense as reimbursed. This action confirms the traveler has been paid."
        confirmLabel="Reimburse"
        confirmClassName="primary-button rounded-lg text-sm"
      >
        <form action={reimburseAction}>
          <input type="hidden" name="id" value={expenseId} />
          {tripId && <input type="hidden" name="tripId" value={tripId} />}
          <input type="hidden" name="status" value="reimbursed" />
          <SubmitButton pendingText="Saving…" className="primary-button rounded-lg text-sm">
            Reimburse
          </SubmitButton>
        </form>
      </ConfirmDialog>
    </div>
  );
}
