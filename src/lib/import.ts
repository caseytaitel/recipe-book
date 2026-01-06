export type ImportDraft = {
  title: string;
  ingredients: string[];
  steps: string[];
  notes?: string;
  source?: {
    type: string;
    value: string;
  };
};

export function isValidImportDraft(value: unknown): value is ImportDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.title === "string" &&
    Array.isArray(draft.ingredients) &&
    draft.ingredients.every((item) => typeof item === "string") &&
    Array.isArray(draft.steps) &&
    draft.steps.every((step) => typeof step === "string") &&
    (draft.notes === undefined || typeof draft.notes === "string") &&
    (draft.source === undefined ||
      (typeof draft.source === "object" &&
        draft.source !== null &&
        typeof (draft.source as Record<string, unknown>).type === "string" &&
        typeof (draft.source as Record<string, unknown>).value === "string"))
  );
}

type ParsedRecipe = {
  title?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  notes?: unknown;
};

export function normalizeRecipeData(
  parsed: ParsedRecipe,
  url: string
): ImportDraft {
  return {
    title: typeof parsed.title === "string" ? parsed.title : "",
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.filter((item): item is string => typeof item === "string")
      : [],
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((step): step is string => typeof step === "string")
      : [],
    notes:
      typeof parsed.notes === "string"
        ? parsed.notes || undefined
        : parsed.notes === null
        ? undefined
        : undefined,
    source: {
      type: "url",
      value: url,
    },
  };
}

export function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/```\s*$/i, "");
  
  // Extract JSON object/array if embedded in text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned.trim();
}

