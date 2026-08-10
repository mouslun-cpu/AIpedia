import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'
import { agglomerative, clustersAt } from './cluster'

// 情境：婚宴排桌。賓客站在「交情地圖」上——越熟的人靠得越近。
// 階層式分群 = 一步步把最熟的兩群人併成一桌，最後你決定開幾桌。
// 三個天然小圈圈 + 一位誰都不熟的遠房三叔公（看他最後被併去哪一桌）。
const GUESTS = [
  { name: '死黨阿宏', emoji: '🕶️', x: 18, y: 22 },
  { name: '同學小美', emoji: '🎀', x: 28, y: 16 },
  { name: '社團胖達', emoji: '🐼', x: 24, y: 30 },
  { name: '主管 Ken', emoji: '👔', x: 80, y: 18 },
  { name: '同事 Amy', emoji: '💼', x: 88, y: 28 },
  { name: '大姨', emoji: '🌺', x: 42, y: 76 },
  { name: '二姨', emoji: '🌸', x: 54, y: 82 },
  { name: '表哥', emoji: '🎮', x: 36, y: 86 },
  { name: '表嫂', emoji: '👶', x: 47, y: 92 },
  { name: '遠房三叔公', emoji: '🎩', x: 92, y: 88 },
]
const N = GUESTS.length
const STEPS = agglomerative(GUESTS)
const COLORS = ['var(--color-brand)', 'var(--color-orange)', 'var(--color-teal)', 'var(--color-coral)', 'var(--color-lime)', '#B08BC9', '#7FA6C9', '#C9A67F', '#9BB89B', '#C97F98']

/** 節點 id 底下有哪些賓客 */
function membersOf(id: number): number[] {
  if (id < N) return [id]
  return STEPS.find((s) => s.id === id)!.members
}
const nameList = (idx: number[]) => {
  const names = idx.map((i) => GUESTS[i].name)
  return names.length <= 3 ? names.join('、') : `${names.slice(0, 2).join('、')}…等 ${names.length} 人`
}

const S = 330
const PAD = 26
const sx = linearScale([0, 100], [PAD, S - PAD])
const sy = linearScale([0, 100], [S - PAD, PAD])

// 樹狀圖
const DW = 400
const DH = 300
const DPAD_L = 44
const DPAD_B = 30
const leafX = linearScale([0, N - 1], [DPAD_L + 8, DW - 16])
const maxDist = Math.max(...STEPS.map((s) => s.dist), 1)
const distY = linearScale([0, maxDist * 1.08], [DH - DPAD_B, 20])

export function Hierarchical() {
  const [upTo, setUpTo] = useState(0) // 已完成幾次併桌
  const [playing, setPlaying] = useState(false)
  const [cutDist, setCutDist] = useState(maxDist * 0.55)
  const timer = useRef<number | null>(null)
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const groupIds = clustersAt(N, STEPS, upTo)
  const uniqueGroups = [...new Set(groupIds)]
  const colorOf = (gid: number) => COLORS[gid % COLORS.length]

  // 下一步要併的兩群
  const next = upTo < STEPS.length ? STEPS[upTo] : null
  const nextA = next ? membersOf(next.a) : []
  const nextB = next ? membersOf(next.b) : []
  const centroid = (idx: number[]) => [
    idx.reduce((s, i) => s + GUESTS[i].x, 0) / idx.length,
    idx.reduce((s, i) => s + GUESTS[i].y, 0) / idx.length,
  ]

  function stepMerge() {
    setUpTo((v) => Math.min(STEPS.length, v + 1))
  }
  function autoPlay() {
    if (timer.current) clearInterval(timer.current)
    setPlaying(true)
    timer.current = window.setInterval(() => {
      setUpTo((v) => {
        if (v >= STEPS.length - 1) {
          clearInterval(timer.current!)
          timer.current = null
          setPlaying(false)
        }
        return Math.min(STEPS.length, v + 1)
      })
    }, 750)
  }
  function reset() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
    setUpTo(0)
  }

  // 樹狀圖佈局（葉序取自完整合併順序，畫線不交叉）
  const leafOrder = useMemo(() => {
    const order: number[] = []
    const visit = (id: number) => {
      if (id < N) { order.push(id); return }
      const step = STEPS.find((s) => s.id === id)!
      visit(step.a)
      visit(step.b)
    }
    visit(STEPS[STEPS.length - 1].id)
    return order
  }, [])
  const xOfNode = new Map<number, number>(leafOrder.map((leaf, i) => [leaf, leafX(i)]))
  const yOfNode = new Map<number, number>(leafOrder.map((leaf) => [leaf, distY(0)]))
  const edges: { x1: number; y1: number; x2: number; y2: number; step: number }[] = []
  STEPS.forEach((step, si) => {
    const xa = xOfNode.get(step.a)!
    const xb = xOfNode.get(step.b)!
    const ya = yOfNode.get(step.a)!
    const yb = yOfNode.get(step.b)!
    const y = distY(step.dist)
    edges.push({ x1: xa, y1: ya, x2: xa, y2: y, step: si })
    edges.push({ x1: xb, y1: yb, x2: xb, y2: y, step: si })
    edges.push({ x1: xa, y1: y, x2: xb, y2: y, step: si })
    xOfNode.set(step.id, (xa + xb) / 2)
    yOfNode.set(step.id, y)
  })

  // 開幾桌（用完整的樹 + 切割線）
  const fullUpTo = STEPS.filter((s) => s.dist <= cutDist).length
  const tableIds = clustersAt(N, STEPS, fullUpTo)
  const tables = useMemo(() => {
    const map = new Map<number, number[]>()
    tableIds.forEach((gid, i) => {
      if (!map.has(gid)) map.set(gid, [])
      map.get(gid)!.push(i)
    })
    return [...map.values()].sort((a, b) => b.length - a.length)
  }, [tableIds])

  return (
    <LessonLayout slug="hierarchical">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        你在替婚宴<b className="text-ink">排桌</b>。賓客站在「<b className="text-brand">交情地圖</b>」上——越熟的人站得越近。
        K-means 要你先講好開幾桌，但你還沒想好。<b className="text-brand">階層式分群</b>換個做法：
        先把每個人都當成自己一桌，然後<b className="text-ink">一次併一步：誰跟誰最熟，就先併成一桌</b>，
        直到全場併成一大桌。整個併桌過程會長成一棵樹——
        <b className="text-ink">事後</b>你想開幾桌，從樹上切一刀就有答案。
        對了，注意右上角那位<b className="text-ink">🎩 遠房三叔公</b>——誰都不熟的人，會發生什麼事？
      </div>

      <Section
        title="Step 1｜一步步併桌：誰跟誰最熟？"
        description="虛線圈起來的，是「目前全場最熟的兩群」。按「併下一桌」看他們合併、右邊的樹同步長高一層——合併的橫桿越高，代表這次併桌越勉強（兩群其實沒那麼熟）。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 交情地圖 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">交情地圖（目前 {uniqueGroups.length} 桌）</div>
            <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
              {/* 下一對合併的連線 */}
              {next && (
                <line
                  x1={sx(centroid(nextA)[0])}
                  y1={sy(centroid(nextA)[1])}
                  x2={sx(centroid(nextB)[0])}
                  y2={sy(centroid(nextB)[1])}
                  stroke="var(--color-ink)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  opacity={0.55}
                />
              )}
              {GUESTS.map((g, i) => {
                const isNext = next !== null && (nextA.includes(i) || nextB.includes(i))
                return (
                  <g key={i} transform={`translate(${sx(g.x)},${sy(g.y)})`}>
                    {isNext && <circle r={15} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="3 3" />}
                    <circle r={11} fill={colorOf(groupIds[i])} stroke="#fff" strokeWidth={2} style={{ transition: 'fill 0.35s' }}>
                      <title>{g.name}</title>
                    </circle>
                    <text y={4.5} textAnchor="middle" fontSize={12}>{g.emoji}</text>
                    <text y={24} textAnchor="middle" fontSize={9} fill="var(--color-muted)">{g.name}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* 樹狀圖 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">併桌履歷（樹狀圖）——橫桿高度 = 併桌時兩群多不熟</div>
            <svg viewBox={`0 0 ${DW} ${DH}`} className="w-full rounded-xl border border-line bg-cream">
              <line x1={DPAD_L} y1={20} x2={DPAD_L} y2={DH - DPAD_B} stroke="var(--color-line)" />
              <line x1={DPAD_L} y1={DH - DPAD_B} x2={DW - 10} y2={DH - DPAD_B} stroke="var(--color-line)" />
              <text x={10} y={16} fontSize={10} fill="var(--color-muted)">生疏度</text>
              {edges.filter((e) => e.step < upTo).map((e, i) => (
                <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="var(--color-brand-soft)" strokeWidth={2} />
              ))}
              {leafOrder.map((leaf, i) => (
                <g key={leaf} transform={`translate(${leafX(i)},${distY(0)})`}>
                  <circle r={7} fill={colorOf(groupIds[leaf])} stroke="#fff" strokeWidth={1.5} style={{ transition: 'fill 0.35s' }} />
                  <text y={3.5} textAnchor="middle" fontSize={8}>{GUESTS[leaf].emoji}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={stepMerge} disabled={playing || upTo >= STEPS.length}>🤝 併下一桌</Button>
          <Button variant="outline" onClick={autoPlay} disabled={playing || upTo >= STEPS.length}>▶ 自動併完</Button>
          <Button variant="ghost" onClick={reset} disabled={playing}>⏮ 重來</Button>
          <span className="text-xs text-muted">已併 {upTo} / {STEPS.length} 次</span>
        </div>

        <div className="mt-3 rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
          {next ? (
            <p>👉 下一步：<b className="text-ink">{nameList(nextA)}</b> 和 <b className="text-ink">{nameList(nextB)}</b> 是目前全場最熟的兩群
              （平均生疏度 {next.dist.toFixed(1)}）。
              {next.members.includes(9) && nextA.length + nextB.length > 2 && (
                <b className="text-brand">　🎩 注意——三叔公終於要被併進來了，而且橫桿特別高：他跟誰都不熟，是撐到最後才勉強入桌的。</b>
              )}</p>
          ) : (
            <p>✅ 全場併成一大桌，併桌履歷完成！觀察樹狀圖：<b className="text-ink">低處的橫桿</b>是「本來就熟」的自然小圈圈，
              <b className="text-ink">高處的橫桿</b>是硬湊的（尤其 🎩 三叔公那一桿）。接著到 Step 2 決定開幾桌。</p>
          )}
        </div>
      </Section>

      <Section
        title="Step 2｜切一刀，決定開幾桌"
        description="這是階層式分群的殺手鐗：樹已經長好，你隨時可以反悔桌數——拉動切割線，桌次名單即時重排，完全不用重新計算。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <svg viewBox={`0 0 ${DW} ${DH}`} className="w-full rounded-xl border border-line bg-cream">
              <line x1={DPAD_L} y1={20} x2={DPAD_L} y2={DH - DPAD_B} stroke="var(--color-line)" />
              <line x1={DPAD_L} y1={DH - DPAD_B} x2={DW - 10} y2={DH - DPAD_B} stroke="var(--color-line)" />
              {edges.map((e, i) => (
                <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="var(--color-brand-soft)" strokeWidth={2} />
              ))}
              {leafOrder.map((leaf, i) => (
                <g key={leaf} transform={`translate(${leafX(i)},${distY(0)})`}>
                  <circle r={7} fill={COLORS[tableIds[leaf] % COLORS.length]} stroke="#fff" strokeWidth={1.5} style={{ transition: 'fill 0.2s' }} />
                  <text y={3.5} textAnchor="middle" fontSize={8}>{GUESTS[leaf].emoji}</text>
                </g>
              ))}
              <line x1={DPAD_L} y1={distY(cutDist)} x2={DW - 10} y2={distY(cutDist)} stroke="var(--color-ink)" strokeWidth={2} strokeDasharray="6 4" />
              <text x={DW - 12} y={distY(cutDist) - 5} textAnchor="end" fontSize={10} fill="var(--color-ink)">✂️ 切這裡 → {tables.length} 桌</text>
            </svg>
            <div className="mt-3">
              <Slider label="切割高度（多生疏就該分桌）" min={0} max={maxDist * 1.05} step={maxDist / 100} value={cutDist} onChange={setCutDist} format={(v) => v.toFixed(1)} />
            </div>
          </div>

          {/* 桌次名單 */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-muted">📋 桌次名單（共 {tables.length} 桌）</div>
            {tables.map((tbl, i) => (
              <div key={i} className="rounded-xl border border-line bg-cream p-3">
                <span className="text-xs text-muted">第 {i + 1} 桌（{tbl.length} 人）</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {tbl.map((gi) => (
                    <span key={gi} className="rounded-full bg-white px-2 py-0.5 text-xs text-ink">
                      {GUESTS[gi].emoji} {GUESTS[gi].name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">怎麼切最自然？</b>{' '}
        找樹狀圖上<b className="text-ink">直桿特別長的地方</b>切下去——那代表「再往上併就要把很生疏的人湊一桌了」。
        這正是階層式分群贏過 K-means 的地方：<b className="text-brand">不用事先決定桌數，樹長好之後隨你反悔</b>。
        代價是計算量大（每一步都要算所有群兩兩的距離），賓客名單一長就吃力——
        所以實務上：資料小、想探索結構用階層式；資料大、心裡有數用 K-means。
      </div>
    </LessonLayout>
  )
}
