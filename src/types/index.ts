export type Subject =
  | "労働基準法"
  | "労働安全衛生法"
  | "労働者災害補償保険法"
  | "雇用保険法"
  | "労働保険徴収法"
  | "健康保険法"
  | "国民年金法"
  | "厚生年金保険法"
  | "一般常識";

export type Importance = "高" | "中" | "低";

export type Understanding =
  | "完全に理解"
  | "まあまあ理解"
  | "部分的に理解"
  | "不明点あり"
  | "要復習";

export type Answer = "〇" | "✕" | "A" | "B" | "C" | "D" | "E";

export interface QuizQuestion {
  id: string;
  url: string;
  title: string;
  subject: Subject | null;
  importance: Importance | null;
  understanding: Understanding | null;
  tags: string[];
  questionContent: string;
  answer: Answer | null;
  geminiAnswer: string;
  relatedLaw: string;
  reviewCount: number;
  page: number | null;
}

export interface Filters {
  subject: Subject | "全て";
  importance: Importance | "全て";
  understanding: Understanding | "全て";
}
