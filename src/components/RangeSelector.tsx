"use client";

export const RANGE_SIZE = 100;

interface Props {
  /** フィルタ適用後の問題数 */
  total: number;
  /** 選択中の範囲の開始インデックス。null は全範囲 */
  rangeStart: number | null;
  onChange: (start: number | null) => void;
  /** シャッフル中は通し番号が意味を持たないためラベルを変える */
  shuffled: boolean;
}

export function RangeSelector({ total, rangeStart, onChange, shuffled }: Props) {
  // 1ページ分に収まるならセレクタ自体が不要
  if (total <= RANGE_SIZE) return null;

  const starts: number[] = [];
  for (let s = 0; s < total; s += RANGE_SIZE) starts.push(s);

  const chipClass = (selected: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
      selected
        ? "bg-indigo-100 text-indigo-700 ring-2 ring-offset-1 ring-current"
        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
    }`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 text-sm">学習範囲</h2>
        <span className="text-xs text-gray-500">
          {shuffled ? "ランダム順" : "出題順"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onChange(null)} className={chipClass(rangeStart === null)}>
          全て（{total}問）
        </button>
        {starts.map((s, i) => {
          const end = Math.min(s + RANGE_SIZE, total);
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              className={chipClass(rangeStart === s)}
            >
              {shuffled ? `${i + 1}組目（${end - s}問）` : `${s + 1}〜${end}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
