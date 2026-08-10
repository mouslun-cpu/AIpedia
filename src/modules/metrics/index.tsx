import { useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { clamp, linearScale, pointerToSvg } from '../../lib/plot'

// 醫療篩檢情境：每個人有一個「生病分數」。sick=true 是真的生病（陽性）。
// 分數高的比較可能生病，但兩群有重疊——這正是需要挑門檻的原因。
interface Person {
  score: number
  sick: boolean
  row: number // 畫圖時的垂直分層，避免重疊
}
const PEOPLE: Person[] = [
  { score: 0.12, sick: false, row: 0 }, { score: 0.18, sick: false, row: 1 },
  { score: 0.24, sick: false, row: 2 }, { score: 0.28, sick: false, row: 0 },
  { score: 0.33, sick: false, row: 1 }, { score: 0.38, sick: true, row: 2 },
  { score: 0.41, sick: false, row: 0 }, { score: 0.44, sick: true, row: 1 },
  { score: 0.48, sick: false, row: 2 }, { score: 0.52, sick: true, row: 0 },
  { score: 0.55, sick: false, row: 1 }, { score: 0.58, sick: true, row: 2 },
  { score: 0.62, sick: true, row: 0 }, { score: 0.66, sick: false, row: 1 },
  { score: 0.7, sick: true, row: 2 }, { score: 0.74, sick: true, row: 0 },
  { score: 0.78, sick: true, row: 1 }, { score: 0.83, sick: true, row: 2 },
  { score: 0.88, sick: true, row: 0 }, { score: 0.93, sick: true, row: 1 },
]

const W = 560
const H = 170
const PAD = 30
const sx = linearScale([0, 1], [PAD, W - PAD])
const rowY = (r: number) => 45 + r * 32

export function Metrics() {
  const [thr, setThr] = useState(0.5)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  // 判陽性 = score >= 門檻
  let TP = 0, FP = 0, TN = 0, FN = 0
  for (const p of PEOPLE) {
    const pos = p.score >= thr
    if (p.sick && pos) TP++
    else if (!p.sick && pos) FP++
    else if (!p.sick && !pos) TN++
    else FN++
  }
  const precision = TP + FP > 0 ? TP / (TP + FP) : 0
  const recall = TP + FN > 0 ? TP / (TP + FN) : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  const accuracy = (TP + TN) / PEOPLE.length

  function moveThr(e: React.PointerEvent) {
    if (!svgRef.current) return
    const { x } = pointerToSvg(e, svgRef.current)
    setThr(clamp(sx.invert(x), 0.02, 0.98))
  }

  const metrics = [
    { name: '精確率 Precision', v: precision, color: 'var(--color-brand)', hint: '判為陽性的人裡，真的生病的比例' },
    { name: '召回率 Recall', v: recall, color: 'var(--color-orange)', hint: '真的生病的人裡，被抓出來的比例' },
    { name: 'F1 分數', v: f1, color: 'var(--color-teal)', hint: '精確率與召回率的綜合' },
    { name: '準確率 Accuracy', v: accuracy, color: 'var(--color-muted)', hint: '全部判斷對的比例' },
  ]

  const CM = [
    { label: '真陽性 TP', v: TP, color: 'var(--color-lime)', desc: '生病→抓到' },
    { label: '偽陽性 FP', v: FP, color: 'var(--color-orange)', desc: '健康→誤報' },
    { label: '偽陰性 FN', v: FN, color: 'var(--color-red)', desc: '生病→漏掉' },
    { label: '真陰性 TN', v: TN, color: 'var(--color-brand)', desc: '健康→排除' },
  ]

  return (
    <LessonLayout slug="metrics">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        「準確率 95%」聽起來很棒，但如果 100 人裡只有 5 人生病，
        一個<b className="text-ink">全部猜「沒病」</b>的爛模型也有 95% 準確率！
        所以我們需要更細的指標。想像一個疾病篩檢：模型給每個人打「生病分數」，
        超過<b className="text-brand">門檻</b>就判為陽性。門檻設在哪，結果差很多。
      </div>

      <Section
        title="拖動門檻線，看四種結果怎麼變"
        description="紅點是真的生病、藍點是健康。門檻右邊會被判為「陽性」。拖動那條線，觀察下方混淆矩陣即時變化。"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none rounded-xl border border-line bg-cream"
          onPointerDown={(e) => { dragging.current = true; moveThr(e) }}
          onPointerMove={(e) => dragging.current && moveThr(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          {/* 預測區背景 */}
          <rect x={PAD} y={20} width={sx(thr) - PAD} height={H - 50} fill="var(--color-brand)" opacity={0.05} />
          <rect x={sx(thr)} y={20} width={W - PAD - sx(thr)} height={H - 50} fill="var(--color-red)" opacity={0.05} />
          <text x={PAD + 6} y={35} fontSize={11} fill="var(--color-muted)">← 判為健康（陰性）</text>
          <text x={W - PAD - 6} y={35} fontSize={11} fill="var(--color-muted)" textAnchor="end">判為生病（陽性）→</text>

          {/* 門檻線 */}
          <line x1={sx(thr)} y1={20} x2={sx(thr)} y2={H - 30} stroke="var(--color-ink)" strokeWidth={2.5} className="cursor-ew-resize" />
          <circle cx={sx(thr)} cy={20} r={6} fill="var(--color-ink)" className="cursor-ew-resize" />

          {/* 座標軸 */}
          <line x1={PAD} y1={H - 30} x2={W - PAD} y2={H - 30} stroke="var(--color-line)" />
          <text x={PAD} y={H - 14} fontSize={10} fill="var(--color-muted)">生病分數 0</text>
          <text x={W - PAD} y={H - 14} fontSize={10} fill="var(--color-muted)" textAnchor="end">1</text>

          {/* 人 */}
          {PEOPLE.map((p, i) => (
            <circle key={i} cx={sx(p.score)} cy={rowY(p.row)} r={6.5}
              fill={p.sick ? 'var(--color-red)' : 'var(--color-brand)'} stroke="#fff" strokeWidth={1.5} />
          ))}
        </svg>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* 混淆矩陣 */}
          <div>
            <div className="mb-2 text-sm font-medium text-ink">混淆矩陣</div>
            <div className="grid grid-cols-2 gap-2">
              {CM.map((c) => (
                <div key={c.label} className="rounded-xl p-3" style={{ background: `color-mix(in srgb, ${c.color} 14%, white)`, border: `1px solid ${c.color}` }}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-ink">{c.label}</span>
                    <span className="font-mono text-xl font-bold text-ink">{c.v}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 指標長條 */}
          <div className="flex flex-col justify-center gap-3">
            {metrics.map((m) => (
              <div key={m.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink">{m.name}</span>
                  <span className="font-mono font-semibold" style={{ color: m.color }}>{(m.v * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-cream">
                  <div className="h-full rounded-full" style={{ width: `${m.v * 100}%`, background: m.color, transition: 'width 0.15s' }} />
                </div>
                <div className="mt-0.5 text-xs text-muted">{m.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">精確率和召回率會互相拉扯：</b>{' '}
        把門檻往<b className="text-ink">右</b>拉（變嚴格），判陽性的都很有把握（精確率高），
        但會漏掉一些病人（召回率低）。往<b className="text-ink">左</b>拉（變寬鬆）則相反。
        該偏向哪邊，要看情境——癌症篩檢寧可誤報也不能漏掉（重召回），
        垃圾信過濾寧可漏抓也別把重要信誤刪（重精確）。
      </div>
    </LessonLayout>
  )
}
