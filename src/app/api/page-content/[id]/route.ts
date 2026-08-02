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

    // Step 3: Notionのタブインデントを変換する
    // Notionは \t+[リストマーカー] でリスト項目、\t+[テキスト] で継続段落を表現する。
    // CommonMarkでは行頭タブ＝4スペース＝コードブロックと解釈されるため変換が必要:
    //   \t+[リストマーカー] → リストマーカー（タブ完全除去 → 通常リスト項目）
    //   \t+[その他テキスト] → 2スペース（コードブロックを回避しリスト継続段落として機能）
    markdown = markdown.replace(/^\t+([-*+] |\d+\. )/gm, "$1");
    markdown = markdown.replace(/^\t+/gm, "  ");

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

        return `<div class="notion-table-wrapper"><table class="notion-table">${thead}<tbody>${tbody}</tbody></table></div>`;
      }
    );

    // Step 5b: header-row属性のない生の <table> 要素を処理する
    // Notionは一部のテーブルを <table><tr><td> 形式（header-row属性なし）でエクスポートし、
    // 各要素の間に空行を挟む。CommonMarkはその空行でHTMLブロックを閉じるため、
    // テーブル構造が分断される。空行を除去してwrapperで包む。
    markdown = markdown.replace(
      /<table(?![^>]*(?:notion-table|header-row))[^>]*>([\s\S]*?)<\/table>/g,
      (_match, body: string) => {
        const compactBody = boldToStrong(body.replace(/\n{2,}/g, "\n").trim());
        const rows = [...compactBody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
        if (rows.length === 0) {
          return `<div class="notion-table-wrapper"><table class="notion-table">${compactBody}</table></div>`;
        }
        const headerCells = rows[0][1]
          .replace(/<td>/g, "<th>")
          .replace(/<\/td>/g, "</th>");
        const thead = `<thead><tr>${headerCells}</tr></thead>`;
        const tbody = rows.slice(1).map((r) => `<tr>${r[1]}</tr>`).join("");
        return `<div class="notion-table-wrapper"><table class="notion-table">${thead}<tbody>${tbody}</tbody></table></div>`;
      }
    );

    // Step 6: **...** 全体を <strong> に変換（コードブロック保護つき）
    // CommonMarkのフランキングルールは日本語約物（「：」「「」「」」など）が
    // ** の直前直後にある場合、太字として認識しないケースがある。
    // コードブロック・インラインコードを保護した上で全ての **...** を
    // <strong> タグに変換し、rehypeRaw で確実に太字にする。
    {
      const cb6: string[] = [];
      const withoutCb6 = markdown.replace(/```[\s\S]*?```|`[^`\n]+`/g, (m) => {
        cb6.push(m);
        return `\x00CB6${cb6.length - 1}\x00`;
      });
      markdown = boldToStrong(withoutCb6)
        .replace(/\x00CB6(\d+)\x00/g, (_, i) => cb6[Number(i)]);
    }

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
