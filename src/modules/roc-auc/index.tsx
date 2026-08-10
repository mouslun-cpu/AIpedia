import { useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { clamp, linearScale, pointerToSvg } from '../../lib/plot'

// 固定的隨機「z 分數」，讓兩群點穩定；分離度改變時整群平移。
function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}
function gauss(rnd: () => number) {
  return (rnd() + rnd() + rnd() + rnd() - 2) / 2
}
const rndP = seeded(101)
const rndN = seeded(202)
const POS_Z = Array.from({ length: 16 }, () => gauss(rndP))
const NEG_Z = Array.from({ length: 16 }, () => gauss(rndN))
const STD = 0.16

// 左側分數帶
const LW = 300
const LH = 200
const LPAD = 24
const lsx = linearScale([0, 1], [LPAD, LW - LPAD])

// 右側 ROC 方框
const RW = 240
const RH = 240
const RPAD = 34
const rx = linearScale([0, 1], [RPAD, RW - RPAD])
const ry = linearScale([0, 1], [RH - RPAD, RPAD])

export function RocAuc() {
  const [sep, setSep] = useState(0.35)
  const [thr, setThr] = useState(0.5)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  // 依分離度算出實際分數
  const scores = useMemo(() => {
    const meanP = 0.5 + sep / 2
    const meanN = 0.5 - sep / 2
    const pos = POS_Z.map((z) => clamp(meanP + z * STD, 0.01, 0.99))
    const neg = NEG_Z.map((z) => clamp(meanN + z * STD, 0.01, 0.99))
    return { pos, neg }
  }, [sep])

  const P = scores.pos.length
  const Nn = scores.neg.length

  // ROC 曲線：把所有分數由高到低掃過，正例往上、負例往右
  const roc = useMemo(() => {
    const all = [
      ...scores.pos.map((s) => ({ s, pos: true })),
      ...scores.neg.map((s) => ({ s, pos: false })),
    ].sort((a, b) => b.s - a.s)
    const pts: [number, number][] = [[0, 0]]
    let tp = 0
    let fp = 0
    for (const item of all) {
      if (item.pos) tp++
      else fp++
      pts.push([fp / Nn, tp / P])
    }
    return pts
  }, [scores, P, Nn])

  // AUC：正負配對中「正例分數 > 負例分數」的比例
  const auc = useMemo(() => {
    let win = 0
    for (const p of scores.pos)
      for (const n of scores.neg) win += p > n ? 1 : p === n ? 0.5 : 0
    return win / (P * Nn)
  }, [scores, P, Nn])

  // 目前門檻對應的 ROC 點
  const tpNow = scores.pos.filter((s) => s >= thr).length
  const fpNow = scores.neg.filter((s) => s >= thr).length
  const curPoint: [number, number] = [fpNow / Nn, tpNow / P]

  const rocPath = roc
    .map((p, i) => `${i ? 'L' : 'M'}${rx(p[0]).toFixed(1)},${ry(p[1]).toFixed(1)}`)
    .join(' ')
  const aucArea =
    `M${rx(0)},${ry(0)} ` +
    roc.map((p) => `L${rx(p[0]).toFixed(1)},${ry(p[1]).toFixed(1)}`).join(' ') +
    ` L${rx(1)},${ry(0)} Z`

  function moveThr(e: React.PointerEvent) {
    if (!svgRef.current) return
    const { x } = pointerToSvg(e, svgRef.current)
    setThr(clamp(lsx.invert(x), 0.02, 0.98))
  }

  const quality =
    auc > 0.9 ? '優秀' : auc > 0.8 ? '良好' : auc > 0.7 ? '普通' : auc > 0.6 ? '勉強' : '接近亂猜'

  return (
    <LessonLayout slug="roc-auc">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        上一個知識點看到：換個門檻，精確率和召回率就此消彼長。
        那有沒有辦法<b className="text-ink">一眼看出一個模型整體有多強</b>，不受單一門檻影響？
        <b className="text-brand">ROC 曲線</b>就是把「所有門檻」的表現一次畫出來，
        而曲線下的面積 <b className="text-brand">AUC</b> 就是那個總分——越接近 1 越好。
      </div>

      <Section
        title="左邊拖門檻，右邊看它在 ROC 上的位置"
        description="紅=生病、藍=健康。拖動左邊的門檻，右邊 ROC 曲線上的黑點會跟著移動。整條曲線是「掃過所有門檻」畫出來的軌跡。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 分數帶 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">兩群人的分數分布</div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${LW} ${LH}`}
              className="w-full touch-none rounded-xl border border-line bg-cream"
              onPointerDown={(e) => { dragging.current = true; moveThr(e) }}
              onPointerMove={(e) => dragging.current && moveThr(e)}
              onPointerUp={() => (dragging.current = false)}
              onPointerLeave={() => (dragging.current = false)}
            >
              <text x={LPAD} y={26} fontSize={11} fill="var(--color-red)">生病（陽性）</text>
              {scores.pos.map((s, i) => (
                <circle key={i} cx={lsx(s)} cy={40 + (i % 3) * 12} r={5} fill="var(--color-red)" stroke="#fff" strokeWidth={1} />
              ))}
              <text x={LPAD} y={116} fontSize={11} fill="var(--color-brand)">健康（陰性）</text>
              {scores.neg.map((s, i) => (
                <circle key={i} cx={lsx(s)} cy={130 + (i % 3) * 12} r={5} fill="var(--color-brand)" stroke="#fff" strokeWidth={1} />
              ))}
              <line x1={lsx(thr)} y1={14} x2={lsx(thr)} y2={LH - 14} stroke="var(--color-ink)" strokeWidth={2.5} className="cursor-ew-resize" />
              <circle cx={lsx(thr)} cy={14} r={6} fill="var(--color-ink)" className="cursor-ew-resize" />
            </svg>
          </div>

          {/* ROC */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">ROC 曲線</div>
            <svg viewBox={`0 0 ${RW} ${RH}`} className="w-full rounded-xl border border-line bg-cream">
              {/* AUC 面積 */}
              <path d={aucArea} fill="var(--color-brand)" opacity={0.12} />
              {/* 對角線（亂猜）*/}
              <line x1={rx(0)} y1={ry(0)} x2={rx(1)} y2={ry(1)} stroke="var(--color-line)" strokeDasharray="4 4" />
              {/* 邊框 */}
              <line x1={RPAD} y1={RPAD} x2={RPAD} y2={RH - RPAD} stroke="var(--color-line)" />
              <line x1={RPAD} y1={RH - RPAD} x2={RW - RPAD} y2={RH - RPAD} stroke="var(--color-line)" />
              {/* 曲線 */}
              <path d={rocPath} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />
              {/* 目前門檻的點 */}
              <circle cx={rx(curPoint[0])} cy={ry(curPoint[1])} r={6} fill="var(--color-orange)" stroke="#fff" strokeWidth={2} />
              <text x={RW / 2} y={RH - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted)">偽陽性率（誤報）→</text>
              <text x={12} y={RH / 2} textAnchor="middle" fontSize={10} fill="var(--color-muted)" transform={`rotate(-90,12,${RH / 2})`}>真陽性率（抓到）→</text>
            </svg>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
          <Slider label="模型的鑑別力（兩群分數分得多開）" min={0} max={0.6} step={0.02} value={sep} onChange={setSep} format={(v) => v.toFixed(2)} />
          <div className="rounded-xl border border-brand p-4">
            <div className="text-xs text-muted">AUC（曲線下面積）</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold text-brand">{auc.toFixed(3)}</span>
              <span className="text-sm text-muted">{quality}</span>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">怎麼讀 AUC：</b>{' '}
        把「鑑別力」拉到 0，兩群分數完全重疊，模型跟<b className="text-ink">丟銅板一樣</b>——
        ROC 貼著對角線，AUC ≈ 0.5。把鑑別力拉大，兩群分開，
        曲線就往<b className="text-ink">左上角</b>鼓起來，AUC 趨近 1（完美）。
        AUC 的直覺意義是：<b className="text-brand">隨機抓一個病人和一個健康人，模型給病人打的分數比較高的機率</b>。
      </div>
    </LessonLayout>
  )
}
