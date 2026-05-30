"use client";

import { InputFieldCard } from "@/app/components/builder/input-field-card";
import { BuilderSection } from "@/app/components/builder/builder-collapsible";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  duplicateInputField,
  moveInputFieldToSection,
  removeInputField,
  reorderInputFields,
  setInputFieldSection,
  updateInputField,
} from "@/lib/calculator/config/sync";
import {
  INPUT_SECTION_IDS,
  fieldMatchesSearch,
  groupInputsBySection,
  normalizeInputSection,
  type InputSectionId,
} from "@/lib/calculator/config/input-sections";
import { useFormulaDndSensors } from "@/lib/hooks/use-formula-dnd-sensors";
import type { CalculatorConfig, InputField } from "@/types/calculator";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

interface InputFieldsEditorProps {
  config: CalculatorConfig;
  autoTotalSuffix: string;
  onConfigChange: (config: CalculatorConfig) => void;
}

function sectionDroppableId(section: InputSectionId) {
  return `section:${section}`;
}

function parseSectionDroppableId(id: string): InputSectionId | null {
  if (!id.startsWith("section:")) {
    return null;
  }
  const section = id.slice("section:".length) as InputSectionId;
  return INPUT_SECTION_IDS.includes(section) ? section : null;
}

function SortableInputCard({
  field,
  index,
  canRemove,
  defaultOpen,
  onChange,
  onRemove,
  onDuplicate,
  section,
  onSectionChange,
}: {
  field: InputField;
  index: number;
  canRemove: boolean;
  defaultOpen?: boolean;
  onChange: (field: InputField) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  section: InputSectionId;
  onSectionChange: (section: InputSectionId) => void;
}) {
  const t = useTranslations("builder");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2">
      <button
        type="button"
        className="mt-4 flex h-9 w-8 shrink-0 touch-none items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-accent/50"
        aria-label={t("dragHandleField")}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">
        <InputFieldCard
          field={field}
          canRemove={canRemove}
          defaultOpen={defaultOpen}
          section={section}
          onSectionChange={onSectionChange}
          onChange={onChange}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
        />
      </div>
    </div>
  );
}

function SectionDropZone({
  section,
  children,
}: {
  section: InputSectionId;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: sectionDroppableId(section),
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[2rem] rounded-xl transition ${
        isOver ? "ring-2 ring-accent/40 ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function InputFieldsEditor({
  config,
  autoTotalSuffix,
  onConfigChange,
}: InputFieldsEditorProps) {
  const t = useTranslations("builder");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useFormulaDndSensors();

  const grouped = useMemo(() => groupInputsBySection(config.inputs), [config.inputs]);

  const visibleBySection = useMemo(() => {
    const result = new Map<InputSectionId, { field: InputField; index: number }[]>();
    for (const section of INPUT_SECTION_IDS) {
      result.set(section, []);
    }
    for (const [index, field] of config.inputs.entries()) {
      if (!fieldMatchesSearch(field, search)) {
        continue;
      }
      const section = normalizeInputSection(field.section);
      result.get(section)!.push({ field, index });
    }
    return result;
  }, [config.inputs, search]);

  const activeField = activeId
    ? config.inputs.find((field) => field.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeFieldId = String(active.id);
    const overId = String(over.id);
    const targetSection = parseSectionDroppableId(overId);

    if (targetSection) {
      onConfigChange(
        moveInputFieldToSection(config, activeFieldId, targetSection),
      );
      return;
    }

    const overField = config.inputs.find((field) => field.id === overId);
    if (!overField) {
      return;
    }

    const overSection = normalizeInputSection(overField.section);

    let next = reorderInputFields(config, activeFieldId, overId);
    const activeField = config.inputs.find((field) => field.id === activeFieldId);
    const activeSection = activeField
      ? normalizeInputSection(activeField.section)
      : "other";

    if (activeSection !== overSection) {
      next = moveInputFieldToSection(next, activeFieldId, overSection, overId);
    }

    onConfigChange(next);
  }

  function updateAtIndex(index: number, field: InputField) {
    onConfigChange(updateInputField(config, index, field, autoTotalSuffix));
  }

  function removeAtIndex(index: number) {
    onConfigChange(removeInputField(config, index));
  }

  const hasVisibleFields = [...visibleBySection.values()].some(
    (entries) => entries.length > 0,
  );

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("inputFieldsSearchPlaceholder")}
        className="h-10 w-full rounded-xl border border-border bg-input px-3.5 text-sm"
      />

      {!hasVisibleFields && search.trim() ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {t("inputFieldsSearchEmpty")}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-3">
            {INPUT_SECTION_IDS.map((section) => {
              const entries = visibleBySection.get(section) ?? [];
              if (entries.length === 0 && search.trim()) {
                return null;
              }

              const sectionFields = grouped.get(section) ?? [];
              const fieldIds = sectionFields.map((field) => field.id);

              return (
                <BuilderSection
                  key={section}
                  title={t(`inputSection_${section}`)}
                  count={sectionFields.length}
                  defaultOpen={section !== "other" || sectionFields.length <= 6}
                >
                  <SectionDropZone section={section}>
                    <SortableContext
                      items={fieldIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {entries.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                            {t("inputSectionEmpty")}
                          </p>
                        ) : (
                          entries.map(({ field, index }) => (
                            <SortableInputCard
                              key={field.id}
                              field={field}
                              index={index}
                              canRemove={config.inputs.length > 1}
                              defaultOpen={
                                index === config.inputs.length - 1 &&
                                !field.label.trim()
                              }
                              section={section}
                              onSectionChange={(nextSection) =>
                                onConfigChange(
                                  setInputFieldSection(config, field.id, nextSection),
                                )
                              }
                              onChange={(updated) => updateAtIndex(index, updated)}
                              onRemove={() => removeAtIndex(index)}
                              onDuplicate={() =>
                                onConfigChange(
                                  duplicateInputField(
                                    config,
                                    index,
                                    autoTotalSuffix,
                                    t("duplicateSuffix"),
                                  ),
                                )
                              }
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </SectionDropZone>
                </BuilderSection>
              );
            })}
          </div>

          <DragOverlay>
            {activeField ? (
              <div className="rounded-2xl border border-accent bg-card px-4 py-3 text-sm font-medium shadow-card-lg">
                {activeField.label.trim() || t("unnamedField")}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
