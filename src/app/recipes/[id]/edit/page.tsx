"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { updateRecipe } from "@/lib/recipes";
import { supabase } from "@/lib/supabase/client";

type LineItem = {
  id: string;
  text: string;
};

type Recipe = {
  id: string;
  title: string;
  ingredients_v2: LineItem[];
  steps_v2: LineItem[];
  notes: string | null;
};

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    async function fetchRecipe() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("recipes")
        .select("id, title, ingredients_v2, steps_v2, notes")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!data) {
        router.push("/recipes");
        return;
      }

      setRecipe(data);
    }

    fetchRecipe();
  }, [id, router]);

  async function action(formData: FormData) {
    if (!recipe) return;
    setLoading(true);
    await updateRecipe(recipe.id, formData);
    router.push("/recipes");
  }

  if (!recipe) {
    return (
      <main className="max-w-md space-y-6">
        <h1 className="text-xl font-semibold">Edit Recipe</h1>
        <p className="text-slate-600">Loading...</p>
      </main>
    );
  }

  const ingredients = recipe.ingredients_v2.map(
    (item: LineItem) => item.text
  );

  const steps = recipe.steps_v2.map(
    (item: LineItem) => item.text
  );

  return (
    <main className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Edit Recipe</h1>

      <form action={action} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <input
            name="title"
            required
            defaultValue={recipe.title}
            className="w-full rounded-md border p-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Ingredients (one per line)
          </label>
          <textarea
            name="ingredients"
            rows={5}
            defaultValue={ingredients.join("\n")}
            className="w-full rounded-md border p-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Steps (one per line)
          </label>
          <textarea
            name="steps"
            rows={6}
            defaultValue={steps.join("\n")}
            className="w-full rounded-md border p-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            name="notes"
            rows={4}
            defaultValue={recipe.notes ?? ""}
            className="w-full rounded-md border p-2"
          />
        </div>

        <button
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </main>
  );
}