import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'

// 4 台老虎機，各自有一個「真實中獎率」——這個數字機器（和玩家）都看不到，
// 只能靠不斷嘗試去估計。
const TRUE_MEANS = [0.3, 0.55, 0.7, 0.45]
const BEST_ARM = TRUE_MEANS.indexOf(Math.max(...TRUE_MEANS))
const MACHINE_ICONS = ['🎰', '🎲', '🎯', '🃏']

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}

export function ReinforcementBasics() {
  // ── 手動拉桿 ──
  const [pulls, setPulls] = useState([0, 0, 0, 0])
  const [rewards, setRewards] = useState([0, 0, 0, 0])
  const totalPulls = pulls.reduce((a, b) => a + b, 0)

  function pull(i: number) {
    const win = Math.random() < TRUE_MEANS[i] ? 1 : 0
    setPulls((prev) => prev.map((p, j) => (j === i ? p + 1 : p)))
    setRewards((prev) => prev.map((r, j) => (j === i ? r + win : r)))
  }
  function resetManual() {
    setPulls([0, 0, 0, 0])
    setRewards([0, 0, 0, 0])
  }

  // ── 自動策略模擬（epsilon-greedy）──
  const [epsilon, setEpsilon] = useState(0.1)
  const [simSeed, setSimSeed] = useState(1)
  const STEPS = 200

  const sim = useMemo(() => {
    const rnd = seeded(simSeed * 7919)
    const p = [0, 0, 0, 0]
    const r = [0, 0, 0, 0]
    let cum = 0
    const history: number[] = []
    for (let t = 1; t <= STEPS; t++) {
      let arm: number
      const anyPulled = p.some((x) => x > 0)
      if (!anyPulled || rnd() < epsilon) {
        arm = Math.floor(rnd() * 4) // 探索：隨機挑
      } else {
        const est = p.map((pi, i) => (pi ? r[i] / pi : 0))
        arm = est.indexOf(Math.max(...est)) // 利用：挑目前估計最好的
      }
      const win = rnd() < TRUE_MEANS[arm] ? 1 : 0
      p[arm]++
      r[arm] += win
      cum += win
      history.push(cum / t)
    }
    const est = p.map((pi, i) => (pi ? r[i] / pi : 0))
    const chosen = est.indexOf(Math.max(...est))
    return { history, finalAvg: cum / STEPS, chosen, pulls: p }
  }, [epsilon, simSeed])

  const CW = 420
  const CH = 200
  const CPAD = 30
  const csx = linearScale([0, STEPS], [CPAD, CW - CPAD])
  const csy = linearScale([0, Math.max(...TRUE_MEANS) * 1.15], [CH - CPAD, 14])
  const path = sim.history
    .map((v, i) => `${i ? 'L' : 'M'}${csx(i + 1).toFixed(1)},${csy(v).toFixed(1)}`)
    .join(' ')

  return (
    <LessonLayout slug="reinforcement-basics">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        強化學習的世界裡沒有標準答案，只有<b className="text-brand">試了才知道</b>的回饋。
        核心是一個不斷循環的迴圈：<b className="text-ink">代理人（agent）</b>做出一個
        <b className="text-ink">動作（action）</b>，<b className="text-ink">環境（environment）</b>
        回傳一個<b className="text-ink">獎勵（reward）</b>，代理人根據獎勵調整下次的選擇。
        用最簡單的「老虎機問題」來體驗這個迴圈。
      </div>

      <Section
        title="手動拉拉看，體會「試了才知道」"
        description="4 台老虎機各有不同的中獎機率（對你保密）。每拉一次都是一次真實的嘗試，下方會累積你對每台機器的「估計中獎率」。"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {MACHINE_ICONS.map((icon, i) => {
            const est = pulls[i] ? rewards[i] / pulls[i] : null
            const isBestEst = est !== null && totalPulls > 0 && est === Math.max(...pulls.map((p, j) => (p ? rewards[j] / p : -1)))
            return (
              <button
                key={i}
                onClick={() => pull(i)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-colors ${
                  isBestEst ? 'border-lime bg-lime/10' : 'border-line hover:border-brand-soft'
                }`}
              >
                <span className="text-4xl">{icon}</span>
                <span className="text-xs text-muted">拉了 {pulls[i]} 次</span>
                <span className="font-mono text-sm font-semibold text-ink">
                  {est === null ? '未知' : `${(est * 100).toFixed(0)}%`}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            總共拉了 <b className="text-ink">{totalPulls}</b> 次，
            累積中獎 <b className="text-ink">{rewards.reduce((a, b) => a + b, 0)}</b> 次。
          </p>
          <Button variant="ghost" onClick={resetManual}>重置</Button>
        </div>
      </Section>

      <Section
        title="探索 vs 利用：自動策略的長期表現"
        description="ε（epsilon）代表「每次有多少機率隨機探索，而不是選目前看起來最好的」。把 ε 設成 0（完全不探索），或設高一點，看 200 次嘗試後的差別。"
      >
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full rounded-xl border border-line bg-cream">
            <line x1={CPAD} y1={CH - CPAD} x2={CW - CPAD} y2={CH - CPAD} stroke="var(--color-line)" />
            <line x1={csx(0)} y1={csy(TRUE_MEANS[BEST_ARM])} x2={csx(STEPS)} y2={csy(TRUE_MEANS[BEST_ARM])} stroke="var(--color-lime)" strokeDasharray="4 4" strokeWidth={1.5} />
            <text x={CW - CPAD} y={csy(TRUE_MEANS[BEST_ARM]) - 5} textAnchor="end" fontSize={10} fill="var(--color-muted)">真正最好的中獎率</text>
            <path d={path} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />
            <text x={CW / 2} y={CH - 8} textAnchor="middle" fontSize={11} fill="var(--color-muted)">嘗試次數 →</text>
          </svg>

          <div className="flex flex-col gap-4">
            <Slider label="ε（探索機率）" min={0} max={0.5} step={0.02} value={epsilon} onChange={setEpsilon} format={(v) => v.toFixed(2)} />
            <Button variant="outline" onClick={() => setSimSeed((s) => s + 1)}>🔁 重新模擬一次</Button>

            <div className="rounded-xl bg-cream p-4">
              <div className="text-xs text-muted">200 次後的平均中獎率</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-brand">{(sim.finalAvg * 100).toFixed(1)}%</div>
            </div>
            <div className={`rounded-xl border p-3 text-sm ${sim.chosen === BEST_ARM ? 'border-lime bg-lime/10 text-ink' : 'border-coral bg-coral/10 text-ink'}`}>
              {sim.chosen === BEST_ARM
                ? `✅ 最後選中了 ${MACHINE_ICONS[sim.chosen]}，剛好是真正最好的那台！`
                : `⚠️ 最後選中了 ${MACHINE_ICONS[sim.chosen]}，但其實 ${MACHINE_ICONS[BEST_ARM]} 才是最好的——被早期的壞運氣騙了。`}
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">把 ε 設成 0 多模擬幾次：</b>{' '}
        完全不探索的策略，一旦早期運氣不好誤判了哪台最好，就會<b className="text-ink">一路錯到底</b>
        （因為它再也不會去嘗試其他台）。適度的探索（ε ≈ 0.1~0.2）雖然會损失一點短期報酬，
        卻能<b className="text-ink">大幅提高找到真正最佳選擇的機會</b>——
        這就是強化學習裡最經典的課題：<b className="text-brand">探索與利用的取捨</b>。
      </div>
    </LessonLayout>
  )
}
