"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { DynamicCalculator } from "@/app/components/calculator/dynamic-calculator";
import { FormulaBuilder } from "@/app/components/builder/formula-builder";
import { ConstantsCard } from "@/app/components/builder/constants-card";
import { InputFieldCard } from "@/app/components/builder/input-field-card";
import { Button } from "@/app/components/ui/button";
import { Card, CardTitle } from "@/app/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { appFetch } from "@/lib/api-client";
import type {
  BlockExpression,
  CalculatorConfig,
  CalculatorConstant,
  InputField,
  OutputField,
} from "@/types/calculator";
import { emptyBlockExpression, slugifyId } from "@/types/calculator";

interface CalculatorBuilderProps {
  calculatorId?: string;
  initialName?: string;
  initialDescription?: string;
  initialConfig: CalculatorConfig;
  initialIsPublic?: boolean;
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyInput(): InputField {
  return {
    id: randomId("field"),
    label: "",
    properties: [
      { id: "cost", label: "", value: 0 },
      { id: "price", label: "", value: 0 },
    ],
    defaultQuantity: 0,
  };
}

function emptyOutput(): OutputField {
  return {
    id: randomId("output"),
    label: "",
    expression: emptyBlockExpression(),
  };
}

function emptyConstant(): CalculatorConstant {
  return {
    id: randomId("const"),
    label: "",
    value: 0,
  };
}

export function CalculatorBuilder({
  calculatorId,
  initialName,
  initialDescription = "",
  initialConfig,
  initialIsPublic = false,
}: CalculatorBuilderProps) {
  const t = useTranslations("builder");
  const tc = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(initialName ?? t("newTitle"));
  const [description, setDescription] = useState(initialDescription);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [config, setConfig] = useState<CalculatorConfig>({
    ...initialConfig,
    constants: initialConfig.constants ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const [errorIssues, setErrorIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setErrorIssues([]);

    const payload = { name, description, config, isPublic };
    const response = await appFetch(
      calculatorId ? `/api/calculators/${calculatorId}` : "/api/calculators",
      {
        method: calculatorId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? t("saveError"));
      setErrorIssues(Array.isArray(data.issues) ? data.issues : []);
      return;
    }

    router.push(`/builder/${data.calculator.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(280px,380px)] 2xl:grid-cols-[minmax(0,3.5fr)_minmax(300px,400px)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardTitle className="mb-4">{t("settings")}</CardTitle>
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-sm text-muted-foreground">{t("title")}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-muted-foreground">
                  {t("description")}
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="size-4 accent-accent"
                />
                {t("publicToggle")}
              </label>
            </div>
          </Card>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{t("inputFields")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("inputFieldsDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    inputs: [...c.inputs, emptyInput()],
                  }))
                }
                className="shrink-0 rounded-xl bg-accent-muted px-3 py-2 text-sm font-medium text-accent"
              >
                {t("addInput")}
              </button>
            </div>

            <div className="space-y-3">
              {config.inputs.map((field, index) => (
                <InputFieldCard
                  key={field.id}
                  field={field}
                  canRemove={config.inputs.length > 1}
                  onChange={(updated) =>
                    setConfig((c) => ({
                      ...c,
                      inputs: c.inputs.map((f, i) =>
                        i === index ? updated : f,
                      ),
                    }))
                  }
                  onRemove={() =>
                    setConfig((c) => ({
                      ...c,
                      inputs: c.inputs.filter((_, i) => i !== index),
                    }))
                  }
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{t("constants")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("constantsDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    constants: [...(c.constants ?? []), emptyConstant()],
                  }))
                }
                className="shrink-0 rounded-xl bg-accent-muted px-3 py-2 text-sm font-medium text-accent"
              >
                {t("addConstant")}
              </button>
            </div>

            {(config.constants ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                {t("constantsEmpty")}
              </p>
            ) : (
              <div className="space-y-2">
                {(config.constants ?? []).map((constant, index) => (
                  <ConstantsCard
                    key={constant.id}
                    constant={constant}
                    canRemove
                    onChange={(updated) =>
                      setConfig((c) => ({
                        ...c,
                        constants: (c.constants ?? []).map((item, i) =>
                          i === index ? updated : item,
                        ),
                      }))
                    }
                    onRemove={() =>
                      setConfig((c) => ({
                        ...c,
                        constants: (c.constants ?? []).filter(
                          (_, i) => i !== index,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{t("outputFields")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("outputFieldsDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    outputs: [...c.outputs, emptyOutput()],
                  }))
                }
                className="shrink-0 rounded-xl bg-accent-muted px-3 py-2 text-sm font-medium text-accent"
              >
                {t("addOutput")}
              </button>
            </div>

            <div className="space-y-4">
              {config.outputs.map((output, index) => (
                <div
                  key={output.id}
                  className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="block flex-1 space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("outputFieldName")}
                      </span>
                      <input
                        value={output.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          setConfig((c) => ({
                            ...c,
                            outputs: c.outputs.map((o, i) =>
                              i === index ? { ...o, label } : o,
                            ),
                          }));
                        }}
                        onBlur={(e) => {
                          const label = e.target.value.trim();
                          if (!label) {
                            return;
                          }
                          setConfig((c) => ({
                            ...c,
                            outputs: c.outputs.map((o, i) =>
                              i === index
                                ? { ...o, label, id: slugifyId(label, "output") }
                                : o,
                            ),
                          }));
                        }}
                        placeholder={t("outputFieldNamePlaceholder")}
                        className="h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm font-medium"
                      />
                    </label>
                    {config.outputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            outputs: c.outputs.filter((_, i) => i !== index),
                          }))
                        }
                        className="mt-6 text-xs text-destructive underline"
                      >
                        {tc("delete")}
                      </button>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(output.highlight)}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          outputs: c.outputs.map((o, i) =>
                            i === index
                              ? { ...o, highlight: e.target.checked }
                              : o,
                          ),
                        }))
                      }
                      className="size-3.5 accent-accent"
                    />
                    {t("highlight")}
                  </label>

                  <FormulaBuilder
                    config={config}
                    outputIndex={index}
                    outputKey={output.id}
                    expression={output.expression}
                    onChange={(expression) =>
                      setConfig((c) => ({
                        ...c,
                        outputs: c.outputs.map((o, i) =>
                          i === index ? { ...o, expression } : o,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">{error}</p>
              {errorIssues.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {errorIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? tc("saving") : tc("save")}
          </Button>
        </div>

        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <h2 className="mb-4 text-lg font-semibold">{t("preview")}</h2>
          <DynamicCalculator config={config} />
        </div>
      </div>
    </div>
  );
}
