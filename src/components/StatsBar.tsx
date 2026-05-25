"use client";

import type { QuizQuestion } from "@/types";

const UNDERSTANDING_ORDER = [
  "完全に理解",
  "まあまあ理解",
  "部分的に理解",
  "不明点あり",
  "要復習",
];

const UNDERSTANDING_COLORS: Record<string, string> = {
  完全に理解: "bg-green-500",
  まあまあ理解: "bg-blue-400",
  部分的に理解: "bg-yellow-400",
  不明点あり: "bg-orange-400",
  要復習: "bg-red-500",
};

interface Props {
  questions: QuizQuestion[];
}

export function StatsBar({ questions }: Props) {
  if (questions.length === 0) return null;

  const counts: Record<string, number> = {};
  let noRating = 0;
  for (const q of questions) {
    if (q.understanding) {
      counts[q.understanding] = (counts[q.understanding] ?? 0) + 1;
    } else {
      noRating++;
    }
  }

  const total = questions.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 text-sm">理解度分布</h2>
        <span className="text-xs text-gray-400">{total}問</span>
      </div>
      <div className="flex rounded-full overflow-hidden h-3 gap-px">
        {UNDERSTANDING_ORDER.map((u) => {
          const count = counts[u] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={u}
              className={`${UNDERSTANDING_COLORS[u]} transition-all`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${u}: ${count}問`}
            />
          );
        })}
        {noRating > 0 && (
          <div
            className="bg-gray-200"
            style={{ width: `${(noRating / total) * 100}%` }}
            title={`未評価: ${noRating}問`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {UNDERSTANDING_ORDER.map((u) => {
          const count = counts[u] ?? 0;
          if (count === 0) return null;
          return (
            <div key={u} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${UNDERSTANDING_COLORS[u]}`} />
              <span className="text-xs text-gray-600">
                {u}: {count}
              </span>
            </div>
          );
        })}
        {noRating > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <span className="text-xs text-gray-600">未評価: {noRating}</span>
          </div>
        )}
      </div>
    </div>
  );
}
