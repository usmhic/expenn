"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function dateToIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function DateButton({
  name,
  required,
  defaultValue,
  placeholder = "Pick date",
  min,
  max,
  className = "",
}: {
  name: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const selected = isoToDate(value);
  const minDate = min ? isoToDate(min) : undefined;
  const maxDate = max ? isoToDate(max) : undefined;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function handleSelect(day: Date | undefined) {
    if (!day) return;
    setValue(dateToIso(day));
    setOpen(false);
  }

  const displayText = selected ? format(selected, "MMM d, yyyy") : null;

  const disabled = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <span ref={wrapRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        className="secondary-button w-full gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
        {displayText ? (
          <span className="font-semibold">{displayText}</span>
        ) : (
          <span className="text-muted-foreground font-normal">{placeholder}</span>
        )}
      </button>
      <input type="hidden" name={name} value={value} required={required} />
      {open && (
        <div className="date-picker-popover">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? new Date()}
            disabled={disabled.length ? disabled : undefined}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <ChevronLeft className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                ),
            }}
            classNames={{
              root: "rdp",
              months: "rdp-months",
              month: "rdp-month",
              month_caption: "rdp-caption",
              caption_label: "rdp-caption-label",
              nav: "rdp-nav",
              button_previous: "rdp-nav-btn",
              button_next: "rdp-nav-btn",
              month_grid: "rdp-table",
              weekdays: "rdp-head-row",
              weekday: "rdp-head-cell",
              week: "rdp-row",
              day: "rdp-cell",
              day_button: "rdp-day",
              selected: "rdp-selected",
              today: "rdp-today",
              outside: "rdp-outside",
              disabled: "rdp-disabled",
            }}
          />
        </div>
      )}
    </span>
  );
}
