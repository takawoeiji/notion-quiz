import { NextResponse } from "next/server";
import { fetchSchema } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schema = await fetchSchema();
    return NextResponse.json(schema);
  } catch (error) {
    console.error("Schema fetch error:", error);
    return NextResponse.json(
      { subjects: [], understandings: [] },
      { status: 200 }
    );
  }
}
