import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'

// 兩類資料（跟邏輯回歸那課同款風格），用來對比「畫邊界」vs「學分布再生成」。
const CLASS_A = [
  { x: 0.24, y: 0.32 }, { x: 0.3, y: 0.26 }, { x: 0.2, y: 0.42 },
  { x: 0.34, y: 0.38 }, { x: 0.28, y: 0.5 }, { x: 0.18, y: 0.28 },
]
const CLASS_B = [
  { x: 0.7, y: 0.68 }, { x: 0.78, y: 0.6 }, { x: 0.64, y: 0.76 },
  { x: 0.8, y: 0.72 }, { x: 0.66, y: 0.58 }, { x: 0.74, y: 0.5 },
]

function mean(pts: { x: number; y: number }[]) {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  }
}
function std(pts: { x: number; y: number }[], m: { x: number; y: number }) {
  return {
    x: Math.sqrt(pts.reduce((s, p) => s + (p.x - m.x) ** 2, 0) / pts.length),
    y: Math.sqrt(pts.reduce((s, p) => s + (p.y - m.y) ** 2, 0) / pts.length),
  }
}
const meanA = mean(CLASS_A), stdA = std(CLASS_A, meanA)
const meanB = mean(CLASS_B), stdB = std(CLASS_B, meanB)

function gaussianSample(m: { x: number; y: number }, s: { x: number; y: number }) {
  const g = () => {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  return { x: m.x + g() * s.x, y: m.y + g() * s.y }
}

const S = 340
const PAD = 24
const sx = linearScale([0, 1], [PAD, S - PAD])
const sy = linearScale([0, 1], [S - PAD, PAD])

type Mode = 'discriminative' | 'generative'

export function GenerativeVsDiscriminative() {
  const [mode, setMode] = useState<Mode>('discriminative')
  const [samples, setSamples] = useState<{ x: number; y: number; c: 'A' | 'B' }[]>([])

  // 判別式：兩群中心連線的垂直平分線
  const mid = { x: (meanA.x + meanB.x) / 2, y: (meanA.y + meanB.y) / 2 }
  const dir = { x: meanB.x - meanA.x, y: meanB.y - meanA.y }
  const perp = { x: -dir.y, y: dir.x }
  const len = Math.hypot(perp.x, perp.y) || 1
  const ux = perp.x / len, uy = perp.y / len
  const lineA = { x: mid.x - ux * 0.6, y: mid.y - uy * 0.6 }
  const lineB = { x: mid.x + ux * 0.6, y: mid.y + uy * 0.6 }

  function generateNew() {
    const fromA = Math.random() < 0.5
    const p = gaussianSample(fromA ? meanA : meanB, fromA ? stdA : stdB)
    setSamples((prev) => [...prev, { ...p, c: fromA ? 'A' : 'B' }])
  }
  function clearSamples() {
    setSamples([])
  }

  const ellipse = (m: { x: number; y: number }, s: { x: number; y: number }, color: string) => (
    <ellipse
      cx={sx(m.x)} cy={sy(m.y)}
      rx={s.x * (S - 2 * PAD)} ry={s.y * (S - 2 * PAD)}
      fill={color} opacity={0.12} stroke={color} strokeWidth={1.5} strokeDasharray="4 3"
    />
  )

  return (
    <LessonLayout slug="generative-vs-discriminative">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        AI 模型大致分成兩個典範。<b className="text-brand">判別式模型</b>
        （前面學的邏輯回歸、SVM、決策樹都是）只想學會<b className="text-ink">「怎麼分類」</b>——
        畫一條邊界，兩邊各是誰。<b className="text-brand">生成式模型</b>
        （像 ChatGPT、Midjourney）野心更大：它要學會<b className="text-ink">資料背後的整個分布</b>，
        學會之後甚至能<b className="text-ink">生出全新的、以假亂真的樣本</b>。
      </div>

      <Section
        title="同一組資料，兩種截然不同的目標"
        description="切換模式看差別：判別式只在乎「邊界在哪」；生成式會先估計每一群的整體形狀（虛線橢圓），然後真的能『無中生有』畫出新的點。"
      >
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
            {mode === 'discriminative' && (
              <line x1={sx(lineA.x)} y1={sy(lineA.y)} x2={sx(lineB.x)} y2={sy(lineB.y)} stroke="var(--color-ink)" strokeWidth={2.5} />
            )}
            {mode === 'generative' && (
              <>
                {ellipse(meanA, stdA, 'var(--color-brand)')}
                {ellipse(meanB, stdB, 'var(--color-red)')}
              </>
            )}

            {CLASS_A.map((p, i) => (
              <circle key={`a${i}`} cx={sx(p.x)} cy={sy(p.y)} r={6} fill="var(--color-brand)" stroke="#fff" strokeWidth={1.5} />
            ))}
            {CLASS_B.map((p, i) => (
              <circle key={`b${i}`} cx={sx(p.x)} cy={sy(p.y)} r={6} fill="var(--color-red)" stroke="#fff" strokeWidth={1.5} />
            ))}

            {mode === 'generative' && samples.map((p, i) => (
              <circle key={`s${i}`} cx={sx(p.x)} cy={sy(p.y)} r={7} fill="none" stroke={p.c === 'A' ? 'var(--color-brand)' : 'var(--color-red)'} strokeWidth={2.5} strokeDasharray="2 2">
                <animate attributeName="r" from={2} to={7} dur="0.3s" fill="freeze" />
              </circle>
            ))}
          </svg>

          <div className="flex flex-col gap-4">
            <SegmentedControl
              fill
              value={mode}
              onChange={(m) => { setMode(m); clearSamples() }}
              segments={[
                { value: 'discriminative', label: '判別式', icon: '📏' },
                { value: 'generative', label: '生成式', icon: '✨' },
              ]}
            />

            {mode === 'discriminative' ? (
              <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
                模型只學到<b className="text-ink">一條線</b>。給它一個新座標，
                它能告訴你「在哪一側」，但<b className="text-ink">沒辦法自己生出新的資料點</b>——
                它壓根不知道每一類「長什麼樣子」，只知道邊界在哪。
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
                  模型學到的是<b className="text-ink">每一群資料的整體分布</b>
                  （虛線橢圓：中心在哪、範圍多大）。因為真的理解了分布長什麼樣，
                  它可以從這個分布<b className="text-brand">「抽樣」出全新的點</b>——
                  這些點原本不存在，但長得很像同一群的成員。
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={generateNew}>✨ 生成一個新樣本</Button>
                  <Button variant="ghost" onClick={clearSamples}>清空</Button>
                </div>
                {samples.length > 0 && (
                  <p className="text-xs text-muted">
                    虛線圈起來的{samples.length}個點，都是模型<b className="text-ink">憑空生出來的</b>，不是原始資料。
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">這就是生成式 AI 的核心能力：</b>{' '}
        ChatGPT 學到的是「人類文字的分布」，所以能生出全新的句子；
        Midjourney 學到的是「圖片的分布」，所以能畫出沒人畫過的畫面。
        接下來幾課，我們會拆解語言模型怎麼一步步學會、並利用這種「分布」來生成文字。
      </div>
    </LessonLayout>
  )
}
