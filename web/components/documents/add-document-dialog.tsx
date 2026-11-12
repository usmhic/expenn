"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { createDocumentAction } from "@/app/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";

export const DOCUMENT_KINDS = [
  { value: "passport", label: "Passport" },
  { value: "visa", label: "Visa" },
  { value: "id_card", label: "ID card" },
  { value: "drivers_license", label: "Driver's licence" },
  { value: "itinerary", label: "Itinerary or ticket" },
  { value: "receipt", label: "Receipt" },
  { value: "invoice", label: "Invoice" },
  { value: "contract", label: "Contract" },
  { value: "other", label: "Other" },
] as const;

export function AddDocumentDialog({ trips }: { trips: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="primary-button"><FileUp className="size-4" /> Add document</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <p className="text-sm text-muted-foreground">Stored in your organisation&apos;s own storage. Only you and your admins can open it.</p>
        </DialogHeader>
        <form action={createDocumentAction} className="grid gap-3 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            Title
            <input name="title" required maxLength={255} placeholder="e.g. Passport, Hotel booking Vienna" className="form-control" />
          </label>
          <label className="field">
            Type
            <select name="kind" defaultValue="other" className="form-control">
              {DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>
          <label className="field">
            Trip <span className="field-hint">Optional</span>
            <select name="tripId" defaultValue="" className="form-control">
              <option value="">Not linked</option>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field">
            Document number <span className="field-hint">Optional</span>
            <input name="documentNumber" maxLength={255} className="form-control" />
          </label>
          <label className="field">
            Expires <span className="field-hint">Optional</span>
            <input name="expiryDate" type="date" className="form-control" />
          </label>
          <label className="field sm:col-span-2">
            File
            <input name="file" type="file" accept="image/*,application/pdf" className="form-control" />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
            <input name="isSensitive" type="checkbox" value="true" className="checkbox" />
            Sensitive — mask the number in lists
          </label>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button>
            <SubmitButton pendingText="Uploading…" className="primary-button">Save document</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
