export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerReadClient } from "@/lib/supabase/server";
import { deleteRecipe, getRecipes } from "@/lib/recipes";
import AddRecipeButton from "./AddRecipeButton";

export default async function RecipesPage() {
  const supabase = await createSupabaseServerReadClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const recipes = await getRecipes();

  async function handleDelete(id: string) {
    "use server";
    await deleteRecipe(id);
  }

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recipes</h1>
        <AddRecipeButton />
      </header>

      {recipes.length === 0 ? (
        <p className="text-slate-600">
          No recipes yet. Add your first one.
        </p>
      ) : (
        <ul className="space-y-2">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="rounded-md border p-3 space-y-2"
            >
              {/* Primary action: view recipe */}
              <Link
                href={`/recipes/${recipe.id}`}
                className="font-medium underline"
              >
                {recipe.title}
              </Link>

              {/* Secondary actions */}
              <div className="flex gap-2">
                <Link
                  href={`/recipes/${recipe.id}/edit`}
                  className="text-sm underline"
                >
                  Edit
                </Link>

                <form action={handleDelete.bind(null, recipe.id)}>
                  <button
                    type="submit"
                    className="text-sm text-red-600 underline"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}