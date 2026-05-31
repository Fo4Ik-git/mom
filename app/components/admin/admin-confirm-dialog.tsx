"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/app/components/ui/button";

export function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "destructive",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("manageModalClose")}
        className="fixed inset-0 z-[60] bg-black/50 touch-manipulation"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="alertdialog"
          aria-modal
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-card-lg"
        >
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={loading}
              onClick={onCancel}
            >
              {cancelLabel ?? tc("cancel")}
            </Button>
            <Button
              type="button"
              variant={variant === "destructive" ? "destructive" : "primary"}
              className="h-10"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? tc("loading") : (confirmLabel ?? t("manageModalConfirm"))}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
