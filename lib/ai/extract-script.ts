/** Pull raw .calc script from an LLM reply (strips markdown fences if present). */
export function extractScriptFromLlmResponse(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:calc)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}
