import { Header } from "@/app/components/header";

/** Shared horizontal layout for header + main (88rem ≈ 1408px on wide screens). */
export const contentContainerClass =
  "mx-auto w-full max-w-[min(100%,88rem)] px-2 sm:px-3";

export type PageWidth = "content" | "full" | "narrow";

const widthClass: Record<PageWidth, string> = {
  content: contentContainerClass,
  full: "mx-auto w-full max-w-none px-2 sm:px-3",
  narrow: "mx-auto w-full max-w-lg px-2 sm:px-3",
};

export function PageShell({
  children,
  className = "",
  width = "content",
}: {
  children: React.ReactNode;
  className?: string;
  width?: PageWidth;
}) {
  return (
    <>
      <Header />
      <main className={`${widthClass[width]} flex-1 py-4 sm:py-8 ${className}`}>
        {children}
      </main>
    </>
  );
}
