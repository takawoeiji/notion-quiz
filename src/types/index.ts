export type Subject = string;

export type Importance = "高" | "中" | "低";

export type Understanding = string;

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
  subject: string;
  importance: Importance | "全て";
  understanding: string;
}

export interface SchemaOptions {
  subjects: string[];
  understandings: string[];
}
