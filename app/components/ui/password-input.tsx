"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

type PasswordInputProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "type"
> & {
  inputClassName?: string;
};

export function PasswordInput({
  className,
  inputClassName,
  id: idProp,
  ...props
}: PasswordInputProps) {
  const tc = useTranslations("common");
  const generatedId = useId();
  const toggleId = useId();
  const inputId = idProp ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);

  function handleToggle(checked: boolean) {
    // Samsung Internet often ignores type changes while the field is focused.
    inputRef.current?.blur();
    setVisible(checked);
  }

  const showLabel = tc("showPassword");
  const hideLabel = tc("hidePassword");

  return (
    <div className={className ?? "relative isolate"}>
      <input
        {...props}
        ref={inputRef}
        id={inputId}
        key={visible ? `${inputId}-text` : `${inputId}-password`}
        type={visible ? "text" : "password"}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={
          inputClassName ??
          "block h-11 w-full rounded-xl border border-border bg-input py-0 pl-3.5 pr-12 text-base sm:text-sm"
        }
      />

      {/* Invisible checkbox over the icon — native tap target for Samsung Internet. */}
      <input
        id={toggleId}
        type="checkbox"
        checked={visible}
        onChange={(event) => handleToggle(event.target.checked)}
        aria-label={visible ? hideLabel : showLabel}
        className="absolute top-1/2 right-0 z-30 size-11 min-h-[44px] min-w-[44px] -translate-y-1/2 cursor-pointer opacity-[0.001]"
      />
      <span
        className="pointer-events-none absolute top-1/2 right-0 z-20 flex size-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-r-xl text-muted-foreground"
        aria-hidden
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </span>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
