import { NextRequest, NextResponse } from "next/server";
import { updateUnderstanding } from "@/lib/notion";
import type { Understanding } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { pageId, understanding, reviewCount } = await req.json();
    if (!pageId || !understanding) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    await updateUnderstanding(pageId, understanding as Understanding, reviewCount ?? 0);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notion update error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}
