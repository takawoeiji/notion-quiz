import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/** テキスト内のMarkdownインライン記法をHTMLに変換する */
function inlineMarkdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")  // **太字**
    .replace(/\*(.+?)\*/g, "<em>$1</em>")               // *斜体*
    .replace(/~~(.+?)~~/g, "<del>$1</del>")             // ~~取り消し線~~
    .replace(/`(.+?)`/g, "<code>$1</code>");            // `コード`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await notion.pages.retrieveMarkdown({ page_id: id });

    // Notionが \*\* のようにエスケープした記法を元の ** に戻す
    let markdown = response.markdown
      .replace(/\\\*/g, "*")
      .replace(/\\_/g, "_")
      .replace(/\\~/g, "~")
      .replace(/\\`/g, "`");

    // Notionの <table header-row="true"> を標準的な HTML テーブルに変換する
    markdown = markdown.replace(
      /<table[^>]*header-row="true"[^>]*>([\s\S]*?)<\/table>/g,
      (_match, body: string) => {
        const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
        if (rows.length === 0) return _match;

        // 各セルのテキストにMarkdownインライン変換を適用するヘルパー
        const processCell = (tag: "th" | "td", cellsHtml: string) =>
          cellsHtml.replace(
            new RegExp(`<${tag === "th" ? "td" : "td"}>([\s\S]*?)<\\/${tag === "th" ? "td" : "td"}>`, "g"),
            (_c, inner: string) => `<${tag}>${inlineMarkdownToHtml(inner.trim())}</${tag}>`
          );

        // 1行目をヘッダー行（<th>）に
        const rawHeader = rows[0][1];
        const headerCells = rawHeader.replace(
          /<td>([\s\S]*?)<\/td>/g,
          (_c, inner: string) => `<th>${inlineMarkdownToHtml(inner.trim())}</th>`
        );
        const thead = `<thead><tr>${headerCells}</tr></thead>`;

        // 残りをボディ行（<td>）に（セル内Markdownも変換）
        const tbody = rows.slice(1).map((r) => {
          const cells = r[1].replace(
            /<td>([\s\S]*?)<\/td>/g,
            (_c, inner: string) => `<td>${inlineMarkdownToHtml(inner.trim())}</td>`
          );
          return `<tr>${cells}</tr>`;
        }).join("");

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
