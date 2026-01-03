"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type LineItem = {
  id: string;
  text: string;
};

export async function getRecipes() {
  const supabase = await createSupabaseServerActionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, notes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function parseTextLines(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function createRecipe(formData: FormData) {
  const supabase = await createSupabaseServerActionClient();

  const titleValue = formData.get("title");
  const title = typeof titleValue === "string" ? titleValue.trim() : "";

  if (!title) {
    throw new Error("Title is required");
  }

  const ingredientsText = parseTextLines(formData.get("ingredients"));
  const stepsText = parseTextLines(formData.get("steps"));

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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.from("recipes").insert({
    title,
    ingredients_v2,
    steps_v2,
    user_id: user.id,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/recipes");
}

export async function createRecipeFromImport(draft: {
  title: string;
  ingredients: string[];
  steps: string[];
  notes?: string;
  source?: {
    type: string;
    value: string;
  };
}) {
  const supabase = await createSupabaseServerActionClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const ingredients_v2: LineItem[] = draft.ingredients.map((text) => ({
    id: crypto.randomUUID(),
    text,
  }));

  const steps_v2: LineItem[] = draft.steps.map((text) => ({
    id: crypto.randomUUID(),
    text,
  }));

  const { error } = await supabase.from("recipes").insert({
    user_id: user.id,
    title: draft.title,
    ingredients_v2,
    steps_v2,
    notes: draft.notes ?? null,
    source: draft.source ?? null,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/recipes");
}

export async function updateRecipe(
  recipeId: string,
  formData: FormData
) {
  if (!recipeId || typeof recipeId !== "string") {
    throw new Error("Invalid recipe ID");
  }

  const supabase = await createSupabaseServerActionClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const titleValue = formData.get("title");
  const titleFromForm = typeof titleValue === "string" ? titleValue.trim() : "";

  const notesValue = formData.get("notes");
  const notes =
    notesValue === null || notesValue === undefined
      ? null
      : typeof notesValue === "string"
      ? notesValue.trim() || null
      : null;

  const ingredientsText = parseTextLines(formData.get("ingredients"));
  const stepsText = parseTextLines(formData.get("steps"));

  const { data: existing, error: fetchError } = await supabase
    .from("recipes")
    .select("title, ingredients_v2, steps_v2, user_id")
    .eq("id", recipeId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (!existing) {
    throw new Error("Recipe not found");
  }

  if (existing.user_id !== user.id) {
    throw new Error("Not authorized");
  }

  const title = titleFromForm || existing.title || "";

  if (!title) {
    throw new Error("Title is required");
  }

  const existingIngredients: LineItem[] =
    Array.isArray(existing.ingredients_v2) &&
    existing.ingredients_v2.every(
      (item): item is LineItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).text === "string"
    )
      ? existing.ingredients_v2
      : [];

  const existingSteps: LineItem[] =
    Array.isArray(existing.steps_v2) &&
    existing.steps_v2.every(
      (item): item is LineItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).text === "string"
    )
      ? existing.steps_v2
      : [];

  const nextIngredients: LineItem[] = ingredientsText.map((text, index) => ({
    id: existingIngredients[index]?.id ?? crypto.randomUUID(),
    text,
  }));

  const nextSteps: LineItem[] = stepsText.map((text, index) => ({
    id: existingSteps[index]?.id ?? crypto.randomUUID(),
    text,
  }));

  const { error: updateError } = await supabase
    .from("recipes")
    .update({
      title,
      notes,
      ingredients_v2: nextIngredients,
      steps_v2: nextSteps,
    })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (updateError) {
    throw updateError;
  }

  revalidatePath("/recipes");
}

export async function deleteRecipe(id: string) {
  if (!id || typeof id !== "string") {
    throw new Error("Invalid recipe ID");
  }

  const supabase = await createSupabaseServerActionClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  revalidatePath("/recipes");
}

export async function logout() {
  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function discardImport() {
  const { redirect } = await import("next/navigation");
  redirect("/recipes");
}

export async function saveImportedRecipe(draft: {
  title: string;
  ingredients: string[];
  steps: string[];
  notes?: string;
  source?: {
    type: string;
    value: string;
  };
}) {
  if (!draft.title || typeof draft.title !== "string") {
    throw new Error("Invalid draft: title is required");
  }

  if (!Array.isArray(draft.ingredients)) {
    throw new Error("Invalid draft: ingredients must be an array");
  }

  if (!Array.isArray(draft.steps)) {
    throw new Error("Invalid draft: steps must be an array");
  }

  await createRecipeFromImport(draft);
  const { redirect } = await import("next/navigation");
  redirect("/recipes");
}