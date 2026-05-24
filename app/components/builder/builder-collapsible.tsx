"use client";

import { useState, type ReactNode } from "react";

interface BuilderCollapsibleProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function BuilderCollapsible({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  headerActions,
  children,
  className = "",
}: BuilderCollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  function toggle() {
    const next = !open;
    setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${className}`.trim()}
    >
      <div className="flex items-start gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="-m-1 flex min-w-0 flex-1 touch-manipulation items-start gap-2 rounded-lg p-1 text-left hover:bg-muted/40"
        >
          <span
            aria-hidden
            className={`mt-0.5 shrink-0 text-xs text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          >
            ▸
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {title || "…"}
              </span>
              {badge}
            </span>
            {subtitle && (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {subtitle}
              </span>
            )}
          </span>
        </button>
        {headerActions && (
          <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
        )}
      </div>
      {open && (
        <div className="space-y-3 border-t border-border/70 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

interface BuilderSectionProps {
  title: string;
  description?: string;
  count?: number;
  defaultOpen?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

export function BuilderSection({
  title,
  description,
  count,
  defaultOpen = true,
  actions,
  children,
}: BuilderSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="-m-1 flex min-w-0 flex-1 touch-manipulation items-start gap-2 rounded-xl p-1 text-left hover:bg-muted/30"
        >
          <span
            aria-hidden
            className={`mt-1.5 shrink-0 text-sm text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          >
            ▸
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              {count !== undefined && count > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {count}
                </span>
              )}
            </span>
            {description && open && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </span>
        </button>
        {actions && open && <div className="shrink-0">{actions}</div>}
      </div>
      {open && children}
    </section>
  );
}
