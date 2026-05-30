import { NotFoundScene } from "@/app/components/errors/not-found-scene";
import { PageShell } from "@/app/components/layout/page-shell";
import { Button } from "@/app/components/ui/button";
import { Link } from "@/i18n/navigation";

type NotFoundPageProps = {
  title: string;
  subtitle: string;
  hint: string;
  equation: string;
  homeLabel: string;
  docsLabel: string;
};

export function NotFoundPage({
  title,
  subtitle,
  hint,
  equation,
  homeLabel,
  docsLabel,
}: NotFoundPageProps) {
  return (
    <PageShell width="content">
      <div className="mx-auto flex max-w-2xl flex-col items-center py-6 text-center sm:py-12">
        <NotFoundScene />

        <p className="mt-8 font-mono text-xs uppercase tracking-[0.35em] text-accent">
          error 404
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{hint}</p>

        <div className="mt-6 rounded-2xl border border-border/80 bg-card/80 px-4 py-3 font-mono text-sm shadow-card backdrop-blur-sm">
          <span className="text-muted-foreground">{equation}</span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button>{homeLabel}</Button>
          </Link>
          <Link href="/docs">
            <Button variant="outline">{docsLabel}</Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
