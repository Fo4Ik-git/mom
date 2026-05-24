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
        className={`mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10 ${className}`}
      >
        {children}
      </main>
    </>
  );
}
