export const dynamic = "force-dynamic";

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { deleteRecipe, getRecipes } from "@/lib/recipes";

export default async function RecipesPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

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

        <Link
          href="/recipes/new"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Add recipe
        </Link>
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