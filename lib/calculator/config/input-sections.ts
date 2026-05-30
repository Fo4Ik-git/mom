import type { InputField } from "@/types/calculator";

export const INPUT_SECTION_IDS = ["materials", "services", "other"] as const;

export type InputSectionId = (typeof INPUT_SECTION_IDS)[number];

export function normalizeInputSection(section?: string): InputSectionId {
  if (section && INPUT_SECTION_IDS.includes(section as InputSectionId)) {
    return section as InputSectionId;
  }
  return "other";
}

export function groupInputsBySection(inputs: InputField[]) {
  const groups = new Map<InputSectionId, InputField[]>();
  for (const id of INPUT_SECTION_IDS) {
    groups.set(id, []);
  }
  for (const field of inputs) {
    const section = normalizeInputSection(field.section);
    groups.get(section)!.push(field);
  }
  return groups;
}

export function flattenGroupedInputs(groups: Map<InputSectionId, InputField[]>) {
  const flat: InputField[] = [];
  for (const id of INPUT_SECTION_IDS) {
    flat.push(...(groups.get(id) ?? []));
  }
  return flat;
}

export function fieldMatchesSearch(field: InputField, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  if (field.label.toLowerCase().includes(q)) {
    return true;
  }
  if (field.id.toLowerCase().includes(q)) {
    return true;
  }
  return field.properties.some(
    (property) =>
      property.label.toLowerCase().includes(q) ||
      property.id.toLowerCase().includes(q),
  );
}
