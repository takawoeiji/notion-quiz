import { NextResponse } from "next/server";
import { fetchQuestions } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const questions = await fetchQuestions();
    return NextResponse.json(questions);
  } catch (error) {
    console.error("Notion fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
