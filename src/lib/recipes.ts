"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const store = await cookies();
          return store.get(name)?.value;
        },
      },
    }
  );
}

export async function getRecipes() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createRecipe(formData: FormData) {
    const title = formData.get("title") as string;
    const notes = formData.get("notes") as string | null;
  
    const supabase = getSupabase();
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      throw new Error("Not authenticated");
    }
  
    const { error } = await supabase.from("recipes").insert({
      title,
      notes: notes || null,
      user_id: user.id,
    });
  
    if (error) throw error;
  }  

export async function updateRecipe(id: string, formData: FormData) {
    const title = formData.get("title") as string;
    const notes = formData.get("notes") as string | null;
  
    const supabase = getSupabase();
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      throw new Error("Not authenticated");
    }
  
    const { error } = await supabase
      .from("recipes")
      .update({
        title,
        notes: notes || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  
    if (error) throw error;
  }
  
export async function deleteRecipe(id: string) {
    const supabase = getSupabase();
  
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
    const supabase = getSupabase();
    await supabase.auth.signOut();
  }  