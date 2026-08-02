"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { QuizQuestion, Understanding } from "@/types";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "class"],
    table: [...(defaultSchema.attributes?.table ?? []), "headerRow", "header-row"],
    td: [...(defaultSchema.attributes?.td ?? []), "colSpan", "rowSpan", "colspan", "rowspan"],
    th: [...(defaultSchema.attributes?.th ?? []), "colSpan", "rowSpan", "colspan", "rowspan"],
  },
};

const SUBJECT_COLORS: Record<string, string> = {
  労働基準法: "bg-red-100 text-red-700 border-red-200",
  労働安全衛生法: "bg-orange-100 text-orange-700 border-orange-200",
  労働者災害補償保険法: "bg-yellow-100 text-yellow-700 border-yellow-200",
  雇用保険法: "bg-green-100 text-green-700 border-green-200",
  労働保険徴収法: "bg-teal-100 text-teal-700 border-teal-200",
  健康保険法: "bg-blue-100 text-blue-700 border-blue-200",
  国民年金法: "bg-purple-100 text-purple-700 border-purple-200",
  厚生年金保険法: "bg-pink-100 text-pink-700 border-pink-200",
  一般常識: "bg-gray-100 text-gray-700 border-gray-200",
};

const IMPORTANCE_BADGE: Record<string, string> = {
  高: "bg-red-500 text-white",
  中: "bg-yellow-500 text-white",
  低: "bg-blue-400 text-white",
};

const ANSWER_STYLE: Record<string, string> = {
  "〇": "bg-green-100 text-green-700 border-green-300",
  "✕": "bg-red-100 text-red-700 border-red-300",
  A: "bg-purple-100 text-purple-700 border-purple-300",
  B: "bg-purple-100 text-purple-700 border-purple-300",
  C: "bg-gray-100 text-gray-700 border-gray-300",
  D: "bg-blue-100 text-blue-700 border-blue-300",
  E: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

// 理解度ボタンの色（Notionの設定順に対応）
const UNDERSTANDING_BUTTON_COLORS = [
  "bg-red-500 hover:bg-red-600 text-white",
  "bg-orange-400 hover:bg-orange-500 text-white",
  "bg-yellow-400 hover:bg-yellow-500 text-white",
  "bg-blue-400 hover:bg-blue-500 text-white",
  "bg-green-500 hover:bg-green-600 text-white",
];

const FALLBACK_UNDERSTANDING_OPTIONS = [
  "要復習",
  "要暗記",
  "部分的に理解",
  "まあまあ理解",
  "完全に理解",
];

interface Props {
  question: QuizQuestion;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onUpdateUnderstanding: (
    id: string,
    understanding: Understanding,
    reviewCount: number
  ) => Promise<{ verified: boolean; error?: string }>;
  understandingOptions: string[];
}

export function FlashCard({
  question,
  index,
  total,
  onNext,
  onPrev,
  onUpdateUnderstanding,
  understandingOptions,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [savedUnderstanding, setSavedUnderstanding] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [pageContent, setPageContent] = useState<string | null>(null);
  const [pageContentOpen, setPageContentOpen] = useState(false);
  const [pageContentLoading, setPageContentLoading] = useState(false);

  const handleReveal = () => setRevealed(true);

  const handleUnderstanding = async (value: Understanding) => {
    setUpdating(true);
    setUpdateError(null);
    setVerificationFailed(false);
    try {
      const result = await onUpdateUnderstanding(question.id, value, question.reviewCount);
      if (result.error) {
        setUpdateError(result.error);
      } else {
        setSavedUnderstanding(value);
        if (!result.verified) {
          setVerificationFailed(true);
        }
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePageContent = useCallback(async () => {
    if (pageContentOpen) {
      setPageContentOpen(false);
      return;
    }
    setPageContentOpen(true);
    if (pageContent !== null) return;
    setPageContentLoading(true);
    try {
      const res = await fetch(`/api/page-content/${question.id}`);
      const data = await res.json();
      setPageContent(data.markdown ?? "（本文なし）");
    } catch {
      setPageContent("（取得に失敗しました）");
    } finally {
      setPageContentLoading(false);
    }
  }, [question.id, pageContent, pageContentOpen]);

  const handleNext = () => {
    setRevealed(false);
    setSavedUnderstanding(null);
    setUpdateError(null);
    setVerificationFailed(false);
    setPageContent(null);
    setPageContentOpen(false);
    onNext();
  };

  const handlePrev = () => {
    setRevealed(false);
    setSavedUnderstanding(null);
    setUpdateError(null);
    setVerificationFailed(false);
    setPageContent(null);
    setPageContentOpen(false);
    onPrev();
  };

  const subjectColor = question.subject
    ? SUBJECT_COLORS[question.subject] ?? "bg-gray-100 text-gray-700"
    : "bg-gray-100 text-gray-700";

  const activeOptions =
    understandingOptions.length > 0 ? understandingOptions : FALLBACK_UNDERSTANDING_OPTIONS;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
          {index + 1} / {total}
        </span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* Card header - overflow-hidden on header to clip bg color to rounded corners */}
        <div className={`px-6 py-4 border-b rounded-t-2xl overflow-hidden ${subjectColor}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {question.subject && (
                  <span className="text-xs font-medium">{question.subject}</span>
                )}
                {question.importance && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      IMPORTANCE_BADGE[question.importance] ?? "bg-gray-300 text-gray-700"
                    }`}
                  >
                    重要度: {question.importance}
                  </span>
                )}
                {question.reviewCount > 0 && (
                  <span className="text-xs text-gray-500">復習{question.reviewCount}回</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-800 leading-snug">
                {question.title || "（タイトルなし）"}
              </h2>
            </div>
          </div>
          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {question.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Question content */}
        {question.questionContent && (
          <div className="px-6 py-5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">問題</p>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {question.questionContent}
            </p>
          </div>
        )}

        {/* Answer section */}
        {!revealed ? (
          <div className="px-6 py-8 flex justify-center">
            <button
              onClick={handleReveal}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              答えを見る
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Answer badge */}
            {question.answer && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">正解 / 重要度ランク</p>
                <span
                  className={`inline-flex items-center px-4 py-1.5 rounded-full text-lg font-bold border ${
                    ANSWER_STYLE[question.answer] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {question.answer}
                </span>
              </div>
            )}

            {/* Explanation */}
            {question.geminiAnswer && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">解説</p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {question.geminiAnswer}
                </div>
              </div>
            )}

            {/* Related law */}
            {question.relatedLaw && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">関連法令条文</p>
                <p className="text-sm text-gray-600">{question.relatedLaw}</p>
              </div>
            )}

            {/* Understanding rating */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                理解度を記録{savedUnderstanding && !updateError && " ✓"}
              </p>
              {updateError ? (
                <div className="text-sm text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2">
                  記録に失敗しました: {updateError}
                </div>
              ) : savedUnderstanding ? (
                <div className={`text-sm font-medium ${verificationFailed ? "text-orange-600" : "text-green-600"}`}>
                  「{savedUnderstanding}」を記録しました
                  {verificationFailed && (
                    <span className="ml-2 text-xs text-orange-500">
                      ※ Notionで確認できませんでした。再度お試しください。
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeOptions.map((opt, i) => (
                    <button
                      key={opt}
                      onClick={() => handleUnderstanding(opt)}
                      disabled={updating}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        UNDERSTANDING_BUTTON_COLORS[i % UNDERSTANDING_BUTTON_COLORS.length]
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Page body content toggle */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={handleTogglePageContent}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <span className={`transition-transform duration-200 ${pageContentOpen ? "rotate-90" : ""}`}>▶</span>
                {pageContentOpen ? "Notionページ本文を閉じる" : "Notionページ本文を見る"}
              </button>

              {pageContentOpen && (
                <div className="mt-3 bg-gray-50 rounded-xl p-4 text-sm text-gray-700 overflow-x-auto">
                  {pageContentLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                      読み込み中...
                    </div>
                  ) : pageContent ? (
                    <>
                      <details className="mb-2 text-xs text-gray-400">
                        <summary>🔍 デバッグ（クリックで展開）</summary>
                        <pre className="bg-gray-100 p-2 mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all">{pageContent.slice(0, 600)}</pre>
                      </details>
                      <div className="notion-content text-sm text-gray-700 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                          remarkRehypeOptions={{ allowDangerousHtml: true }}
                        >
                          {pageContent}
                        </ReactMarkdown>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <button
          onClick={handlePrev}
          disabled={index === 0}
          className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← 前へ
        </button>
        <button
          onClick={handleNext}
          disabled={index === total - 1}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}
