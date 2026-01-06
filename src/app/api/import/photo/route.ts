// TODO Phase 4+: leverage extracted normalization pipeline when adding footnotes or structured annotations.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isValidImportDraft, cleanJsonResponse } from "@/lib/import";
import { OPENAI_MODEL } from "@/lib/ai/config";

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
      console.error("[import:photo]", "OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "Something went wrong on our side. Please try again." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.responses.create({
      model: OPENAI_MODEL,
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
      console.error("[import:photo]", "OpenAI returned no text content");
      return NextResponse.json(
        { error: "We couldn't read that photo. Try another image or better lighting." },
        { status: 500 }
      );
    }

    const cleaned = cleanJsonResponse(rawText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("[import:photo]", parseError);
      return NextResponse.json(
        { error: "We couldn't read that photo. Try another image or better lighting." },
        { status: 500 }
      );
    }

    if (!isValidImportDraft(parsed)) {
      console.error("[import:photo]", "OpenAI response does not match expected structure");
      return NextResponse.json(
        { error: "We couldn't read that photo. Try another image or better lighting." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[import:photo]", err);
    return NextResponse.json(
      { error: "We couldn't read that photo. Try another image or better lighting." },
      { status: 500 }
    );
  }
}