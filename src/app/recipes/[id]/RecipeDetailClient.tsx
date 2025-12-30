"use client";

import { useState, useEffect } from "react";
import { updateRecipe } from "@/lib/recipes";

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  notes: string | null;
}

export default function RecipeDetailClient({ recipe }: { recipe: Recipe }) {
  const [editingField, setEditingField] = useState<
    "ingredients" | "steps" | "notes" | null
  >(null);
  const [ingredients, setIngredients] = useState(
    recipe.ingredients.join("\n")
  );
  const [steps, setSteps] = useState(recipe.steps.join("\n"));
  const [notes, setNotes] = useState(recipe.notes ?? "");

  useEffect(() => {
    setIngredients(recipe.ingredients.join("\n"));
    setSteps(recipe.steps.join("\n"));
    setNotes(recipe.notes ?? "");
  }, [recipe]);

  const handleSave = async () => {
    if (!editingField) return;

    const formData = new FormData();
    formData.append("title", recipe.title);
    formData.append("ingredients", ingredients);
    formData.append("steps", steps);
    formData.append("notes", notes);

    await updateRecipe(recipe.id, formData);
    setEditingField(null);
  };

  const ingredientsList = ingredients.split("\n").filter(Boolean);
  const stepsList = steps.split("\n").filter(Boolean);

  return (
    <main className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{recipe.title}</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Ingredients</h2>
        {editingField === "ingredients" ? (
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={Math.max(5, ingredients.split("\n").length + 2)}
            className="w-full rounded-md border p-2"
            autoFocus
          />
        ) : (
          <ul
            className="list-disc space-y-1 pl-5 cursor-pointer"
            onClick={() => setEditingField("ingredients")}
          >
            {ingredientsList.map((ingredient: string, i: number) => (
              <li key={i}>{ingredient}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Steps</h2>
        {editingField === "steps" ? (
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={Math.max(6, steps.split("\n").length + 2)}
            className="w-full rounded-md border p-2"
            autoFocus
          />
        ) : (
          <ol
            className="list-decimal space-y-2 pl-5 cursor-pointer"
            onClick={() => setEditingField("steps")}
          >
            {stepsList.map((step: string, i: number) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
      </section>

      {(notes || editingField === "notes") && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Notes</h2>
          {editingField === "notes" ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border p-2"
              autoFocus
            />
          ) : (
            <p
              className="whitespace-pre-wrap text-slate-700 cursor-pointer"
              onClick={() => setEditingField("notes")}
            >
              {notes}
            </p>
          )}
        </section>
      )}

      {editingField && (
        <button
          onClick={handleSave}
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Save Changes
        </button>
      )}
    </main>
  );
}

