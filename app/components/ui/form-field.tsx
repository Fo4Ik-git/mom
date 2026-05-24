/** Label + control without wrapping interactive children (fixes mobile taps). */
export function FormField({
  label,
  htmlFor,
  children,
  className = "",
}: {
  label: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`block space-y-1.5 ${className}`.trim()}>
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
