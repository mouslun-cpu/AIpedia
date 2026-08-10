import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'

const step = (v: number) => (v >= 0 ? 1 : 0)

// 情境：延續上一課的門禁機器人。單一顆神經元學不會 XOR（怪規則：剛好一個感應器通過才開門），
// 解法是找兩位「初審員」接力把關，再讓「最終決策官」綜合兩人的意見：
// 審核員甲 = OR(x1,x2)：兩個感應器只要有一個通過，就先初步喊「有機會」
// 審核員乙 = NAND(x1,x2)：只要不是兩個都通過，也先喊「有機會」（防止兩個都過的可疑狀況）
// 決策官 = AND(甲,乙)：兩位都說「有機會」，才真的開門 —— 這正好等於 XOR
const W = {
  h1: { w1: 1, w2: 1, b: -0.5 }, // OR
  h2: { w1: -1, w2: -1, b: 1.5 }, // NAND
  o: { w1: 1, w2: 1, b: -1.5 }, // AND
}

const POS = {
  x1: [60, 80], x2: [60, 220],
  h1: [250, 55], h2: [250, 245],
  o: [430, 150],
}

function Node({
  id, value, label, active, emoji,
}: { id: keyof typeof POS; value: number | null; label: string; active: boolean; emoji?: string }) {
  const [x, y] = POS[id]
  return (
    <g style={{ transition: 'all 0.3s' }}>
      <circle cx={x} cy={y} r={28} fill={active ? 'var(--color-brand)' : '#fff'} stroke="var(--color-brand)" strokeWidth={2.5} style={{ transition: 'fill 0.3s' }} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={16} fontWeight={700} fill={active ? '#fff' : 'var(--color-ink)'}>
        {value === null ? (emoji ?? '?') : value === 1 ? '✅' : '❌'}
      </text>
      <text x={x} y={y + 46} textAnchor="middle" fontSize={11} fill="var(--color-muted)">{label}</text>
    </g>
  )
}

function Edge({ from, to, w, active }: { from: keyof typeof POS; to: keyof typeof POS; w: number; active: boolean }) {
  const [x1, y1] = POS[from]
  const [x2, y2] = POS[to]
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? 'var(--color-orange)' : 'var(--color-line)'} strokeWidth={active ? 2.5 : 1.5} style={{ transition: 'all 0.3s' }} />
      <rect x={mx - 14} y={my - 10} width={28} height={16} fill="#fff" opacity={0.9} />
      <text x={mx} y={my + 3} textAnchor="middle" fontSize={11} fontFamily="monospace" fill="var(--color-muted)">{w}</text>
    </g>
  )
}

export function ForwardPass() {
  const [x1, setX1] = useState(0)
  const [x2, setX2] = useState(1)
  const [stage, setStage] = useState(0) // 0=只有輸入 1=算完隱藏層 2=算完輸出

  const h1in = W.h1.w1 * x1 + W.h1.w2 * x2 + W.h1.b
  const h2in = W.h2.w1 * x1 + W.h2.w2 * x2 + W.h2.b
  const h1 = step(h1in)
  const h2 = step(h2in)
  const oin = W.o.w1 * h1 + W.o.w2 * h2 + W.o.b
  const out = step(oin)

  function setInput(a: number, b: number) {
    setX1(a)
    setX2(b)
    setStage(0)
  }

  const STAGE_TEXT = [
    '學生證與人臉的感應結果已經給定，按「下一步」讓訊號往前傳給兩位審核員。',
    `兩位審核員都給出初步意見了：審核員甲（OR）= step(${x1}×1 + ${x2}×1 − 0.5) = ${h1 ? '✅有機會' : '❌沒機會'}；審核員乙（NAND）= step(${x1}×(−1) + ${x2}×(−1) + 1.5) = ${h2 ? '✅有機會' : '❌沒機會'}`,
    `決策官綜合兩人意見：開門 = step(甲${h1} + 乙${h2} − 1.5) = ${out ? '🔓 開門' : '🔒 不開'}`,
  ]

  return (
    <LessonLayout slug="forward-pass">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        上一課發現：單一顆神經元（一位審核員）學不會「剛好一個感應器通過才開門」這種 XOR 怪規則。
        解法是<b className="text-brand">多找幾位審核員接力把關</b>：先讓兩位<b className="text-ink">審核員</b>各自看過學生證和人臉，
        給出初步意見，再讓一位<b className="text-ink">最終決策官</b>綜合兩人的意見做出開門與否的判斷。
        訊號像接力賽一樣，一層一層往前傳遞——這個過程就叫<b className="text-brand">前向傳播</b>。
      </div>

      <Section
        title="按「下一步」看訊號一層層往前算"
        description="審核員甲的原則是「只要有一個通過，就先喊有機會」（OR）；審核員乙的原則正好相反——「只要不是兩個都通過，也喊有機會」（NAND，专門攔住兩個都過的可疑狀況）。決策官的原則很嚴格：兩位都喊有機會，才真的開門。切換左邊的感應組合，一步步看訊號怎麼傳到最終決定。"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <svg viewBox="0 0 480 300" className="w-full rounded-xl border border-line bg-cream">
            <Edge from="x1" to="h1" w={W.h1.w1} active={stage >= 1} />
            <Edge from="x1" to="h2" w={W.h2.w1} active={stage >= 1} />
            <Edge from="x2" to="h1" w={W.h1.w2} active={stage >= 1} />
            <Edge from="x2" to="h2" w={W.h2.w2} active={stage >= 1} />
            <Edge from="h1" to="o" w={W.o.w1} active={stage >= 2} />
            <Edge from="h2" to="o" w={W.o.w2} active={stage >= 2} />

            <Node id="x1" value={x1} label="🪪 學生證" active={stage === 0} />
            <Node id="x2" value={x2} label="🙂 人臉" active={stage === 0} />
            <Node id="h1" value={stage >= 1 ? h1 : null} label="審核員甲（OR）" active={stage === 1} emoji="🧑‍⚖️" />
            <Node id="h2" value={stage >= 1 ? h2 : null} label="審核員乙（NAND）" active={stage === 1} emoji="🧑‍⚖️" />
            <Node id="o" value={stage >= 2 ? out : null} label="決策官" active={stage === 2} emoji="👔" />
          </svg>

          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-1.5 text-xs text-muted">選擇感應組合（🪪學生證, 🙂人臉）</div>
              <div className="grid grid-cols-2 gap-2">
                {[[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => (
                  <button
                    key={`${a}${b}`}
                    onClick={() => setInput(a, b)}
                    className={`rounded-lg border px-3 py-2 font-mono text-sm transition-colors ${
                      x1 === a && x2 === b ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:border-brand-soft'
                    }`}
                  >
                    ({a}, {b})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStage((s) => Math.max(0, s - 1))} disabled={stage === 0}>← 上一步</Button>
              <Button onClick={() => setStage((s) => Math.min(2, s + 1))} disabled={stage === 2}>下一步 →</Button>
            </div>

            <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
              {STAGE_TEXT[stage]}
            </div>

            {stage === 2 && (
              <div className="rounded-xl border border-lime bg-lime/10 p-3 text-sm text-ink">
                XOR({x1}, {x2}) = <b>{out}</b> {out === (x1 ^ x2) ? '✅ 正確！' : ''}
              </div>
            )}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">切換所有 4 種感應組合試試：</b>{' '}
        這套「兩位審核員 + 一位決策官」的接力流程，對每一組輸入都能算出正確的開門判斷——
        單一顆神經元做不到的事，<b className="text-ink">兩層神經元疊起來就辦到了</b>。
        這也是神經網路強大的原因：透過疊層與非線性組合，可以逼近非常複雜的判斷關係。
      </div>
    </LessonLayout>
  )
}
