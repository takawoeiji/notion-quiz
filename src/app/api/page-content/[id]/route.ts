import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await notion.pages.retrieveMarkdown({ page_id: id });

    // Notionが \*\* のようにエスケープした記法を元の ** に戻して太字などを正しく表示する
    const markdown = response.markdown
      .replace(/\\\*/g, "*")   // \* → *  （太字・斜体）
      .replace(/\\_/g, "_")    // \_ → _  （斜体）
      .replace(/\\~/g, "~")    // \~ → ~  （取り消し線）
      .replace(/\\`/g, "`");   // \` → `  （コード）

    return NextResponse.json({
      markdown,
      truncated: response.truncated,
    });
  } catch (error) {
    console.error("Page content fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch page content" }, { status: 500 });
  }
}
