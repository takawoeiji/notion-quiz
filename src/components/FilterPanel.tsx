"use client";

import type { Filters, Importance } from "@/types";

const IMPORTANCES: Array<Importance | "全て"> = ["全て", "高", "中", "低"];

const UNDERSTANDINGS_DEFAULT = [
  "全て",
  "要復習",
  "要暗記",
  "部分的に理解",
  "まあまあ理解",
  "完全に理解",
];

const SUBJECT_COLORS: Record<string, string> = {
  全て: "bg-gray-200 text-gray-700",
  労働基準法: "bg-red-100 text-red-700",
  労働安全衛生法: "bg-orange-100 text-orange-700",
  労働者災害補償保険法: "bg-yellow-100 text-yellow-700",
  雇用保険法: "bg-green-100 text-green-700",
  労働保険徴収法: "bg-teal-100 text-teal-700",
  健康保険法: "bg-blue-100 text-blue-700",
  国民年金法: "bg-purple-100 text-purple-700",
  厚生年金保険法: "bg-pink-100 text-pink-700",
  一般常識: "bg-gray-100 text-gray-700",
};

const UNDERSTANDING_COLORS: Record<string, string> = {
  全て: "bg-gray-200 text-gray-700",
  完全に理解: "bg-green-100 text-green-700",
  まあまあ理解: "bg-blue-100 text-blue-700",
  部分的に理解: "bg-yellow-100 text-yellow-700",
  不明点あり: "bg-orange-100 text-orange-700",
  要暗記: "bg-purple-100 text-purple-700",
  要復習: "bg-red-100 text-red-700",
};

const SUBJECT_COLOR_FALLBACKS = [
  "bg-indigo-100 text-indigo-700",
  "bg-cyan-100 text-cyan-700",
  "bg-lime-100 text-lime-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  total: number;
  filtered: number;
  subjects: string[];
  understandings: string[];
}

export function FilterPanel({ filters, onChange, total, filtered, subjects, understandings }: Props) {
  const subjectList: string[] = ["全て", ...subjects];
  const understandingList: string[] = [
    "全て",
    ...(understandings.length > 0 ? understandings : UNDERSTANDINGS_DEFAULT.filter((u) => u !== "全て")),
  ];

  const getSubjectColor = (s: string, idx: number) =>
    SUBJECT_COLORS[s] ?? SUBJECT_COLOR_FALLBACKS[idx % SUBJECT_COLOR_FALLBACKS.length];

  const getUnderstandingColor = (u: string) =>
    UNDERSTANDING_COLORS[u] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 text-sm">フィルター</h2>
        <span className="text-xs text-gray-500">
          {filtered} / {total} 問
        </span>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">科目</p>
        <div className="flex flex-wrap gap-1.5">
          {subjectList.map((s, idx) => (
            <button
              key={s}
              onClick={() => onChange({ ...filters, subject: s })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                filters.subject === s
                  ? `${getSubjectColor(s, idx - 1)} ring-2 ring-offset-1 ring-current`
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">重要度</p>
        <div className="flex gap-1.5">
          {IMPORTANCES.map((i) => (
            <button
              key={i}
              onClick={() => onChange({ ...filters, importance: i })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filters.importance === i
                  ? i === "高"
                    ? "bg-red-500 text-white ring-2 ring-offset-1 ring-red-400"
                    : i === "中"
                    ? "bg-yellow-500 text-white ring-2 ring-offset-1 ring-yellow-400"
                    : i === "低"
                    ? "bg-blue-400 text-white ring-2 ring-offset-1 ring-blue-300"
                    : "bg-gray-700 text-white ring-2 ring-offset-1 ring-gray-500"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">理解度</p>
        <div className="flex flex-wrap gap-1.5">
          {understandingList.map((u) => (
            <button
              key={u}
              onClick={() => onChange({ ...filters, understanding: u })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                filters.understanding === u
                  ? `${getUnderstandingColor(u)} ring-2 ring-offset-1 ring-current`
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
