"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRecipe } from "@/lib/recipes";

export default function NewRecipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function action(formData: FormData) {
    setLoading(true);
    await createRecipe(formData);
    router.push("/recipes");
  }

  return (
    <main className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Add recipe</h1>

      <form action={action} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Recipe title</label>
          <input
            name="title"
            required
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
            className="w-full rounded-md border p-2"
            placeholder={`2 cups flour\n1 tsp salt\n1 cup milk`}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Steps (one per line)
          </label>
          <textarea
            name="steps"
            rows={6}
            className="w-full rounded-md border p-2"
            placeholder={`Preheat oven to 350°F\nMix dry ingredients\nBake for 25 minutes`}
          />
        </div>

        <button
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save recipe"}
        </button>
      </form>
    </main>
  );
}