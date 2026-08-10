import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'

// 座標刻意設計過：king - man + woman 剛好精準落在 queen 上，
// 用來示範詞嵌入最經典的「向量算術」魔法。
// 另外放兩群無關的詞（動物、水果），示範「意思相近的詞會自動聚在一起」。
interface Word { label: string; x: number; y: number; group: 'gender' | 'animal' | 'fruit' }
const WORDS: Word[] = [
  { label: '男人', x: 0.25, y: 0.32, group: 'gender' },
  { label: '女人', x: 0.25, y: 0.62, group: 'gender' },
  { label: '國王', x: 0.62, y: 0.32, group: 'gender' },
  { label: '皇后', x: 0.62, y: 0.62, group: 'gender' },
  { label: '狗', x: 0.15, y: 0.88, group: 'animal' },
  { label: '貓', x: 0.22, y: 0.9, group: 'animal' },
  { label: '小狗', x: 0.1, y: 0.94, group: 'animal' },
  { label: '小貓', x: 0.18, y: 0.96, group: 'animal' },
  { label: '蘋果', x: 0.85, y: 0.85, group: 'fruit' },
  { label: '香蕉', x: 0.9, y: 0.9, group: 'fruit' },
  { label: '橘子', x: 0.87, y: 0.94, group: 'fruit' },
]
const COLOR: Record<Word['group'], string> = {
  gender: 'var(--color-brand)',
  animal: 'var(--color-orange)',
  fruit: 'var(--color-teal)',
}

const S = 380
const PAD = 30
const sx = linearScale([0, 1], [PAD, S - PAD])
const sy = linearScale([0, 1], [S - PAD, PAD])

function dist(a: Word, b: Word) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function Embeddings() {
  const [selected, setSelected] = useState<string | null>(null)
  const [showMath, setShowMath] = useState(false)

  const sel = WORDS.find((w) => w.label === selected)
  const neighbors = sel
    ? [...WORDS].filter((w) => w.label !== sel.label).sort((a, b) => dist(sel, a) - dist(sel, b)).slice(0, 3)
    : []

  // 向量算術：king − man + woman
  const king = WORDS.find((w) => w.label === '國王')!
  const man = WORDS.find((w) => w.label === '男人')!
  const woman = WORDS.find((w) => w.label === '女人')!
  const resultPoint = { x: king.x - man.x + woman.x, y: king.y - man.y + woman.y }

  return (
    <LessonLayout slug="embeddings">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        語言模型不會把文字當成單純的符號，而是把每個詞轉換成一個
        <b className="text-brand">向量（一串數字）</b>，放進一個高維空間裡——
        這個空間有個神奇特性：<b className="text-ink">意思相近的詞，位置也會靠得很近</b>。
        我們把它畫成 2D 地圖來體會這個概念。
      </div>

      <Section
        title="點一個詞，看誰跟它最像"
        description="這張地圖上，同類的詞（動物、水果）會自動聚在一起，即使沒有人告訴模型「這是動物」。點任何一個詞看看它的最近鄰居。"
      >
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
            {sel && neighbors.map((n, i) => (
              <line key={i} x1={sx(sel.x)} y1={sy(sel.y)} x2={sx(n.x)} y2={sy(n.y)} stroke="var(--color-muted)" strokeWidth={1.5} strokeDasharray="3 3" />
            ))}
            {WORDS.map((w) => {
              const isSel = w.label === selected
              const isNeighbor = neighbors.some((n) => n.label === w.label)
              return (
                <g key={w.label} className="cursor-pointer" onClick={() => setSelected(w.label === selected ? null : w.label)}>
                  <circle cx={sx(w.x)} cy={sy(w.y)} r={isSel ? 10 : isNeighbor ? 8 : 6} fill={COLOR[w.group]} stroke={isSel ? 'var(--color-ink)' : '#fff'} strokeWidth={isSel ? 2.5 : 1.5} />
                  <text x={sx(w.x)} y={sy(w.y) - 14} textAnchor="middle" fontSize={13} fontWeight={isSel ? 700 : 500} fill="var(--color-ink)">{w.label}</text>
                </g>
              )
            })}
          </svg>

          <div className="flex flex-col justify-center gap-3">
            {sel ? (
              <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
                <b className="text-ink">「{sel.label}」</b>最靠近的 3 個詞是：
                <ul className="mt-2 space-y-1">
                  {neighbors.map((n) => (
                    <li key={n.label} className="flex justify-between">
                      <span className="text-ink">{n.label}</span>
                      <span className="font-mono text-xs text-muted">距離 {dist(sel, n).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl bg-cream p-4 text-sm text-muted">點地圖上任何一個詞開始探索。</div>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="更神奇的是：詞向量能「做算術」"
        description="經典例子：拿「國王」的向量，減掉「男人」，再加上「女人」——猜猜看會落在哪裡？"
      >
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
            {WORDS.filter((w) => w.group === 'gender').map((w) => (
              <g key={w.label}>
                <circle cx={sx(w.x)} cy={sy(w.y)} r={7} fill={COLOR.gender} stroke="#fff" strokeWidth={1.5} />
                <text x={sx(w.x)} y={sy(w.y) - 12} textAnchor="middle" fontSize={13} fill="var(--color-ink)">{w.label}</text>
              </g>
            ))}
            {showMath && (
              <>
                <line x1={sx(man.x)} y1={sy(man.y)} x2={sx(king.x)} y2={sy(king.y)} stroke="var(--color-coral)" strokeWidth={2} markerEnd="url(#emArrow)" />
                <line x1={sx(woman.x)} y1={sy(woman.y)} x2={sx(resultPoint.x)} y2={sy(resultPoint.y)} stroke="var(--color-coral)" strokeWidth={2} strokeDasharray="5 3" markerEnd="url(#emArrow)" />
                <circle cx={sx(resultPoint.x)} cy={sy(resultPoint.y)} r={12} fill="none" stroke="var(--color-lime)" strokeWidth={3}>
                  <animate attributeName="r" from={20} to={12} dur="0.5s" fill="freeze" />
                </circle>
                <defs>
                  <marker id="emArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-coral)" />
                  </marker>
                </defs>
              </>
            )}
          </svg>

          <div className="flex flex-col justify-center gap-4">
            <div className="rounded-xl bg-cream p-4 text-center font-mono text-sm text-brand">
              國王 − 男人 + 女人 = ？
            </div>
            <Button onClick={() => setShowMath(true)}>✨ 算算看</Button>
            {showMath && (
              <div className="rounded-xl border border-lime bg-lime/10 p-4 text-sm text-ink">
                結果精準落在<b>「皇后」</b>的位置！{' '}
                意思是：模型從大量文字中，自己學到了「國王之於男人，等於皇后之於女人」這種
                <b>「性別」與「地位」的抽象關係</b>——這些關係不是人工設定的，是資料訓練出來的。
              </div>
            )}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">為什麼這很重要？</b>{' '}
        這說明語言模型不是死記每個詞的定義，而是學到了詞與詞之間<b className="text-ink">豐富的關係結構</b>。
        下一課的<b className="text-brand">注意力機制</b>，就是建立在這種向量表示之上，
        讓模型決定一句話裡「哪些詞該互相參考」。
      </div>
    </LessonLayout>
  )
}
