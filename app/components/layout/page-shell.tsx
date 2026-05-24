import { Header } from "@/app/components/header";

export function PageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <Header />
      <main
        className={`mx-auto w-full max-w-5xl flex-1 px-2 py-6 sm:px-3 sm:py-8 ${className}`}
      >
        {children}
      </main>
    </>
  );
}
