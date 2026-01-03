export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";

type RecipeImportDraft = {
  title: string;
  ingredients: string[];
  steps: string[];
  notes?: string;
};

function isValidRecipeDraft(value: unknown): value is RecipeImportDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.title === "string" &&
    Array.isArray(draft.ingredients) &&
    draft.ingredients.every((item) => typeof item === "string") &&
    Array.isArray(draft.steps) &&
    draft.steps.every((step) => typeof step === "string") &&
    (draft.notes === undefined || typeof draft.notes === "string")
  );
}

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/```\s*$/i, "");
  
  // Extract JSON object/array if embedded in text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned.trim();
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("photo");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Read this recipe image and extract:
- title
- ingredients (array of strings)
- steps (array of strings)
- notes (optional)

Return strict JSON only.
`,
            },
            {
              type: "input_image",
              image_url: `data:${image.type};base64,${buffer.toString("base64")}`,
              detail: "auto",
            },
          ],
        },
      ],
    });

    const rawText = response.output_text;

    if (!rawText || typeof rawText !== "string") {
      console.error("OpenAI returned no text content");
      return NextResponse.json(
        { error: "Failed to extract recipe from photo" },
        { status: 500 }
      );
    }

    const cleaned = cleanJsonResponse(rawText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON response:", parseError);
      return NextResponse.json(
        { error: "Failed to parse recipe data" },
        { status: 500 }
      );
    }

    if (!isValidRecipeDraft(parsed)) {
      console.error("OpenAI response does not match expected structure");
      return NextResponse.json(
        { error: "Invalid recipe format received" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Photo import failed:", err);
    return NextResponse.json(
      { error: "Failed to import from photo" },
      { status: 500 }
    );
  }
}