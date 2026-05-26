"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { QuizQuestion, Understanding } from "@/types";

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

const UNDERSTANDING_OPTIONS: Array<{
  value: Understanding;
  label: string;
  color: string;
}> = [
  { value: "要復習", label: "要復習", color: "bg-red-500 hover:bg-red-600 text-white" },
  { value: "不明点あり", label: "不明点あり", color: "bg-orange-400 hover:bg-orange-500 text-white" },
  { value: "部分的に理解", label: "部分的に理解", color: "bg-yellow-400 hover:bg-yellow-500 text-white" },
  { value: "まあまあ理解", label: "まあまあ理解", color: "bg-blue-400 hover:bg-blue-500 text-white" },
  { value: "完全に理解", label: "完全に理解", color: "bg-green-500 hover:bg-green-600 text-white" },
];

interface Props {
  question: QuizQuestion;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onUpdateUnderstanding: (id: string, understanding: Understanding, reviewCount: number) => Promise<void>;
}

export function FlashCard({ question, index, total, onNext, onPrev, onUpdateUnderstanding }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [savedUnderstanding, setSavedUnderstanding] = useState<Understanding | null>(null);
  const [pageContent, setPageContent] = useState<string | null>(null);
  const [pageContentOpen, setPageContentOpen] = useState(false);
  const [pageContentLoading, setPageContentLoading] = useState(false);

  const handleReveal = () => setRevealed(true);

  const handleUnderstanding = async (value: Understanding) => {
    setUpdating(true);
    try {
      await onUpdateUnderstanding(question.id, value, question.reviewCount);
      setSavedUnderstanding(value);
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
    if (pageContent !== null) return; // already fetched
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
    setPageContent(null);
    setPageContentOpen(false);
    onNext();
  };

  const handlePrev = () => {
    setRevealed(false);
    setSavedUnderstanding(null);
    setPageContent(null);
    setPageContentOpen(false);
    onPrev();
  };

  const subjectColor = question.subject
    ? SUBJECT_COLORS[question.subject] ?? "bg-gray-100 text-gray-700"
    : "bg-gray-100 text-gray-700";

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Card header */}
        <div className={`px-6 py-4 border-b ${subjectColor}`}>
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
                理解度を記録{savedUnderstanding && " ✓"}
              </p>
              {savedUnderstanding ? (
                <div className="text-sm text-green-600 font-medium">
                  「{savedUnderstanding}」を記録しました
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {UNDERSTANDING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleUnderstanding(opt.value)}
                      disabled={updating}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${opt.color}`}
                    >
                      {opt.label}
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
                <div className="mt-3 bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                  {pageContentLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                      読み込み中...
                    </div>
                  ) : pageContent ? (
                    <div className="prose prose-sm prose-gray max-w-none
                      prose-headings:font-bold prose-headings:text-gray-800
                      prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
                      prose-p:leading-relaxed prose-p:text-gray-700
                      prose-ul:my-1 prose-li:my-0.5
                      prose-strong:text-gray-800
                      prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-code:text-xs
                      prose-blockquote:border-indigo-300 prose-blockquote:text-gray-600">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {pageContent}
                      </ReactMarkdown>
                    </div>
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
