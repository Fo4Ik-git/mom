"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { appFetch } from "@/lib/api/api-client";

export type UserOption = {
  id: string;
  email: string;
  name: string | null;
};

function formatLabel(user: UserOption) {
  return user.name ? `${user.name} · ${user.email}` : user.email;
}

export function AdminUserSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (userId: string, user: UserOption | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadById = useCallback(async (userId: string) => {
    if (!userId) {
      setQuery("");
      return;
    }
    const res = await appFetch(
      `/api/admin/users?${new URLSearchParams({ userId })}`,
    );
    const data = await res.json();
    const user = (data.users ?? [])[0] as UserOption | undefined;
    if (user) {
      setQuery(formatLabel(user));
    }
  }, []);

  useEffect(() => {
    void loadById(value);
  }, [value, loadById]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        pageSize: "15",
        q: query.trim(),
      });
      const res = await appFetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setOptions(
        (data.users ?? []).map(
          (u: UserOption) => u,
        ),
      );
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pick(user: UserOption) {
    setQuery(formatLabel(user));
    setOpen(false);
    onChange(user.id, user);
  }

  function clear() {
    setQuery("");
    onChange("", null);
  }

  const inputClass =
    "block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm";

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        value={query}
        placeholder={t("accessKeyReferrerPlaceholder")}
        className={inputClass}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) {
            onChange("", null);
          }
        }}
      />
      {value && !disabled && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          onClick={clear}
          aria-label={t("accessKeyReferrerClear")}
        >
          ×
        </button>
      )}
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-card py-1 text-sm shadow-lg"
        >
          {loading && (
            <li className="px-3 py-2 text-muted-foreground">{tc("loading")}</li>
          )}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-muted-foreground">
              {t("accessKeyReferrerEmpty")}
            </li>
          )}
          {options.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={user.id === value}
                className="w-full px-3 py-2 text-left hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(user)}
              >
                {formatLabel(user)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
