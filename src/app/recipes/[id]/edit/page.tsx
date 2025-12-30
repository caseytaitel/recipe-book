export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { updateRecipe } from "@/lib/recipes";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data } = await supabase
  .from("recipes")
  .select("id, title, ingredients, steps, notes")
  .eq("id", id)
  .eq("user_id", user.id)
  .single();

  if (!data) redirect("/recipes");

  const recipe = data;

  async function action(formData: FormData) {
    "use server";
    await updateRecipe(recipe.id, formData);
    redirect(`/recipes/${recipe.id}`);
  }

  return (
    <main className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Edit recipe</h1>

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
            defaultValue={recipe.ingredients.join("\n")}
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
            defaultValue={recipe.steps.join("\n")}
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

        <button className="rounded-md bg-black px-4 py-2 text-white">
          Save Changes
        </button>
      </form>
    </main>
  );
}