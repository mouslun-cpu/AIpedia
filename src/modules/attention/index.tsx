import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'

// 經典範例（改編自 Transformer 論文常用的例句）：
// 「動物 沒有 過馬路 因為 牠 太累了」——重點是「牠」該連到「動物」，而不是別的字。
// 這組權重是手排的示範值，用來呈現真實注意力機制學到的效果。
const TOKENS = ['動物', '沒有', '過馬路', '因為', '牠', '太累了']
const ATTENTION: number[][] = [
  [0.40, 0.10, 0.25, 0.05, 0.10, 0.10],
  [0.15, 0.35, 0.25, 0.05, 0.05, 0.15],
  [0.30, 0.20, 0.30, 0.05, 0.05, 0.10],
  [0.10, 0.05, 0.10, 0.35, 0.20, 0.20],
  [0.55, 0.05, 0.05, 0.05, 0.20, 0.10],
  [0.10, 0.05, 0.05, 0.15, 0.35, 0.30],
]

const CW = 560
const TOP_Y = 60
const GAP = CW / (TOKENS.length + 1)
const xOf = (i: number) => GAP * (i + 1)

export function Attention() {
  const [sel, setSel] = useState(4) // 預設點「牠」，直接呈現關鍵效果

  const weights = ATTENTION[sel]
  const maxW = Math.max(...weights)

  return (
    <LessonLayout slug="attention">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        句子裡的代名詞常常很模糊——<b className="text-ink">「牠」到底指誰？</b>{' '}
        人類靠上下文一眼就懂，但模型得算出來。
        <b className="text-brand">自注意力機制</b>讓每個字都去看「這句話裡所有其他字」，
        算出一組<b className="text-ink">該多重視誰</b>的權重——這就是 Transformer 的核心引擎。
      </div>

      <Section
        title="點一個字，看它最在乎誰"
        description={`句子：「${TOKENS.join('')}」。點下面任何一個字，線條粗細代表它對其他每個字的「注意力權重」。試試點「牠」！`}
      >
        <svg viewBox={`0 0 ${CW} 160`} className="w-full rounded-xl border border-line bg-cream">
          {TOKENS.map((_, j) => (
            <line
              key={j}
              x1={xOf(sel)} y1={TOP_Y + 14}
              x2={xOf(j)} y2={TOP_Y + 14}
              stroke="var(--color-brand)"
              strokeWidth={Math.max(0.5, (weights[j] / maxW) * 10)}
              opacity={j === sel ? 0.25 : 0.6 + (weights[j] / maxW) * 0.4}
            />
          ))}
          {TOKENS.map((t, i) => (
            <g key={i} className="cursor-pointer" onClick={() => setSel(i)}>
              <rect x={xOf(i) - 26} y={TOP_Y} width={52} height={28} rx={8} fill={i === sel ? 'var(--color-brand)' : '#fff'} stroke="var(--color-brand)" strokeWidth={1.5} />
              <text x={xOf(i)} y={TOP_Y + 19} textAnchor="middle" fontSize={14} fontWeight={600} fill={i === sel ? '#fff' : 'var(--color-ink)'}>{t}</text>
            </g>
          ))}
        </svg>

        <div className="mt-5">
          <div className="mb-2 text-sm text-muted">「{TOKENS[sel]}」對每個字的注意力權重：</div>
          <div className="flex flex-col gap-1.5">
            {TOKENS.map((t, j) => (
              <div key={j} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-sm text-ink">{t}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${weights[j] * 100}%`,
                      background: j === sel ? 'var(--color-muted)' : 'var(--color-brand)',
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-xs text-muted">{(weights[j] * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {sel === 4 && (
          <div className="mt-5 rounded-xl border border-lime bg-lime/10 p-4 text-sm text-ink">
            ✅ 注意到了嗎？「牠」把最高的注意力（55%）給了「<b>動物</b>」，而不是句子裡其他字。
            這就是模型正確理解了「牠 = 動物」——這種<b>指代消解</b>的能力，
            正是自注意力機制的招牌絕活。
          </div>
        )}
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">重點：</b>{' '}
        這些權重不是人工設定的規則，而是模型看過大量文字後<b className="text-ink">自己學出來的</b>。
        而且每個字都同時對句子裡<b className="text-ink">所有字</b>做這樣的計算（不是只看前一個字），
        這讓 Transformer 能同時掌握長距離的關聯——這也是它取代早期逐字處理模型的關鍵原因。
      </div>
    </LessonLayout>
  )
}
