"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { FormulaCodeSnippet } from "@/app/components/docs/formula-code-snippet";

const components: Components = {
  h2: ({ children }) => (
    <h3 className="mt-6 mb-3 text-base font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-4 mb-2 text-sm font-semibold text-foreground">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ className, children }) => {
    const text = String(children).replace(/\n$/, "");
    const isBlock = className?.includes("language-") || text.includes("\n");
    if (isBlock) {
      return <FormulaCodeSnippet code={text} />;
    }
    return (
      <code className="rounded-md bg-accent-muted/80 px-1.5 py-0.5 font-mono text-[0.85em] text-accent dark:text-accent-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <div className="my-3">{children}</div>,
  table: ({ children }) => (
    <div className="my-4 overflow-hidden rounded-xl border border-border/80 bg-card/50 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border/80 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border/60">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors hover:bg-muted/30">{children}</tr>,
  th: ({ children }) => <th className="px-4 py-2.5 font-semibold">{children}</th>,
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-muted-foreground">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-accent/50 bg-accent-muted/30 py-2 pl-4 text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border/60" />,
};

export function DocsMarkdown({ children }: { children: string }) {
  return (
    <div className="docs-markdown">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </Markdown>
    </div>
  );
}
