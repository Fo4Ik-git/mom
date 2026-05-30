import type { InputField, InputProperty } from "@/types/calculator";

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneProperty(property: InputProperty): InputProperty {
  return {
    ...property,
    id: randomId("var"),
  };
}

export function cloneInputField(source: InputField, labelSuffix?: string): InputField {
  const suffix = labelSuffix?.trim();
  const label =
    suffix && source.label.trim()
      ? `${source.label.trim()} ${suffix}`
      : source.label;

  return {
    ...source,
    id: randomId("field"),
    label,
    section: source.section,
    properties: source.properties.map(cloneProperty),
    presets: source.presets ? [...source.presets] : undefined,
  };
}
