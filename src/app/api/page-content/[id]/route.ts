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

    // Step 1: Notionのエスケープを元に戻す
    let markdown = response.markdown
      .replace(/\\\*/g, "*")
      .replace(/\\_/g, "_")
      .replace(/\\~/g, "~")
      .replace(/\\`/g, "`");

    // Step 2: **太字** / *斜体* / ~~取り消し~~ をHTMLに変換（全体に適用）
    // `** text **` のようにスペースがある非標準パターンも含めて対応
    markdown = markdown
      .replace(/\*\*\s*([^*]+?)\s*\*\*/g, "<strong>$1</strong>")
      .replace(/\*\s*([^*\n]+?)\s*\*/g,   "<em>$1</em>")
      .replace(/~~([^~]+?)~~/g,            "<del>$1</del>");

    // Step 3: 見出し記号 (#, ##, ###, ####) をHTMLタグに変換
    // react-markdownはHTMLと混在するとATX見出しを認識できないため
    // `m` フラグで各行の先頭にマッチ
    markdown = markdown
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm,  "<h3>$1</h3>")
      .replace(/^## (.+)$/gm,   "<h2>$1</h2>")
      .replace(/^# (.+)$/gm,    "<h1>$1</h1>");

    // Step 4: <br> の直後に改行がない場合は補完（段落の流れを維持するため）
    markdown = markdown.replace(/<br>(?!\n)/g, "<br>\n");

    // Step 5: Notionの <table header-row="true"> を標準HTMLテーブルに変換
    // （Step2で ** はすでに <strong> になっているため、セル内の変換は不要）
    markdown = markdown.replace(
      /<table[^>]*header-row="true"[^>]*>([\s\S]*?)<\/table>/g,
      (_match, body: string) => {
        const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
        if (rows.length === 0) return _match;

        const headerCells = rows[0][1]
          .replace(/<td>/g, "<th>")
          .replace(/<\/td>/g, "</th>");
        const thead = `<thead><tr>${headerCells}</tr></thead>`;

        const tbody = rows.slice(1)
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
