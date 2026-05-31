"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { usePersistedResize } from "@/lib/hooks/use-persisted-resize";

export type AdminManageSection = {
  id: string;
  label: string;
  content: ReactNode;
};

const WIDTH_STORAGE_KEY = "admin-manage-modal-width";
const HEIGHT_STORAGE_KEY = "admin-manage-modal-height";
const DEFAULT_WIDTH = 896;
const DEFAULT_HEIGHT = 520;
const MIN_WIDTH = 560;
const MIN_HEIGHT = 280;
const MAX_WIDTH = 1400;
const MAX_HEIGHT = 900;

function clampWidth(value: number) {
  const max = Math.min(MAX_WIDTH, window.innerWidth - 24);
  return Math.min(max, Math.max(MIN_WIDTH, value));
}

function clampHeight(value: number) {
  const max = Math.min(MAX_HEIGHT, window.innerHeight - 48);
  return Math.min(max, Math.max(MIN_HEIGHT, value));
}

const resizeHandleClass =
  "touch-none before:absolute before:bg-border hover:before:bg-accent/60 active:before:bg-accent";

export function AdminManageModal({
  open,
  onClose,
  title,
  subtitle,
  sections,
  defaultSectionId,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  sections: AdminManageSection[];
  defaultSectionId?: string;
  footer?: ReactNode;
}) {
  const t = useTranslations("admin");
  const titleId = useId();
  const firstId = sections[0]?.id ?? "";
  const [activeId, setActiveId] = useState(defaultSectionId ?? firstId);

  const { size: modalWidth, handleResizePointerDown: handleWidthResize } =
    usePersistedResize(
      WIDTH_STORAGE_KEY,
      DEFAULT_WIDTH,
      clampWidth,
      "right",
    );
  const { size: modalHeight, handleResizePointerDown: handleHeightResize } =
    usePersistedResize(
      HEIGHT_STORAGE_KEY,
      DEFAULT_HEIGHT,
      clampHeight,
      "bottom",
    );

  const handleCornerResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      handleWidthResize(event);
      handleHeightResize(event);
    },
    [handleWidthResize, handleHeightResize],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveId(defaultSectionId ?? sections[0]?.id ?? "");
  }, [open, defaultSectionId, sections]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || sections.length === 0) {
    return null;
  }

  const active =
    sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <>
      <button
        type="button"
        aria-label={t("manageModalClose")}
        className="fixed inset-0 z-40 bg-black/50 touch-manipulation"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal
          aria-labelledby={titleId}
          style={{ width: modalWidth, height: modalHeight }}
          className="relative pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card-lg"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("manageModalResizeWidth")}
            onPointerDown={handleWidthResize}
            className={`absolute inset-y-0 right-0 z-20 w-2 translate-x-1/2 cursor-ew-resize ${resizeHandleClass} before:inset-y-0 before:right-1/2 before:w-px before:translate-x-1/2`}
          />
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={t("manageModalResizeHeight")}
            onPointerDown={handleHeightResize}
            className={`absolute inset-x-0 bottom-0 z-20 h-2 translate-y-1/2 cursor-ns-resize ${resizeHandleClass} before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2`}
          />
          <div
            role="separator"
            aria-label={t("manageModalResizeCorner")}
            onPointerDown={handleCornerResize}
            className={`absolute bottom-0 right-0 z-30 size-4 cursor-nwse-resize ${resizeHandleClass} before:inset-1 before:rounded-sm`}
          />

          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate text-base font-semibold text-foreground sm:text-lg"
              >
                {title}
              </h2>
              {subtitle && (
                <div className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  {subtitle}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("manageModalClose")}
            >
              ×
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <nav
              className="shrink-0 border-b border-border sm:w-44 sm:border-b-0 sm:border-r lg:w-52"
              aria-label={t("manageModalSections")}
            >
              <ul className="flex gap-0.5 overflow-x-auto p-2 sm:flex-col sm:overflow-x-visible sm:p-2">
                {sections.map((section) => {
                  const isActive = section.id === active.id;
                  return (
                    <li key={section.id} className="shrink-0 sm:shrink">
                      <button
                        type="button"
                        onClick={() => setActiveId(section.id)}
                        className={`w-full whitespace-nowrap rounded-xl px-3 py-2 text-left text-xs font-medium transition sm:text-sm ${
                          isActive
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {section.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {active.content}
            </div>
          </div>

          {footer && (
            <footer className="shrink-0 border-t border-border px-4 py-3">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </>
  );
}
