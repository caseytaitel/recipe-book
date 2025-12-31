"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server";

type LineItem = {
  id: string;
  text: string;
};

export async function getRecipes() {
  const supabase = await createSupabaseServerActionClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createRecipe(formData: FormData) {
  const supabase = await createSupabaseServerActionClient();

  const title = formData.get("title") as string;

  const ingredientsText = (formData.get("ingredients") as string)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const stepsText = (formData.get("steps") as string)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const ingredients_v2: LineItem[] = ingredientsText.map((text) => ({
    id: crypto.randomUUID(),
    text,
  }));

  const steps_v2: LineItem[] = stepsText.map((text) => ({
    id: crypto.randomUUID(),
    text,
  }));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("recipes").insert({
    title,
    ingredients_v2,
    steps_v2,
    user_id: user.id,
  });

  if (error) throw error;
}

export async function updateRecipe(
  recipeId: string,
  formData: FormData
) {
  const supabase = await createSupabaseServerActionClient();

  const title = formData.get("title") as string;
  const notes = formData.get("notes") as string | null;

  const ingredientsText = (formData.get("ingredients") as string)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const stepsText = (formData.get("steps") as string)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const { data: existing } = await supabase
    .from("recipes")
    .select("ingredients_v2, steps_v2")
    .eq("id", recipeId)
    .single();

  const existingIngredients: LineItem[] = existing?.ingredients_v2 ?? [];
  const existingSteps: LineItem[] = existing?.steps_v2 ?? [];

  const nextIngredients: LineItem[] = ingredientsText.map((text, index) => ({
    id: existingIngredients[index]?.id ?? crypto.randomUUID(),
    text,
  }));

  const nextSteps: LineItem[] = stepsText.map((text, index) => ({
    id: existingSteps[index]?.id ?? crypto.randomUUID(),
    text,
  }));

  await supabase
    .from("recipes")
    .update({
      title,
      notes,
      ingredients_v2: nextIngredients,
      steps_v2: nextSteps,
    })
    .eq("id", recipeId);
}

export async function deleteRecipe(id: string) {
  const supabase = await createSupabaseServerActionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function logout() {
  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}