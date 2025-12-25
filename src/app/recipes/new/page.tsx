import { createRecipe } from "@/lib/recipes";
import { redirect } from "next/navigation";

export default function NewRecipePage() {
  async function action(formData: FormData) {
    "use server";
    await createRecipe(formData);
    redirect("/recipes");
  }

  return (
    <main className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Add recipe</h1>

      <form action={action} className="space-y-3">
        <input
          name="title"
          required
          placeholder="Recipe title"
          className="w-full rounded-md border p-2"
        />

        <textarea
          name="notes"
          placeholder="Notes (optional)"
          className="w-full rounded-md border p-2"
          rows={4}
        />

        <button className="rounded-md bg-black px-4 py-2 text-white">
          Save
        </button>
      </form>
    </main>
  );
}