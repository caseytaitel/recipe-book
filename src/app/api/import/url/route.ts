import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing URL" },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "RecipeBookBot/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 400 }
      );
    }

    const html = await res.text();

    // --- AI extraction ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You extract structured recipe data. Return ONLY valid JSON.",
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

    if (!raw) {
      return NextResponse.json(
        { error: "AI returned no content" },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const draft: RecipeImportDraft = {
      title: parsed.title ?? "",
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients
        : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      notes: parsed.notes ?? "",
      source: {
        type: "url",
        value: url,
      },
    };

    return NextResponse.json(draft);
  } catch (err) {
    console.error("URL import failed:", err);
    return NextResponse.json(
      { error: "Unexpected error during import" },
      { status: 500 }
    );
  }
}