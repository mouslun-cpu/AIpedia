import { useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { clamp, linearScale, lerpColor, pointerToSvg, RGB } from '../../lib/plot'

// 情境：猜你喜不喜歡一家新餐廳。x = 價位、y = 辣度。
// 每個點是你「吃過」的店：c=0（綠）你喜歡、c=1（紅）你不喜歡。
// 邊界刻意犬牙交錯，KNN 才有看頭。
const PTS: { x: number; y: number; c: 0 | 1 }[] = [
  { x: 0.2, y: 0.25, c: 0 }, { x: 0.3, y: 0.35, c: 0 }, { x: 0.18, y: 0.5, c: 0 },
  { x: 0.32, y: 0.6, c: 0 }, { x: 0.25, y: 0.72, c: 0 }, { x: 0.42, y: 0.28, c: 0 },
  { x: 0.45, y: 0.5, c: 0 }, { x: 0.55, y: 0.7, c: 0 },
  { x: 0.78, y: 0.75, c: 1 }, { x: 0.68, y: 0.62, c: 1 }, { x: 0.82, y: 0.55, c: 1 },
  { x: 0.6, y: 0.35, c: 1 }, { x: 0.72, y: 0.4, c: 1 }, { x: 0.85, y: 0.3, c: 1 },
  { x: 0.55, y: 0.22, c: 1 }, { x: 0.7, y: 0.85, c: 1 },
]

const S = 360
const PAD = 24
const sx = linearScale([0, 1], [PAD, S - PAD])
const sy = linearScale([0, 1], [S - PAD, PAD])
const GRID = 26

function nearestK(x: number, y: number, k: number) {
  return PTS.map((p, i) => ({ i, d: (p.x - x) ** 2 + (p.y - y) ** 2, c: p.c }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
}
function classify(x: number, y: number, k: number): 0 | 1 {
  const nn = nearestK(x, y, k)
  const votes = nn.reduce((s, n) => s + n.c, 0)
  return votes * 2 > k ? 1 : 0
}

export function KNN() {
  const [k, setK] = useState(3)
  const [query, setQuery] = useState({ x: 0.5, y: 0.5 })
  const [showMap, setShowMap] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  const neighbors = nearestK(query.x, query.y, k)
  const redVotes = neighbors.reduce((s, n) => s + n.c, 0) // 不喜歡票數
  const blueVotes = k - redVotes // 喜歡票數
  const predicted: 0 | 1 = redVotes > blueVotes ? 1 : 0

  const cellW = (S - 2 * PAD) / GRID
  const map = useMemo(() => {
    if (!showMap) return []
    const out: { x: number; y: number; c: 0 | 1 }[] = []
    for (let i = 0; i < GRID; i++)
      for (let j = 0; j < GRID; j++) {
        const gx = (i + 0.5) / GRID
        const gy = (j + 0.5) / GRID
        out.push({ x: gx, y: gy, c: classify(gx, gy, k) })
      }
    return out
  }, [showMap, k])

  function moveTo(e: React.PointerEvent) {
    if (!svgRef.current) return
    const { x, y } = pointerToSvg(e, svgRef.current)
    setQuery({ x: clamp(sx.invert(x), 0, 1), y: clamp(sy.invert(y), 0, 1) })
  }

  return (
    <LessonLayout slug="knn">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        朋友揪你去一家<b className="text-ink">沒吃過的新餐廳</b>，你會喜歡嗎？
        最直覺的猜法是——<b className="text-ink">「跟我以前吃過、口味最像的幾家店，我大多喜歡還是討厭？」</b>
        這就是 KNN：把新餐廳跟你吃過的店比一比，找出<b className="text-brand">口味最接近的 K 家</b>，
        它們大多是你喜歡的，就猜你會喜歡。它甚至不用「訓練」，直接比距離就能判斷。
      </div>

      <Section
        title="拖曳灰色問號點（一家新餐廳），看它問最像的幾家店"
        description="灰點是你還沒吃過的新店，位置代表它的價位和辣度。它會連到你吃過、口味最接近的 K 家店，數數看『喜歡』和『不喜歡』哪邊多，就猜自己會不會喜歡這家新店。"
      >
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${S} ${S}`}
              className="w-full touch-none rounded-xl border border-line bg-cream"
              onPointerDown={(e) => { dragging.current = true; moveTo(e) }}
              onPointerMove={(e) => dragging.current && moveTo(e)}
              onPointerUp={() => (dragging.current = false)}
              onPointerLeave={() => (dragging.current = false)}
            >
              {/* 口味地圖 */}
              {map.map((c, i) => (
                <rect key={i} x={sx(c.x) - cellW / 2} y={sy(c.y) - cellW / 2} width={cellW + 0.5} height={cellW + 0.5}
                  fill={lerpColor(RGB.brand, RGB.red, c.c)} opacity={0.16} />
              ))}
              {/* 連到鄰居的線 */}
              {neighbors.map((n) => (
                <line key={n.i} x1={sx(query.x)} y1={sy(query.y)} x2={sx(PTS[n.i].x)} y2={sy(PTS[n.i].y)}
                  stroke="var(--color-muted)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
              ))}
              {/* 吃過的店 */}
              {PTS.map((p, i) => {
                const isN = neighbors.some((n) => n.i === i)
                return (
                  <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={isN ? 9 : 6.5}
                    fill={p.c === 1 ? 'var(--color-red)' : 'var(--color-brand)'}
                    stroke={isN ? 'var(--color-ink)' : '#fff'} strokeWidth={isN ? 2.5 : 1.5}
                    style={{ transition: 'r 0.1s' }}>
                    <title>{`價位 ${(p.x * 100).toFixed(0)}／辣度 ${(p.y * 100).toFixed(0)} → 你${p.c === 1 ? '不喜歡' : '喜歡'}`}</title>
                  </circle>
                )
              })}
              {/* 新餐廳（查詢點） */}
              <circle cx={sx(query.x)} cy={sy(query.y)} r={11}
                fill={predicted === 1 ? 'var(--color-red)' : 'var(--color-brand)'}
                stroke="var(--color-ink)" strokeWidth={2.5} className="cursor-grab active:cursor-grabbing" />
              <text x={sx(query.x)} y={sy(query.y) + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">?</text>
              <text x={S / 2} y={S - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted)">💰 價位 →</text>
              <text x={12} y={S / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)" transform={`rotate(-90,12,${S / 2})`}>🌶️ 辣度 →</text>
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" /> 你喜歡的店
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red" /> 你不喜歡的店
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Slider label="K（要問幾家最像的店）" min={1} max={9} step={2} value={k} onChange={setK} suffix="家" />
            <p className="-mt-2 text-xs text-muted">K 通常取奇數，投票才不會平手。</p>

            <div className="rounded-xl border border-line p-4">
              <div className="text-sm text-muted">最像的 {k} 家店，你的評價</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-mono text-brand">
                  <span className="inline-block h-3 w-3 rounded-full bg-brand" />喜歡 {blueVotes}
                </span>
                <span className="text-muted">vs</span>
                <span className="flex items-center gap-1.5 font-mono text-red">
                  <span className="inline-block h-3 w-3 rounded-full bg-red" />不喜歡 {redVotes}
                </span>
              </div>
              <div className="mt-3 text-sm">
                猜你會{' '}
                <b style={{ color: predicted === 1 ? 'var(--color-red)' : 'var(--color-brand)' }}>
                  {predicted === 1 ? '不喜歡' : '喜歡'}
                </b>
                {' '}這家新店
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} />
              顯示口味地圖（每種價位／辣度，會被猜成喜歡還是不喜歡）
            </label>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">要問幾家店（K）才好？</b>{' '}
        K 設成 1，就只看<b className="text-ink">最像的那一家</b>——萬一那家剛好是踩雷特例，你就被它一個人帶偏了
        （打開口味地圖，看邊界有多破碎）。
        K 太大則會把<b className="text-ink">口味差很多的店</b>也硬拉進來投票，變得遲鈍。
        這又是一次<b className="text-ink">太敏感 vs 太遲鈍</b>的取捨，呼應了「欠擬合與過擬合」。
      </div>
    </LessonLayout>
  )
}
