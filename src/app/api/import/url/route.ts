export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";

type RecipeImportDraft = {
  title: string;
  ingredients: string[];
  steps: string[];
  notes?: string;
  source: {
    type: "url";
    value: string;
  };
};

type ParsedRecipe = {
  title?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  notes?: unknown;
};

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeRecipeData(parsed: ParsedRecipe, url: string): RecipeImportDraft {
  return {
    title: typeof parsed.title === "string" ? parsed.title : "",
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.filter((item): item is string => typeof item === "string")
      : [],
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((step): step is string => typeof step === "string")
      : [],
    notes:
      typeof parsed.notes === "string"
        ? parsed.notes || undefined
        : parsed.notes === null
        ? undefined
        : undefined,
    source: {
      type: "url",
      value: url,
    },
  };
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid or missing URL" },
        { status: 400 }
      );
    }

    const url = (body as Record<string, unknown>).url;

    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      return NextResponse.json(
        { error: "Invalid or missing URL" },
        { status: 400 }
      );
    }

    const fetchRes = await fetch(url, {
      headers: { "User-Agent": "RecipeBookBot/1.0" },
    });

    if (!fetchRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 400 }
      );
    }

    const html = await fetchRes.text();

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You extract structured recipe data. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: `
Extract a recipe from the following webpage content.

Return JSON with:
- title (string)
- ingredients (array of strings, one ingredient per line)
- steps (array of strings, one step per line)
- notes (string or null)

If information is missing, return empty strings or empty arrays.
Do not guess.

WEBPAGE CONTENT:
${html}
          `,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw || typeof raw !== "string") {
      console.error("OpenAI returned no content");
      return NextResponse.json(
        { error: "Failed to extract recipe from URL" },
        { status: 500 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON response:", parseError);
      return NextResponse.json(
        { error: "Failed to parse recipe data" },
        { status: 500 }
      );
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        { error: "Invalid recipe format received" },
        { status: 500 }
      );
    }

    const draft = normalizeRecipeData(parsed as ParsedRecipe, url);

    return NextResponse.json(draft);
  } catch (err) {
    console.error("URL import failed:", err);
    return NextResponse.json(
      { error: "Unexpected error during import" },
      { status: 500 }
    );
  }
}