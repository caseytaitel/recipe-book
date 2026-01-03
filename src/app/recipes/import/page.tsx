import { redirect } from "next/navigation";
import { discardImport, saveImportedRecipe } from "@/lib/recipes";

type ImportDraft = {
  title: string;
  ingredients: string[];
  steps: string[];
  notes?: string;
  source?: {
    type: string;
    value: string;
  };
};

function isValidImportDraft(value: unknown): value is ImportDraft {
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

export default async function ImportRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const params = await searchParams;

  if (!params.draft || typeof params.draft !== "string") {
    redirect("/recipes");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(params.draft);
  } catch {
    redirect("/recipes");
  }

  if (!isValidImportDraft(parsed)) {
    redirect("/recipes");
  }

  const draft: ImportDraft = parsed;

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Imported Recipe</h1>

        <form action={discardImport}>
          <button
            type="submit"
            className="text-sm underline text-slate-500"
          >
            Discard import
          </button>
        </form>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="font-medium">Title</h2>
          <p className="text-slate-700">{draft.title}</p>
        </div>

        <div>
          <h2 className="font-medium">Ingredients</h2>
          <ul className="list-disc pl-5 space-y-1">
            {draft.ingredients.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-medium">Steps</h2>
          <ol className="list-decimal pl-5 space-y-1">
            {draft.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        {draft.notes && (
          <div>
            <h2 className="font-medium">Notes</h2>
            <p className="text-slate-700 whitespace-pre-line">
              {draft.notes}
            </p>
          </div>
        )}
      </section>

      <form action={saveImportedRecipe.bind(null, draft)}>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Save Recipe
        </button>
      </form>
    </main>
  );
}