export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RecipeDetailClient from "./RecipeDetailClient";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, title, ingredients_v2, steps_v2, notes")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!recipe) redirect("/recipes");
  
  return (
    <RecipeDetailClient
      recipe={{
        id: recipe.id,
        title: recipe.title,
        ingredients: recipe.ingredients_v2,
        steps: recipe.steps_v2,
        notes: recipe.notes,
      }}
    />
  );   
}