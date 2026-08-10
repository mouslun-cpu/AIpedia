import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Challenge } from '../../components/Challenge'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { clamp, linearScale, pointerToSvg } from '../../lib/plot'

// 情境：珍奶控股要在小鎮開 K 家分店。
// 鎮上 24 位常客的住處（三個天然聚落，但事先沒人告訴你分幾區）。
// 分店開在哪，能讓每位客人「走最近」？——這正是 K-means 在解的問題。
const SEED_CLUSTERS = [
  { cx: 26, cy: 30, n: 8 },
  { cx: 74, cy: 34, n: 8 },
  { cx: 48, cy: 78, n: 8 },
]
function makeCustomers(): number[][] {
  const pts: number[][] = []
  let seed = 88
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return (seed / 0x7fffffff) * 2 - 1
  }
  for (const c of SEED_CLUSTERS)
    for (let i = 0; i < c.n; i++) pts.push([c.cx + rand() * 15, c.cy + rand() * 15])
  return pts
}
const CUSTOMERS = makeCustomers()

const STORE_COLORS = ['var(--color-brand)', 'var(--color-orange)', 'var(--color-teal)', 'var(--color-coral)']
const S = 360
const PAD = 26
const sx = linearScale([0, 100], [PAD, S - PAD])
const sy = linearScale([0, 100], [S - PAD, PAD])

function assignTo(stores: number[][]): number[] {
  return CUSTOMERS.map((c) => {
    let best = 0
    let bd = Infinity
    stores.forEach((s, i) => {
      const d = (c[0] - s[0]) ** 2 + (c[1] - s[1]) ** 2
      if (d < bd) { bd = d; best = i }
    })
    return best
  })
}
/** 平均走路距離（地圖 1 格 = 10 公尺） */
function meanDist(stores: number[][]): number {
  const a = assignTo(stores)
  const total = CUSTOMERS.reduce(
    (s, c, i) => s + Math.hypot(c[0] - stores[a[i]][0], c[1] - stores[a[i]][1]),
    0,
  )
  return (total / CUSTOMERS.length) * 10
}
/** Lloyd 的一步：每家店搬到自己客群的正中央 */
function lloydStep(stores: number[][]): number[][] {
  const a = assignTo(stores)
  return stores.map((s, i) => {
    const members = CUSTOMERS.filter((_, j) => a[j] === i)
    if (!members.length) return s
    return [
      members.reduce((t, p) => t + p[0], 0) / members.length,
      members.reduce((t, p) => t + p[1], 0) / members.length,
    ]
  })
}

function seededRnd(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}
function randomStores(k: number, seed: number): number[][] {
  const rnd = seededRnd(seed)
  return Array.from({ length: k }, () => [10 + rnd() * 80, 10 + rnd() * 80])
}

// 每個 K 的「已知最佳」平均距離：跑 12 個隨機起點的 K-means 取最好
const BEST: Record<number, number> = {}
for (let k = 2; k <= 4; k++) {
  let best = Infinity
  for (let s = 0; s < 12; s++) {
    let st = randomStores(k, 1000 + s * 71)
    for (let it = 0; it < 40; it++) {
      const ns = lloydStep(st)
      const move = Math.max(...ns.map((p, i) => Math.hypot(p[0] - st[i][0], p[1] - st[i][1])))
      st = ns
      if (move < 0.01) break
    }
    best = Math.min(best, meanDist(st))
  }
  BEST[k] = best
}

export function KMeans() {
  const [k, setK] = useState(3)
  const [stores, setStores] = useState<number[][]>(() => randomStores(3, 7))
  const [lastMove, setLastMove] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const restartSeed = useRef(7)
  const timer = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragIdx = useRef<number | null>(null)

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const assign = useMemo(() => assignTo(stores), [stores])
  const dist = meanDist(stores)
  const best = BEST[k]
  const beatAI = dist <= best * 1.02
  const converged = lastMove !== null && lastMove < 0.3
  const stuckLocal = converged && dist > best * 1.05

  function stepOnce() {
    setStores((prev) => {
      const next = lloydStep(prev)
      setLastMove(Math.max(...next.map((p, i) => Math.hypot(p[0] - prev[i][0], p[1] - prev[i][1]))))
      return next
    })
  }
  function autoRun() {
    if (timer.current) clearInterval(timer.current)
    setRunning(true)
    timer.current = window.setInterval(() => {
      setStores((prev) => {
        const next = lloydStep(prev)
        const move = Math.max(...next.map((p, i) => Math.hypot(p[0] - prev[i][0], p[1] - prev[i][1])))
        setLastMove(move)
        if (move < 0.3) {
          clearInterval(timer.current!)
          timer.current = null
          setRunning(false)
        }
        return next
      })
    }, 600)
  }
  function restart(newK = k) {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setRunning(false)
    restartSeed.current = restartSeed.current * 3 + 11
    setStores(randomStores(newK, restartSeed.current))
    setLastMove(null)
  }

  function onDrag(e: React.PointerEvent) {
    if (dragIdx.current === null || !svgRef.current || running) return
    const { x, y } = pointerToSvg(e, svgRef.current)
    const nx = clamp(sx.invert(x), 2, 98)
    const ny = clamp(sy.invert(y), 2, 98)
    setStores((prev) => prev.map((p, i) => (i === dragIdx.current ? [nx, ny] : p)))
    setLastMove(null)
  }

  return (
    <LessonLayout slug="kmeans">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        珍奶控股要進軍小鎮，開 <b className="text-ink">K 家分店</b>。
        地圖上是 24 位常客的住處——<b className="text-ink">沒有人幫他們分好區</b>，這就是非監督式學習的處境。
        你的任務：把分店開在最好的位置，讓<b className="text-brand">每位客人走到最近分店的平均距離</b>越短越好。
        規則只有一條：<b className="text-ink">客人永遠只去離家最近的那家店</b>（拖動分店試試，客人會立刻改變主意）。
        K-means 解這題的招式笨得可愛：<b className="text-brand">把每家店搬到自己客群的正中央，重複到搬不動為止</b>。
      </div>

      <Section
        title="你來選址 vs K-means 來選址"
        description="先自己拖 🧋 分店，看平均走路距離能壓多低；再按「搬一步」看 K-means 的做法——每按一次，所有店同時搬到自己客群的中心。也可以按自動，直接看它收斂。"
      >
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${S} ${S}`}
            className="w-full touch-none rounded-xl border border-line bg-cream"
            onPointerMove={onDrag}
            onPointerUp={() => (dragIdx.current = null)}
            onPointerLeave={() => (dragIdx.current = null)}
          >
            {/* 客人 → 分店的路 */}
            {CUSTOMERS.map((c, i) => (
              <line
                key={`l${i}`}
                x1={sx(c[0])}
                y1={sy(c[1])}
                x2={sx(stores[assign[i]][0])}
                y2={sy(stores[assign[i]][1])}
                stroke={STORE_COLORS[assign[i]]}
                strokeWidth={1}
                opacity={0.3}
              />
            ))}
            {/* 客人 */}
            {CUSTOMERS.map((c, i) => (
              <circle
                key={i}
                cx={sx(c[0])}
                cy={sy(c[1])}
                r={5.5}
                fill={STORE_COLORS[assign[i]]}
                stroke="#fff"
                strokeWidth={1.3}
                style={{ transition: 'fill 0.3s' }}
              >
                <title>{`常客 ${i + 1}：目前去第 ${assign[i] + 1} 家店`}</title>
              </circle>
            ))}
            {/* 分店 */}
            {stores.map(([x, y], i) => (
              <g
                key={i}
                transform={`translate(${sx(x)},${sy(y)})`}
                style={{ transition: running || lastMove !== null ? 'transform 0.45s' : 'none' }}
                className={running ? '' : 'cursor-grab active:cursor-grabbing'}
                onPointerDown={() => !running && (dragIdx.current = i)}
              >
                <circle r={13} fill={STORE_COLORS[i]} stroke="#fff" strokeWidth={2.5} />
                <text y={5} textAnchor="middle" fontSize={14}>🧋</text>
              </g>
            ))}
          </svg>

          <div className="flex flex-col gap-4">
            <Slider label="要開幾家分店（K）" min={2} max={4} value={k} onChange={(v) => { setK(v); restart(v) }} suffix="家" />

            {/* 記分板 */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: beatAI ? 'var(--color-lime)' : 'var(--color-line)',
                  background: beatAI ? 'color-mix(in srgb, var(--color-lime) 12%, white)' : 'var(--color-cream)',
                }}
              >
                <div className="text-xs text-muted">目前的平均走路距離</div>
                <div className="mt-0.5 font-mono text-xl font-semibold text-ink">{dist.toFixed(0)} 公尺</div>
              </div>
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">🤖 K-means 最佳成績</div>
                <div className="mt-0.5 font-mono text-xl font-semibold text-muted">{best.toFixed(0)} 公尺</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={stepOnce} disabled={running}>🚚 所有店往客群中心搬一步</Button>
              <Button variant="outline" onClick={autoRun} disabled={running}>▶ 自動搬到收斂</Button>
              <Button variant="ghost" onClick={() => restart()} disabled={running}>🎲 隨機重開一局</Button>
            </div>

            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              {beatAI && converged ? (
                <p>🏆 <b className="text-ink">收斂了，而且是好結果</b>——距離已經追平「已知最佳」。
                  按「隨機重開」再玩一局：起點不同，結局不一定一樣好……</p>
              ) : stuckLocal ? (
                <p>😬 <b className="text-red">卡住了！</b>店家都搬不動了（每步的搬動幅度趨近 0），
                  但成績比最佳的 {best.toFixed(0)} 公尺差。這叫<b className="text-ink">局部最佳</b>——
                  K-means 的結局取決於起點。實務上會<b className="text-ink">多跑幾次不同起點取最好</b>，
                  按「隨機重開」試試。</p>
              ) : beatAI ? (
                <p>🏆 你手動選址已經追平 K-means！現在按「搬一步」，看它從你的位置還能不能再擠出幾公尺。</p>
              ) : converged ? (
                <p>店家搬不動了——<b className="text-ink">收斂</b>。每個客人都在最近的店、每家店都在客群正中央，互相咬合。</p>
              ) : (
                <p>💡 先自己拖 🧋 挑戰看看能壓到幾公尺，再讓 K-means 上場。
                  注意每按一次「搬一步」，距離幾乎只會變短不會變長——這是 K-means 保證收斂的原因。</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Challenge
        module="kmeans"
        id="beat-ai"
        title="打敗 AI 選址，讓客人走最少路"
        goal={<>維持開 3 家店，想辦法讓「平均走路距離」追平甚至打平右邊 🤖 <b className="text-ink">K-means 的最佳成績</b>（距離框變綠色就贏了）。</>}
        steps={[
          '地圖上有三群住得很近的客人——先用眼睛找出這三群。',
          '把三家 🧋 分店各拖到「一群客人的正中央」。',
          '看左上角「平均走路距離」的數字，越小越好。',
          '追不平？直接按「🚚 往客群中心搬一步」讓 AI 幫你微調到最好。',
        ]}
        hints={[
          <>客人只會去<b className="text-ink">最近</b>的店。所以每家店最好剛好坐落在一群人的中間，沒有人要走遠路。</>,
          <>手動很難剛好最佳——把店大致拖到三群附近後，連按幾次「搬一步」，AI 會自動把它們吸到正中心。</>,
        ]}
        done={beatAI}
        success={<>你找到的位置，讓每位客人走的路都最短——這正是 K-means 在做的事：<b className="text-ink">把每個中心點移到自己那群的正中央，重複到動不了為止</b>。你也可能發現：換個起點（隨機重開），有時會卡在比較差的位置搬不動，這叫<b className="text-ink">局部最佳</b>，所以真實世界會多試幾次挑最好的。</>}
      />

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">K 要開幾家店？</b>{' '}
        切到 K=2：有一整區的客人要走很遠；K=4：距離更短，但多付一家店的租金，改善卻越來越小。
        實務上就是這樣挑 K 的——畫出「每多開一家店，距離改善多少」，
        在<b className="text-ink">改善開始不划算的轉折點</b>（手肘點）停手。
        另外你剛剛也體驗到了：K-means <b className="text-ink">會被爛起點卡在局部最佳</b>，
        所以真實世界都是多跑幾次、挑最好的那次。
      </div>
    </LessonLayout>
  )
}
