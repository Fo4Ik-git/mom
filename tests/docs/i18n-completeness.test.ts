import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import uk from "@/messages/uk.json";
import { collectFormulaDocs } from "@/lib/formula/docs/collect-formula-docs";

const GUIDE_SECTION_IDS = [
  "overview",
  "configParts",
  "oneFormula",
  "blocksHowTo",
  "codeHowTo",
  "unifiedSync",
  "fullScript",
  "evaluation",
  "tips",
] as const;

type DocsMessages = {
  primitives: Record<string, { title: string; description: string }>;
  operands: Record<string, { title: string; description: string }>;
  script: Record<string, { title: string; description: string }>;
  guide: {
    sections: Record<
      (typeof GUIDE_SECTION_IDS)[number],
      { title: string; body: string }
    >;
  };
};

function getDocsLocale(messages: { docs: DocsMessages }) {
  return messages.docs;
}

describe("docs i18n completeness", () => {
  const data = collectFormulaDocs();
  const locales = [
    { code: "en", messages: en },
    { code: "uk", messages: uk },
  ] as const;

  for (const { code, messages } of locales) {
    describe(`${code}.json`, () => {
      const docs = getDocsLocale(messages);

      it.each(data.primitives.map((entry) => entry.id))(
        "has primitive docs for %s",
        (id) => {
          const entry = docs.primitives[id];
          expect(entry?.title?.trim().length).toBeGreaterThan(0);
          expect(entry?.description?.trim().length).toBeGreaterThan(0);
        },
      );

      it.each(data.operands.map((entry) => entry.id))(
        "has operand docs for %s",
        (id) => {
          const entry = docs.operands[id];
          expect(entry?.title?.trim().length).toBeGreaterThan(0);
          expect(entry?.description?.trim().length).toBeGreaterThan(0);
        },
      );

      it.each(data.script.map((entry) => entry.id))(
        "has script docs for %s",
        (id) => {
          const entry = docs.script[id];
          expect(entry?.title?.trim().length).toBeGreaterThan(0);
          expect(entry?.description?.trim().length).toBeGreaterThan(0);
        },
      );

      it.each(GUIDE_SECTION_IDS)(
        "has guide section %s with ICU-safe body",
        (id) => {
          const section = docs.guide.sections[id];
          expect(section?.title?.trim().length).toBeGreaterThan(0);
          expect(section?.body?.trim().length).toBeGreaterThan(0);
          expect(section.body).not.toMatch(/docs\.guide\.sections/);
        },
      );
    });
  }
});
