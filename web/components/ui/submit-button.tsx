"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingText = "Saving...",
  className,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled">) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={cn(className ?? "primary-button", "disabled:translate-y-0")} disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <Spinner className="size-4" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
