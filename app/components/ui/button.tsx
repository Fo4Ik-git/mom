import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-card hover:brightness-110",
  secondary:
    "bg-secondary text-secondary-foreground shadow-card hover:brightness-110",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  outline:
    "border border-border bg-card/60 text-foreground hover:border-accent/40 hover:bg-card",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
