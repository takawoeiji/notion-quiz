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

    // Step 0: Notionブロック間の段落区切りを正規化
    // コードブロックは保護し、同じ種類の連続行（引用→引用、リスト→リスト）は
    // 空行を挿入しない。ただし引用→リストなど異種ブロックの間には必ず空行を入れる。
    // （空行がないと CommonMark の lazy continuation で後続ブロックが引用に取り込まれる）
    const codeBlocks: string[] = [];
    const withoutCode = response.markdown.replace(/```[\s\S]*?```/g, (m) => {
      codeBlocks.push(m);
      return `\x00CB${codeBlocks.length - 1}\x00`;
    });
    const isQuoteLine = (s: string) => /^>/.test(s.trim());
    // リストマーカーの後に必ずスペースが必要（`**bold**` 行を誤判定しないよう）
    const isListLine  = (s: string) => /^([-*+] |\d+\. )/.test(s.trim()) && !isQuoteLine(s);
    const sameBlockType = (a: string, b: string) =>
      (isQuoteLine(a) && isQuoteLine(b)) || (isListLine(a) && isListLine(b));

    const rawLines = withoutCode.split("\n");
    const spacedLines: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      spacedLines.push(rawLines[i]);
      if (i < rawLines.length - 1) {
        const curr = rawLines[i].trim();
        const next = rawLines[i + 1].trim();
        // 両方非空行かつ「同種の連続ブロック行」でなければ空行を挿入
        if (curr && next && !sameBlockType(curr, next)) {
          spacedLines.push("");
        }
      }
    }
    let markdown = spacedLines
      .join("\n")
      .replace(/\x00CB(\d+)\x00/g, (_, i) => codeBlocks[Number(i)]);

    // Step 1: Notionのエスケープを元に戻す
    markdown = markdown
      .replace(/\\\*/g, "*")
      .replace(/\\_/g, "_")
      .replace(/\\~/g, "~")
      .replace(/\\`/g, "`");

    // Step 2: ** 前後の余分なスペースを正規化する。
    // HTML変換はしない — FlashCard の remarkForceStrong プラグインが
    // CommonMark flanking ルールを通過できなかった ** を直接 strong ノードに変換する。
    markdown = markdown
      .replace(/\*\*\s+((?:[^*\n]|\*(?!\*))+?)\s+\*\*/g, "**$1**")
      .replace(/\*\*\s+((?:[^*\n]|\*(?!\*))+?)\*\*/g, "**$1**")
      .replace(/\*\*((?:[^*\n]|\*(?!\*))+?)\s+\*\*/g, "**$1**");

    // Step 4: <br> の直後に改行がない場合は補完
    markdown = markdown.replace(/<br>(?!\n)/g, "<br>\n");

    // Step 5: Notionの <table header-row="true"> を標準HTMLテーブルに変換
    // テーブルはHTMLブロックとして処理されるため、セル内の ** は rehypeRaw で処理される。
    // セル内の **bold** → <strong> も行う（HTMLブロック内は remarkプラグインが届かないため）。
    const boldToStrong = (s: string) =>
      s.replace(/\*\*\s*((?:[^*\n]|\*(?!\*))+?)\s*\*\*/g, "<strong>$1</strong>");

    markdown = markdown.replace(
      /<table[^>]*header-row="true"[^>]*>([\s\S]*?)<\/table>/g,
      (_match, body: string) => {
        const processedBody = boldToStrong(body);
        const rows = [...processedBody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
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
      _debug_raw: response.markdown.slice(0, 800),
    });
  } catch (error) {
    console.error("Page content fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch page content" }, { status: 500 });
  }
}
