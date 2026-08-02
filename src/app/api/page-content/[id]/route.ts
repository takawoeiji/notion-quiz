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
    const isListLine  = (s: string) => /^[-*+]|\d+\./.test(s.trim()) && !isQuoteLine(s);
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

    // Step 2: Notionが出力する `** text **`（スペース入り）を正規化して
    // remark-gfm がネイティブに処理できる `**text**` 形式にするだけ。
    // HTML変換はしない（rehype変換時にインラインHTMLが落ちるため）。
    markdown = markdown
      .replace(/\*\*\s+([^*]+?)\s+\*\*/g, "**$1**");
    // *italic* / ~~strike~~ はそのまま remark-gfm に任せる

    // Step 3: 見出し記号 (#, ##, ###, ####) をHTMLタグに変換し、前後に空行を確保
    // ポイント: 前後の \n と合わせて \n\n（空行）になるよう \n を付加する
    // 空行がないと後続のリスト・段落がHTMLブロックに飲み込まれてしまう
    markdown = markdown
      .replace(/^#### (.+)$/gm, "\n<h4>$1</h4>\n")
      .replace(/^### (.+)$/gm,  "\n<h3>$1</h3>\n")
      .replace(/^## (.+)$/gm,   "\n<h2>$1</h2>\n")
      .replace(/^# (.+)$/gm,    "\n<h1>$1</h1>\n");

    // Step 4: <br> の直後に改行がない場合は補完
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
