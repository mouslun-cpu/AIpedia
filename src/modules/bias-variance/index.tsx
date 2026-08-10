import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { linearScale } from '../../lib/plot'

// 用「射飛鏢」比喻：靶心=正確答案。
// 偏差(bias) = 射點整體偏離靶心多遠（系統性錯誤，模型太簡單）。
// 變異(variance) = 射點彼此散得多開（換一批資料結果就大變，模型太敏感）。

// 固定亂數，讓每個複雜度的射點穩定但有隨機感
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}
// 近似常態分佈（取幾個均勻亂數平均）
function gauss(rnd: () => number) {
  return (rnd() + rnd() + rnd() + rnd() - 2) / 1.5
}

const TARGET = 170 // 靶的中心
const R_UNIT = 46 // 一環的半徑

export function BiasVariance() {
  const [complexity, setComplexity] = useState(0.3)

  // 複雜度越高：偏差越小（射點中心越靠靶心），變異越大（越散）
  const biasMag = (1 - complexity) * 1.35 // 以「環」為單位
  const spread = 0.12 + complexity * 1.15

  const shots = useMemo(() => {
    const rnd = seeded(12345)
    const dir = -Math.PI / 4 // 偏差方向固定（右上）
    const cx = Math.cos(dir) * biasMag
    const cy = Math.sin(dir) * biasMag
    return Array.from({ length: 14 }, () => ({
      x: cx + gauss(rnd) * spread,
      y: cy + gauss(rnd) * spread,
    }))
  }, [biasMag, spread])

  // ── 分解圖：bias² / variance / total 隨複雜度變化 ──
  const CW = 360
  const CH = 200
  const CPAD = 34
  const cx = linearScale([0, 1], [CPAD, CW - CPAD])
  const bias2 = (c: number) => ((1 - c) * 1.35) ** 2
  const varc = (c: number) => (0.12 + c * 1.15) ** 2
  const noise = 0.12
  const total = (c: number) => bias2(c) + varc(c) + noise
  const yMax = Math.max(total(0), total(1)) * 1.05
  const cy2 = linearScale([0, yMax], [CH - CPAD, 14])
  const curve = (f: (c: number) => number) =>
    Array.from({ length: 60 }, (_, i) => {
      const c = i / 59
      return `${i ? 'L' : 'M'}${cx(c).toFixed(1)},${cy2(f(c)).toFixed(1)}`
    }).join(' ')

  const regime =
    complexity < 0.33
      ? { t: '高偏差（欠擬合）', d: '射點擠在一起但整團偏離靶心——模型太簡單，穩定地犯同一種錯。', color: 'var(--color-brand-soft)' }
      : complexity > 0.66
        ? { t: '高變異（過擬合）', d: '射點大致圍著靶心，卻散得很開——模型太敏感，換一批資料結果就大不同。', color: 'var(--color-coral)' }
        : { t: '剛剛好', d: '射點又集中、又靠近靶心。偏差和變異取得平衡，這就是我們要的甜蜜點。', color: 'var(--color-lime)' }

  return (
    <LessonLayout slug="bias-variance">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        「欠擬合、過擬合」背後，其實是兩種錯誤在拉扯。用射飛鏢來想最清楚：
        <b className="text-brand">偏差</b>是「整團射點偏離靶心多遠」（模型太簡單，錯得很一致）；
        <b className="text-brand">變異</b>是「射點彼此散得多開」（模型太敏感，換批資料就亂跳）。
        兩者往往<b className="text-ink">顧此失彼</b>。
      </div>

      <Section
        title="拉複雜度，看射點怎麼變"
        description="靶心是正確答案，每個點是模型在一批資料上的預測。從左（簡單）拉到右（複雜），觀察射點從「集中但偏掉」變成「圍著靶心但很散」。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 靶 */}
          <div>
            <svg viewBox="0 0 340 340" className="w-full rounded-xl border border-line bg-cream">
              {[4, 3, 2, 1].map((ring) => (
                <circle key={ring} cx={TARGET} cy={TARGET} r={ring * R_UNIT}
                  fill={ring % 2 ? '#fff' : 'var(--color-sky)'} opacity={ring % 2 ? 1 : 0.3}
                  stroke="var(--color-line)" />
              ))}
              <circle cx={TARGET} cy={TARGET} r={7} fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth={1.5} />
              {shots.map((s, i) => (
                <circle key={i} cx={TARGET + s.x * R_UNIT} cy={TARGET + s.y * R_UNIT} r={5}
                  fill="var(--color-orange)" stroke="#fff" strokeWidth={1.5} opacity={0.9}
                  style={{ transition: 'all 0.2s' }} />
              ))}
            </svg>
          </div>

          {/* 分解圖 */}
          <div className="flex flex-col justify-center">
            <div className="mb-1.5 text-sm font-medium text-muted">錯誤怎麼組成的（隨複雜度）</div>
            <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full rounded-xl border border-line bg-cream">
              <line x1={CPAD} y1={CH - CPAD} x2={CW - CPAD} y2={CH - CPAD} stroke="var(--color-line)" />
              <line x1={cx(complexity)} y1={14} x2={cx(complexity)} y2={CH - CPAD} stroke="var(--color-brand-pale)" strokeWidth={2} />
              <path d={curve(bias2)} fill="none" stroke="var(--color-brand-soft)" strokeWidth={2.5} />
              <path d={curve(varc)} fill="none" stroke="var(--color-coral)" strokeWidth={2.5} />
              <path d={curve(total)} fill="none" stroke="var(--color-ink)" strokeWidth={2.5} strokeDasharray="5 3" />
              <text x={CW / 2} y={CH - 8} textAnchor="middle" fontSize={11} fill="var(--color-muted)">模型複雜度 →</text>
              <g fontSize={10}>
                <text x={CPAD} y={12} fill="var(--color-brand-soft)">■ 偏差²</text>
                <text x={CPAD + 60} y={12} fill="var(--color-coral)">■ 變異</text>
                <text x={CPAD + 120} y={12} fill="var(--color-ink)">▬ 總錯誤</text>
              </g>
            </svg>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <Slider label="模型複雜度" min={0} max={1} step={0.02} value={complexity} onChange={setComplexity} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="rounded-xl border p-4" style={{ borderColor: regime.color, background: `color-mix(in srgb, ${regime.color} 12%, white)` }}>
            <div className="flex items-center gap-2 font-semibold text-ink">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: regime.color }} />
              {regime.t}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{regime.d}</p>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">看那條黑色虛線（總錯誤）：</b>{' '}
        它是偏差²和變異加起來的結果，呈現<b className="text-ink">先降後升的 U 型</b>——
        跟「欠擬合與過擬合」看到的驗證誤差曲線是同一件事，只是這裡拆開來看清楚了。
        機器學習的調校，很大程度就是在<b className="text-brand">偏差與變異之間找平衡</b>。
      </div>
    </LessonLayout>
  )
}
