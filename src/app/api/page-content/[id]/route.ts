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
    let markdown = response.markdown
      .replace(/\\\*/g, "*")
      .replace(/\\_/g, "_")
      .replace(/\\~/g, "~")
      .replace(/\\`/g, "`");

    // Notionの <table header-row="true"> を標準的な <thead>/<tbody>/<th> 構造に変換する
    markdown = markdown.replace(
      /<table[^>]*header-row="true"[^>]*>([\s\S]*?)<\/table>/g,
      (_match, body: string) => {
        // <tr>...</tr> ブロックを分割
        const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
        if (rows.length === 0) return _match;

        // 1行目をヘッダー（<th>）、残りをボディ（<td>）として組み立て
        const headerCells = rows[0][1]
          .replace(/<td>/g, "<th>")
          .replace(/<\/td>/g, "</th>");
        const thead = `<thead><tr>${headerCells}</tr></thead>`;

        const tbody = rows
          .slice(1)
          .map((r) => `<tr>${r[1]}</tr>`)
          .join("");

        return `<table class="notion-table">${thead}<tbody>${tbody}</tbody></table>`;
      }
    );

    return NextResponse.json({
      markdown,
      truncated: response.truncated,
    });
  } catch (error) {
    console.error("Page content fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch page content" }, { status: 500 });
  }
}
