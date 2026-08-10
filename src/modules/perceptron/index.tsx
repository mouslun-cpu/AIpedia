import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'
import { lineBoxIntersect } from '../svm/svm'

// 情境：校門口的智慧門禁機器人。兩個感應器——🪪學生證、🙂人臉辨識，
// 各自回報 0（沒過）或 1（通過），機器人依照設定的規則決定開不開門。
// AND/OR 是常見的門禁邏輯；XOR 是刻意設計的「怪規則」，用來凸顯單一神經元的極限。
type Gate = 'AND' | 'OR' | 'XOR'
const POINTS: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]]
const LABELS: Record<Gate, number[]> = {
  AND: [0, 0, 0, 1],
  OR: [0, 1, 1, 1],
  XOR: [0, 1, 1, 0],
}
// AND/OR 各自一組能讓感知器 100% 正確的權重
const SOLUTION: Record<'AND' | 'OR', { w1: number; w2: number; b: number }> = {
  AND: { w1: 1, w2: 1, b: -1.5 },
  OR: { w1: 1, w2: 1, b: -0.5 },
}
const GATE_STORY: Record<Gate, { title: string; rule: string }> = {
  AND: { title: '🔒 嚴格模式', rule: '學生證「和」人臉都要通過，兩個都對才開門——防止有人撿到別人的證件混進來。' },
  OR: { title: '🔓 寬鬆模式', rule: '學生證「或」人臉，只要其中一個通過就開門——方便沒帶證件、但刷臉過得了的人。' },
  XOR: { title: '🤔 奇怪模式', rule: '只有「剛好一個」感應器通過時才開門——兩個都過、或兩個都沒過，反而不開！' },
}

const S = 300
const PAD = 40
const sx = linearScale([-0.5, 1.5], [PAD, S - PAD])
const sy = linearScale([-0.5, 1.5], [S - PAD, PAD])

export function Perceptron() {
  const [gate, setGate] = useState<Gate>('AND')
  const [w1, setW1] = useState(0.5)
  const [w2, setW2] = useState(0.5)
  const [b, setB] = useState(-0.2)

  const labels = LABELS[gate]
  const step = (v: number) => (v >= 0 ? 1 : 0)
  const preds = POINTS.map(([x, y]) => step(w1 * x + w2 * y + b))
  const allCorrect = preds.every((p, i) => p === labels[i])

  // 決策線 w1x + w2y + b = 0，取跟繪圖範圍的交點（座標系是 -0.5~1.5，重用 SVM 的求交工具，範圍需對應調整）
  const line = lineBoxIntersect(w1, w2, b)
  // lineBoxIntersect 假設 [0,1] 方框；這裡座標範圍不同，改自己算兩點
  const linePts: [number, number][] = (() => {
    const pts: [number, number][] = []
    const lo = -0.5
    const hi = 1.5
    const push = (x: number, y: number) => {
      if (x >= lo - 1e-6 && x <= hi + 1e-6 && y >= lo - 1e-6 && y <= hi + 1e-6) pts.push([x, y])
    }
    if (Math.abs(w2) > 1e-9) { push(lo, -(w1 * lo + b) / w2); push(hi, -(w1 * hi + b) / w2) }
    if (Math.abs(w1) > 1e-9) { push(-(w2 * lo + b) / w1, lo); push(-(w2 * hi + b) / w1, hi) }
    const uniq: [number, number][] = []
    for (const p of pts) if (!uniq.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-4)) uniq.push(p)
    return uniq.slice(0, 2)
  })()
  void line // 避免未使用警告（保留 import 供未來需要）

  function trySolve() {
    if (gate === 'XOR') return
    const s = SOLUTION[gate]
    setW1(s.w1)
    setW2(s.w2)
    setB(s.b)
  }

  const story = GATE_STORY[gate]

  return (
    <LessonLayout slug="perceptron">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        校門口裝了一台<b className="text-ink">智慧門禁機器人</b>，門上有兩個感應器：
        <b className="text-ink">🪪 學生證</b>、<b className="text-ink">🙂 人臉辨識</b>，各自回報「有沒有通過」（0 或 1）。
        機器人的判斷方式很簡單：把兩個感應結果<b className="text-ink">乘上信任權重加起來</b>、
        再加一個<b className="text-ink">基礎寬鬆度（偏差值）</b>，
        總分<b className="text-ink">≥ 0 就開門，否則不開</b>。這正是神經網路最小的積木——<b className="text-brand">神經元（感知器）</b>。
        公式寫成：<code className="rounded bg-cream px-1.5 py-0.5 font-mono">開門 = step(w₁·學生證 + w₂·人臉 + b)</code>
      </div>

      <Section
        title="調整信任權重，教機器人學會不同的放行規則"
        description="這條線就是機器人的「決策邊界」——線的一側不開門、另一側開門。調整權重和寬鬆度，讓機器人正確判斷所有 4 種感應組合。"
      >
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div>
            <SegmentedControl
              fill
              value={gate}
              onChange={(g) => setGate(g)}
              segments={[
                { value: 'AND', label: 'AND 嚴格' },
                { value: 'OR', label: 'OR 寬鬆' },
                { value: 'XOR', label: 'XOR 怪規則' },
              ]}
            />
            <div className="mt-2 rounded-lg bg-cream p-2.5 text-xs leading-relaxed text-muted">
              <b className="text-ink">{story.title}：</b>{story.rule}
            </div>
            <svg viewBox={`0 0 ${S} ${S}`} className="mt-3 w-full rounded-xl border border-line bg-cream">
              <line x1={sx(-0.5)} y1={sy(0)} x2={sx(1.5)} y2={sy(0)} stroke="var(--color-line)" />
              <line x1={sx(0)} y1={sy(-0.5)} x2={sx(0)} y2={sy(1.5)} stroke="var(--color-line)" />
              <text x={sx(1.5) - 6} y={sy(0) - 8} textAnchor="end" fontSize={10} fill="var(--color-muted)">🪪 學生證 →</text>
              <text x={sx(0) + 8} y={sy(1.5) + 12} fontSize={10} fill="var(--color-muted)">🙂 人臉 →</text>
              {linePts.length === 2 && (
                <line x1={sx(linePts[0][0])} y1={sy(linePts[0][1])} x2={sx(linePts[1][0])} y2={sy(linePts[1][1])} stroke="var(--color-ink)" strokeWidth={2.5} />
              )}
              {POINTS.map(([x, y], i) => {
                const correct = preds[i] === labels[i]
                return (
                  <g key={i}>
                    <circle cx={sx(x)} cy={sy(y)} r={17} fill={labels[i] ? 'var(--color-brand)' : 'var(--color-red)'} stroke={correct ? 'var(--color-lime)' : 'var(--color-coral)'} strokeWidth={4}>
                      <title>{`學生證${x ? '✓' : '✗'}／人臉${y ? '✓' : '✗'} → 正確答案：${labels[i] ? '🔓開門' : '🔒不開'}`}</title>
                    </circle>
                    <text x={sx(x)} y={sy(y) + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">{labels[i] ? '🔓' : '🔒'}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <Slider label="🪪 學生證的信任權重 w₁" min={-2} max={2} step={0.05} value={w1} onChange={setW1} format={(v) => v.toFixed(2)} />
            <Slider label="🙂 人臉辨識的信任權重 w₂" min={-2} max={2} step={0.05} value={w2} onChange={setW2} format={(v) => v.toFixed(2)} />
            <Slider label="🔧 基礎寬鬆度 b（門檻高低）" min={-2} max={2} step={0.05} value={b} onChange={setB} format={(v) => v.toFixed(2)} />

            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: allCorrect ? 'var(--color-lime)' : 'var(--color-line)',
                background: allCorrect ? 'color-mix(in srgb, var(--color-lime) 14%, white)' : 'var(--color-cream)',
              }}
            >
              {allCorrect ? (
                <p className="text-sm font-medium text-ink">✅ 全部正確！機器人學會了「{story.title}」的放行規則。</p>
              ) : (
                <p className="text-sm text-muted">
                  綠框代表判斷正確、紅框代表判斷錯誤。目前 {preds.filter((p, i) => p === labels[i]).length} / 4 正確。
                </p>
              )}
            </div>

            <Button variant="outline" onClick={trySolve} disabled={gate === 'XOR'}>
              ✨ 自動找答案
            </Button>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">切到「XOR 怪規則」試試看：</b>{' '}
        不管怎麼調權重，<b className="text-ink">永遠找不到一條線</b>能把這條規則的答案分對——
        因為「剛好一個通過」的組合（左上、右下）跟「都通過或都沒過」的組合（左下、右上）交叉散佈，沒辦法用一刀切開。
        這不是憑空想像的規則：家裡<b className="text-ink">樓梯間的雙切換開關</b>就是活生生的例子——
        兩顆開關控制同一盞燈，只有<b className="text-ink">兩顆開關狀態不同時燈才會亮</b>，這正是 XOR。
        這是 1969 年一個很有名的發現，曾經讓神經網路研究停滯多年。
        解法是<b className="text-brand">疊多層神經元</b>——這正是下一個知識點「前向傳播」要介紹的。
      </div>
    </LessonLayout>
  )
}
