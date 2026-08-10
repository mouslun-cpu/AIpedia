import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { linearScale } from '../../lib/plot'

// 一張「機器看到的資料表」：每一列是一個水果。
// 甜度、大小 = 特徵（機器用來判斷的線索）；種類 = 標籤（我們要它預測的答案）。
interface Row {
  name: string
  sweet: number // 甜度 0~10
  size: number // 大小(直徑) 0~10
  kind: '蘋果' | '橘子'
}

const DATA: Row[] = [
  { name: '🍎 #1', sweet: 5.0, size: 7.6, kind: '蘋果' },
  { name: '🍎 #2', sweet: 6.2, size: 8.4, kind: '蘋果' },
  { name: '🍎 #3', sweet: 5.6, size: 7.0, kind: '蘋果' },
  { name: '🍎 #4', sweet: 6.8, size: 8.0, kind: '蘋果' },
  { name: '🍊 #5', sweet: 8.2, size: 6.0, kind: '橘子' },
  { name: '🍊 #6', sweet: 9.0, size: 5.4, kind: '橘子' },
  { name: '🍊 #7', sweet: 7.6, size: 6.4, kind: '橘子' },
  { name: '🍊 #8', sweet: 8.6, size: 5.8, kind: '橘子' },
]

const colorOf = (k: Row['kind']) =>
  k === '蘋果' ? 'var(--color-red)' : 'var(--color-orange)'

const S = 320
const PAD = 40
const sx = linearScale([3, 10], [PAD, S - PAD])
const sy = linearScale([4, 10], [S - PAD, PAD])

export function FeaturesLabels() {
  const [selected, setSelected] = useState<number | null>(null)
  const [hideLabel, setHideLabel] = useState(false)

  return (
    <LessonLayout slug="features-labels">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        機器學習的第一步，是把世界變成一張<b className="text-ink">表格</b>。
        表格裡每一橫列是一個「例子」，每一直欄是一種資訊。
        其中，機器拿來判斷的線索叫<b className="text-brand">特徵（feature）</b>，
        我們希望它學會預測的答案叫<b className="text-orange">標籤（label）</b>。
      </div>

      <Section
        title="左邊是資料表，右邊是機器眼中的樣子"
        description="表格的兩個「特徵」欄，其實就是右圖的兩個座標軸；「標籤」欄則決定了點的顏色。點一下任何一列（或任何一個點）看看它們的對應關係。"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* 資料表 */}
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream text-left">
                  <th className="px-3 py-2 font-medium text-muted">水果</th>
                  <th className="px-3 py-2 font-medium text-brand">
                    甜度<span className="ml-1 text-xs">特徵</span>
                  </th>
                  <th className="px-3 py-2 font-medium text-brand">
                    大小<span className="ml-1 text-xs">特徵</span>
                  </th>
                  <th
                    className={`px-3 py-2 font-medium ${
                      hideLabel ? 'text-line' : 'text-orange'
                    }`}
                  >
                    種類<span className="ml-1 text-xs">標籤</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {DATA.map((r, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelected(i === selected ? null : i)}
                    className={`cursor-pointer border-t border-line transition-colors ${
                      selected === i ? 'bg-brand-pale/30' : 'hover:bg-cream'
                    }`}
                  >
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 font-mono">{r.sweet.toFixed(1)}</td>
                    <td className="px-3 py-2 font-mono">{r.size.toFixed(1)}</td>
                    <td className="px-3 py-2">
                      {hideLabel ? (
                        <span className="text-line">■■</span>
                      ) : (
                        <span style={{ color: colorOf(r.kind) }}>{r.kind}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 散點圖 */}
          <div>
            <svg
              viewBox={`0 0 ${S} ${S}`}
              className="w-full rounded-xl border border-line bg-cream"
            >
              {/* 軸線與標籤 */}
              <line x1={PAD} y1={S - PAD} x2={S - PAD} y2={S - PAD} stroke="var(--color-line)" />
              <line x1={PAD} y1={PAD} x2={PAD} y2={S - PAD} stroke="var(--color-line)" />
              <text x={(S) / 2} y={S - 8} textAnchor="middle" fontSize={12} fill="var(--color-brand)">
                甜度（特徵）→
              </text>
              <text
                x={14}
                y={S / 2}
                textAnchor="middle"
                fontSize={12}
                fill="var(--color-brand)"
                transform={`rotate(-90, 14, ${S / 2})`}
              >
                大小（特徵）→
              </text>

              {DATA.map((r, i) => {
                const on = selected === i
                return (
                  <circle
                    key={i}
                    cx={sx(r.sweet)}
                    cy={sy(r.size)}
                    r={on ? 11 : 7.5}
                    fill={hideLabel ? '#B4BEC2' : colorOf(r.kind)}
                    stroke={on ? 'var(--color-ink)' : '#fff'}
                    strokeWidth={on ? 2.5 : 1.5}
                    className="cursor-pointer"
                    style={{ transition: 'r 0.15s, fill 0.3s' }}
                    onClick={() => setSelected(i === selected ? null : i)}
                  />
                )
              })}
            </svg>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={hideLabel}
              onChange={(e) => setHideLabel(e.target.checked)}
            />
            遮住答案，切換到「機器的視角」
          </label>
          {selected !== null && (
            <p className="text-sm text-muted">
              選中的是{' '}
              <b className="text-ink">{DATA[selected].name}</b>：甜度{' '}
              {DATA[selected].sweet.toFixed(1)}、大小{' '}
              {DATA[selected].size.toFixed(1)}
              {!hideLabel && (
                <>
                  ，答案是{' '}
                  <b style={{ color: colorOf(DATA[selected].kind) }}>
                    {DATA[selected].kind}
                  </b>
                </>
              )}
              。
            </p>
          )}
        </div>
      </Section>

      <div className="mt-6 rounded-2xl border border-line bg-cream/60 p-5 text-sm leading-relaxed text-muted">
        {hideLabel ? (
          <p>
            現在你看到的就是<b className="text-ink">機器學習「預測」時的處境</b>：
            只有特徵（灰點的位置），沒有標籤（顏色）。
            它必須根據學過的規律，去猜每個灰點應該是什麼顏色。
          </p>
        ) : (
          <p>
            注意到了嗎？<b className="text-brand">特徵決定「點在哪裡」</b>，
            <b className="text-orange">標籤決定「點是什麼顏色」</b>。
            機器學習做的事，就是找出「位置」和「顏色」之間的規律——
            這正是下一步<b className="text-ink">監督式學習</b>要做的事。
          </p>
        )}
      </div>
    </LessonLayout>
  )
}
