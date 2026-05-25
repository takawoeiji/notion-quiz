"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { QuizQuestion, Filters, Understanding } from "@/types";
import { FilterPanel } from "@/components/FilterPanel";
import { FlashCard } from "@/components/FlashCard";
import { StatsBar } from "@/components/StatsBar";

const DEFAULT_FILTERS: Filters = {
  subject: "全て",
  importance: "全て",
  understanding: "全て",
};

export default function Home() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setQuestions(data);
        } else {
          setError("データの取得に失敗しました。APIトークンを確認してください。");
        }
      })
      .catch(() => setError("サーバーに接続できません。"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filters.subject !== "全て" && q.subject !== filters.subject) return false;
      if (filters.importance !== "全て" && q.importance !== filters.importance) return false;
      if (filters.understanding !== "全て" && q.understanding !== filters.understanding) return false;
      return true;
    });
  }, [questions, filters]);

  const orderedFiltered = useMemo(() => {
    if (!shuffle || shuffleOrder.length === 0) return filtered;
    return shuffleOrder.map((i) => filtered[i]).filter(Boolean);
  }, [filtered, shuffle, shuffleOrder]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentIndex(0);
    setShuffle(false);
    setShuffleOrder([]);
  }, []);

  const handleShuffle = () => {
    const order = Array.from({ length: filtered.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setShuffleOrder(order);
    setShuffle(true);
    setCurrentIndex(0);
  };

  const handleUnshuffle = () => {
    setShuffle(false);
    setShuffleOrder([]);
    setCurrentIndex(0);
  };

  const handleUpdateUnderstanding = async (
    id: string,
    understanding: Understanding,
    reviewCount: number
  ) => {
    await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: id, understanding, reviewCount }),
    });
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, understanding, reviewCount: reviewCount + 1 }
          : q
      )
    );
  };

  const currentQuestion = orderedFiltered[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Notionからデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-bold text-gray-800">接続エラー</h2>
          <p className="text-gray-600 text-sm">{error}</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2">
            <p className="font-semibold text-gray-700">設定手順：</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Notion → 設定 → 接続先 でインテグレーションを作成</li>
              <li>トークンをコピー</li>
              <li><code className="bg-gray-200 px-1 rounded">.env.local</code> の <code className="bg-gray-200 px-1 rounded">NOTION_TOKEN</code> に貼り付け</li>
              <li>データベースページでインテグレーションを接続</li>
              <li>サーバーを再起動: <code className="bg-gray-200 px-1 rounded">npm run dev</code></li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">社労士試験 問題集</h1>
            <p className="text-xs text-gray-400 mt-0.5">フラッシュカード学習</p>
          </div>
          <button
            onClick={shuffle ? handleUnshuffle : handleShuffle}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              shuffle
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {shuffle ? "🔀 シャッフル中" : "🔀 シャッフル"}
          </button>
        </div>

        {/* Stats */}
        <StatsBar questions={questions} />

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          total={questions.length}
          filtered={filtered.length}
        />

        {/* Quiz */}
        {orderedFiltered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm">条件に合う問題がありません</p>
          </div>
        ) : currentQuestion ? (
          <FlashCard
            key={currentQuestion.id + currentIndex}
            question={currentQuestion}
            index={currentIndex}
            total={orderedFiltered.length}
            onNext={() => setCurrentIndex((i) => Math.min(i + 1, orderedFiltered.length - 1))}
            onPrev={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
            onUpdateUnderstanding={handleUpdateUnderstanding}
          />
        ) : null}
      </div>
    </div>
  );
}
