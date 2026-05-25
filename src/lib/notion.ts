import { Client } from "@notionhq/client";
import type { QuizQuestion, Understanding } from "@/types";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Data source ID extracted from the Notion database URL
const DATA_SOURCE_ID = "2c13000f-a5b1-80e0-9cb1-000b19a2d403";

type AnyProp = Record<string, unknown>;

function extractRichText(prop: AnyProp | undefined): string {
  if (!prop) return "";
  const texts = prop["rich_text"] as Array<{ plain_text: string }> | undefined;
  if (Array.isArray(texts)) return texts.map((t) => t.plain_text).join("");
  return "";
}

function extractTitle(prop: AnyProp | undefined): string {
  if (!prop) return "";
  const texts = prop["title"] as Array<{ plain_text: string }> | undefined;
  if (Array.isArray(texts)) return texts.map((t) => t.plain_text).join("");
  return "";
}

function extractSelect(prop: AnyProp | undefined): string | null {
  if (!prop) return null;
  const sel = prop["select"] as { name: string } | null | undefined;
  return sel?.name ?? null;
}

function extractMultiSelect(prop: AnyProp | undefined): string[] {
  if (!prop) return [];
  const items = prop["multi_select"] as Array<{ name: string }> | undefined;
  if (Array.isArray(items)) return items.map((s) => s.name);
  return [];
}

function extractNumber(prop: AnyProp | undefined): number | null {
  if (!prop) return null;
  const n = prop["number"];
  return typeof n === "number" ? n : null;
}

export async function fetchQuestions(): Promise<QuizQuestion[]> {
  const allResults: AnyProp[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: DATA_SOURCE_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    const results = response.results as AnyProp[];
    allResults.push(...results);
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return allResults
    .filter((page) => page["object"] === "page")
    .map((page) => {
      const props = (page["properties"] ?? {}) as Record<string, AnyProp>;
      return {
        id: page["id"] as string,
        url: page["url"] as string,
        title: extractTitle(props["質問タイトル"]),
        subject: extractSelect(props["科目"]) as QuizQuestion["subject"],
        importance: extractSelect(props["重要度"]) as QuizQuestion["importance"],
        understanding: extractSelect(props["理解度"]) as QuizQuestion["understanding"],
        tags: extractMultiSelect(props["論点タグ"]),
        questionContent: extractRichText(props["質問内容"]),
        answer: extractSelect(props["補足・正解"]) as QuizQuestion["answer"],
        geminiAnswer: extractRichText(props["Gemini回答"]),
        relatedLaw: extractRichText(props["関連法令条文"]),
        reviewCount: extractNumber(props["復習回数"]) ?? 0,
        page: extractNumber(props["ページ"]),
      };
    });
}

export async function updateUnderstanding(
  pageId: string,
  understanding: Understanding,
  currentReviewCount: number
): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      理解度: {
        select: { name: understanding },
      },
      復習回数: {
        number: currentReviewCount + 1,
      },
    },
  });
}
