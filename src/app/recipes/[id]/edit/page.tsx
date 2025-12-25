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
  // ✅ UNWRAP params (THIS WAS THE BUG)
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
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, title, notes")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!recipe) redirect("/recipes");

  const safeRecipe = recipe;

  async function action(formData: FormData) {
    "use server";
    await updateRecipe(safeRecipe.id, formData);
    redirect("/recipes");
  }

  return (
    <main className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Edit recipe</h1>

      <form action={action} className="space-y-3">
        <input
          name="title"
          required
          defaultValue={recipe.title}
          className="w-full rounded-md border p-2"
        />

        <textarea
          name="notes"
          defaultValue={recipe.notes ?? ""}
          className="w-full rounded-md border p-2"
          rows={4}
        />

        <button className="rounded-md bg-black px-4 py-2 text-white">
          Save changes
        </button>
      </form>
    </main>
  );
}