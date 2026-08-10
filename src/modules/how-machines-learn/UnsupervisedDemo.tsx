import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Slider } from '../../components/ui/Slider'

// 全班同學的「讀書時間 × 社交活躍度」——但機器事先不知道誰該跟誰同一群。
const SEED_CLUSTERS = [
  { cx: 28, cy: 30, n: 7 },
  { cx: 72, cy: 35, n: 7 },
  { cx: 50, cy: 75, n: 7 },
]

function makePoints(): number[][] {
  const pts: number[][] = []
  let seed = 42
  const rand = () => {
    // 固定亂數，讓每次載入的點一樣
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return (seed / 0x7fffffff) * 2 - 1
  }
  for (const c of SEED_CLUSTERS) {
    for (let i = 0; i < c.n; i++) {
      pts.push([c.cx + rand() * 16, c.cy + rand() * 16])
    }
  }
  return pts
}

const CLUSTER_COLORS = [
  'var(--color-brand)',
  'var(--color-orange)',
  'var(--color-teal)',
  'var(--color-coral)',
]

const S = 300
const PAD = 24
const px = (v: number) => PAD + (v / 100) * (S - 2 * PAD)
const py = (v: number) => S - PAD - (v / 100) * (S - 2 * PAD)

export function UnsupervisedDemo() {
  const [points] = useState(makePoints)
  const [k, setK] = useState(3)
  const [centroids, setCentroids] = useState<number[][]>([])
  const [assign, setAssign] = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const timer = useRef<number | null>(null)

  // 清掉計時器
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  function reset() {
    if (timer.current) clearInterval(timer.current)
    setCentroids([])
    setAssign([])
    setRunning(false)
    setDone(false)
  }

  function start() {
    if (timer.current) clearInterval(timer.current)
    setDone(false)
    setRunning(true)

    // 初始中心：從資料中挑 k 個分散的點
    let cs: number[][] = []
    const step = Math.floor(points.length / k)
    for (let i = 0; i < k; i++) cs.push([...points[i * step]])
    setCentroids(cs)

    let iter = 0
    timer.current = window.setInterval(() => {
      // 指派：每個點歸給最近的中心
      const a = points.map((p) => {
        let best = 0
        let bestD = Infinity
        cs.forEach((c, ci) => {
          const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2
          if (d < bestD) {
            bestD = d
            best = ci
          }
        })
        return best
      })
      setAssign(a)

      // 更新中心：移到該群的平均位置
      const next = cs.map((c, ci) => {
        const members = points.filter((_, i) => a[i] === ci)
        if (!members.length) return c
        const mx = members.reduce((s, p) => s + p[0], 0) / members.length
        const my = members.reduce((s, p) => s + p[1], 0) / members.length
        return [mx, my]
      })
      cs = next
      setCentroids(next.map((c) => [...c]))

      iter++
      if (iter >= 8) {
        clearInterval(timer.current!)
        timer.current = null
        setRunning(false)
        setDone(true)
      }
    }, 550)
  }

  return (
    <div className="grid gap-5 md:grid-cols-[300px_1fr]">
      <svg
        viewBox={`0 0 ${S} ${S}`}
        className="w-full rounded-xl border border-line bg-cream"
      >
        <text x={S / 2} y={S - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted)">讀書時間 →</text>
        <text x={12} y={S / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)" transform={`rotate(-90, 12, ${S / 2})`}>社交活躍度 →</text>

        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={px(x)}
            cy={py(y)}
            r={6}
            fill={assign.length ? CLUSTER_COLORS[assign[i]] : '#B4BEC2'}
            stroke="#fff"
            strokeWidth={1.2}
            style={{ transition: 'fill 0.4s' }}
          />
        ))}
        {centroids.map(([x, y], i) => (
          <g key={i} style={{ transition: 'all 0.5s' }}>
            <line
              x1={px(x) - 7}
              y1={py(y)}
              x2={px(x) + 7}
              y2={py(y)}
              stroke={CLUSTER_COLORS[i]}
              strokeWidth={3}
            />
            <line
              x1={px(x)}
              y1={py(y) - 7}
              x2={px(x)}
              y2={py(y) + 7}
              stroke={CLUSTER_COLORS[i]}
              strokeWidth={3}
            />
          </g>
        ))}
      </svg>

      <div className="flex flex-col justify-center gap-4">
        <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
          {!assign.length && (
            <p>
              <b className="text-ink">非監督式學習</b>{' '}
              的資料<b className="text-ink">沒有答案</b>——
              上面是全班同學的讀書時間和社交活躍度，但機器完全不知道誰該跟誰分一組。
              它的任務是自己找出「哪些同學比較像」，把全班分成幾個讀書小組。
            </p>
          )}
          {running && (
            <p>
              機器正在反覆做兩件事：先把每位同學分給
              <b className="text-ink">最近的組別中心（十字）</b>，
              再把中心移到那一組的正中央……如此來回，分組就慢慢浮現了。
            </p>
          )}
          {done && (
            <p>
              分好了！機器在<b className="text-ink">完全沒人告訴它誰是誰</b>的情況下，
              光靠「特質相近」就把全班自動分成了 {k} 組。
              現實中類似的方法常被用來做<b className="text-ink">客群分眾</b>、
              <b className="text-ink">興趣推薦</b>等等。
            </p>
          )}
        </div>

        <Slider
          label="要分成幾組（K）"
          min={2}
          max={4}
          value={k}
          onChange={(v) => {
            setK(v)
            reset()
          }}
          suffix="組"
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={start} disabled={running}>
            {done ? '重新分組' : '開始分組'}
          </Button>
          {(done || running) && (
            <Button variant="ghost" onClick={reset} disabled={running}>
              重置
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
