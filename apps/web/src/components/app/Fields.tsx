import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const FieldLabel = ({
  children,
  required,
  hint,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
}) => (
  <div className={cn("mb-2 flex items-baseline justify-between gap-3", className)}>
    <label className="text-label font-bold text-foreground">
      {children}
      {required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
    </label>
    {hint ? <span className="text-caption text-muted-foreground">{hint}</span> : null}
  </div>
);

const fieldShell =
  "w-full rounded-2xl border border-input bg-card px-3.5 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:opacity-50";

export const PhoneInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldShell, "h-12", className)} {...props} />
  ),
);
PhoneInput.displayName = "PhoneInput";

export const PhoneTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldShell, "min-h-[92px] resize-none py-3 leading-[21px]", className)} {...props} />
));
PhoneTextarea.displayName = "PhoneTextarea";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * In-frame select. Renders its option list inside the phone (never a document
 * portal) so it cannot escape the device frame.
 */
export const PhoneSelect = ({
  value,
  options,
  onChange,
  placeholder = "Select",
  className,
  tone = "brand",
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  tone?: "brand" | "admin";
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          fieldShell,
          "flex h-12 items-center justify-between text-left",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="truncate font-medium">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn("size-[18px] shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-60 w-full animate-scale-in overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-sheet"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted",
                  isSelected && (tone === "admin" ? "bg-admin-surface" : "bg-primary/8"),
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold text-foreground">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {isSelected ? (
                  <Check
                    className={cn("size-[18px] shrink-0", tone === "admin" ? "text-admin" : "text-primary")}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export const CheckRow = ({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <label className={cn("flex cursor-pointer items-start gap-3", className)}>
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
      className="mt-[1px] size-[22px] rounded-[7px]"
    />
    <span className="text-label leading-[19px] text-muted-foreground">{children}</span>
  </label>
);

export const SwitchRow = ({
  label,
  description,
  checked,
  onChange,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) => (
  <div className={cn("flex items-center justify-between gap-4 px-4 py-3.5", className)}>
    <span className="min-w-0">
      <span className="block text-body font-semibold text-foreground">{label}</span>
      {description ? (
        <span className="mt-0.5 block text-caption text-muted-foreground">{description}</span>
      ) : null}
    </span>
    <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
  </div>
);

/** Selectable row with a radio affordance — used by rejection and removal reasons. */
export const ChoiceRow = ({
  label,
  description,
  selected,
  onSelect,
  className,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={cn(
      "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ease-smooth active:scale-[0.99]",
      selected ? "border-primary bg-primary/8" : "border-border bg-card hover:bg-muted/60",
      className,
    )}
  >
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        selected ? "border-primary" : "border-border",
      )}
      aria-hidden="true"
    >
      {selected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
    </span>
    <span className="min-w-0">
      <span className="block text-body font-semibold text-foreground">{label}</span>
      {description ? (
        <span className="mt-0.5 block text-caption text-muted-foreground">{description}</span>
      ) : null}
    </span>
  </button>
);
