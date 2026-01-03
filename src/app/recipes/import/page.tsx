import { redirect } from "next/navigation";

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

export default async function ImportRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const params = await searchParams;

  if (!params.draft) {
    redirect("/recipes");
  }

  let draft: ImportDraft;

  try {
    draft = JSON.parse(params.draft);
  } catch {
    redirect("/recipes");
  }

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Imported Recipe</h1>

        <form
          action={async () => {
            "use server";
            redirect("/recipes");
          }}
        >
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

      <form
        action={async () => {
          "use server";
          const { createRecipeFromImport } = await import("@/lib/recipes");
          await createRecipeFromImport(draft);
          redirect("/recipes");
        }}
      >
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