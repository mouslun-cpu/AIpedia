import { useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { clamp, linearScale, pointerToSvg } from '../../lib/plot'
import { lineBoxIntersect, trainSVM, type Point } from './svm'

const INIT: Point[] = [
  { x: 0.3, y: 0.62, label: 1 },
  { x: 0.24, y: 0.76, label: 1 },
  { x: 0.42, y: 0.7, label: 1 },
  { x: 0.33, y: 0.86, label: 1 },
  { x: 0.2, y: 0.55, label: 1 },
  { x: 0.66, y: 0.36, label: -1 },
  { x: 0.72, y: 0.24, label: -1 },
  { x: 0.58, y: 0.32, label: -1 },
  { x: 0.8, y: 0.42, label: -1 },
  { x: 0.68, y: 0.46, label: -1 },
]

const W = 400
const H = 400
const PAD = 28
const sx = linearScale([0, 1], [PAD, W - PAD])
const sy = linearScale([0, 1], [H - PAD, PAD]) // y 軸翻轉

function colorFor(label: 1 | -1) {
  return label === 1 ? 'var(--color-brand)' : 'var(--color-red)'
}

export function SVM() {
  const [points, setPoints] = useState<Point[]>(() =>
    INIT.map((p) => ({ ...p })),
  )
  const [C, setC] = useState(6)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragIdx = useRef<number | null>(null)

  const svm = useMemo(() => trainSVM(points, C), [points, C])
  const [w0, w1] = svm.w
  const b = svm.b

  // 邊界線與間隔線在方框內的端點
  const boundary = lineBoxIntersect(w0, w1, b) // w·x + b = 0
  const marginPos = lineBoxIntersect(w0, w1, b - 1) // = +1
  const marginNeg = lineBoxIntersect(w0, w1, b + 1) // = −1

  // 間隔帶（兩條間隔線之間）多邊形，用角度排序成凸多邊形
  const bandPts = [...marginPos, ...marginNeg]
  let bandPath = ''
  if (bandPts.length === 4) {
    const cx = bandPts.reduce((s, p) => s + p[0], 0) / 4
    const cy = bandPts.reduce((s, p) => s + p[1], 0) / 4
    const ordered = [...bandPts].sort(
      (a, z) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(z[1] - cy, z[0] - cx),
    )
    bandPath =
      ordered
        .map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`)
        .join(' ') + ' Z'
  }

  const line = (pts: [number, number][]) =>
    pts.length === 2
      ? `M${sx(pts[0][0])},${sy(pts[0][1])} L${sx(pts[1][0])},${sy(pts[1][1])}`
      : ''

  function onPointerDown(i: number) {
    dragIdx.current = i
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragIdx.current === null || !svgRef.current) return
    const { x, y } = pointerToSvg(e, svgRef.current)
    const dx = clamp(sx.invert(x), 0.05, 0.95)
    const dy = clamp(sy.invert(y), 0.05, 0.95)
    setPoints((prev) =>
      prev.map((p, idx) => (idx === dragIdx.current ? { ...p, x: dx, y: dy } : p)),
    )
  }
  function endDrag() {
    dragIdx.current = null
  }

  const supportCount = svm.isSupport.filter(Boolean).length

  return (
    <LessonLayout slug="svm">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        果農要把兩種水果分堆：一堆 <b className="text-brand">🍋 檸檬</b>、一堆 <b className="text-red">🍊 柳橙</b>。
        牠們的差別在<b className="text-ink">大小</b>和<b className="text-ink">酸度</b>——
        檸檬通常小又酸，柳橙大又甜。你想在中間畫一條分界線，
        以後來一顆新水果，看它落在線的哪邊就知道是哪種。
        能分開的線有無限多條，SVM 的堅持是：找出<b className="text-ink">「離兩堆都最遠」</b>的那一條——
        中間那條<b className="text-brand">最寬的安全街道</b>。街道越寬，以後新水果越不容易被分錯。
        試著<b className="text-ink">拖曳任何一顆水果</b>，看分界線怎麼跟著變。
      </div>

      <Section>
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full touch-none rounded-xl border border-line bg-cream"
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
            >
              {/* 間隔帶 */}
              {bandPath && (
                <path d={bandPath} fill="var(--color-brand-pale)" opacity={0.25} />
              )}

              {/* 間隔線（虛線）*/}
              <path d={line(marginPos)} stroke="var(--color-brand-soft)" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
              <path d={line(marginNeg)} stroke="var(--color-brand-soft)" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />

              {/* 決策邊界（實線）*/}
              <path d={line(boundary)} stroke="var(--color-ink)" strokeWidth={2.5} fill="none" />

              {/* 資料點 */}
              {points.map((p, i) => (
                <g key={i}>
                  {svm.isSupport[i] && (
                    <circle
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={12}
                      fill="none"
                      stroke={colorFor(p.label)}
                      strokeWidth={2}
                      opacity={0.5}
                    />
                  )}
                  <circle
                    cx={sx(p.x)}
                    cy={sy(p.y)}
                    r={8}
                    fill={colorFor(p.label)}
                    stroke="#fff"
                    strokeWidth={2}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={() => onPointerDown(i)}
                  >
                    <title>{`大小 ${(p.x * 100).toFixed(0)}／酸度 ${(p.y * 100).toFixed(0)} → ${p.label === 1 ? '🍋 檸檬' : '🍊 柳橙'}`}</title>
                  </circle>
                </g>
              ))}
              <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted)">📏 大小 →</text>
              <text x={12} y={H / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)" transform={`rotate(-90,12,${H / 2})`}>🫤 酸度 →</text>
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" /> 🍋 檸檬（小又酸）
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red" /> 🍊 柳橙（大又甜）
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-brand-soft" />
                支持向量（撐住街道的水果）
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
              <p>
                黑色實線是<b className="text-ink">分界線</b>（決策邊界），
                兩條虛線之間的淺藍區域就是<b className="text-brand">安全街道（間隔 margin）</b>。
                只有<b className="text-ink">壓在虛線上、最靠近對方那幾顆水果</b>
                （被圈起來的）真正決定了分界線的位置——
                這些「邊緣個案」就是「<b className="text-ink">支持向量</b>」，
                SVM 的名字正是由此而來。
              </p>
            </div>

            <Slider
              label="容錯程度 C（左：寬鬆 → 右：嚴格）"
              min={1}
              max={20}
              value={C}
              onChange={setC}
              format={(v) => v.toFixed(0)}
            />
            <p className="-mt-2 text-xs leading-relaxed text-muted">
              C 越小，SVM 越願意容忍少數幾顆水果站錯邊、換取更寬的街道；
              C 越大，越堅持每顆都分對、街道因此變窄。
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">街道寬度</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-brand">
                  {svm.margin.toFixed(3)}
                </div>
              </div>
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">支持向量數</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-ink">
                  {supportCount}
                </div>
              </div>
            </div>

            <div>
              <Button
                variant="outline"
                onClick={() => setPoints(INIT.map((p) => ({ ...p })))}
              >
                重置水果
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-10 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">動手試試：</b>{' '}
        把一顆離分界線很遠的水果（例如很典型的大柳橙）拖來拖去，你會發現分界線
        <b className="text-ink">完全不動</b>——因為它不是支持向量。
        但只要你去拖動被圈起來的<b className="text-ink">邊緣水果</b>，整條街道立刻跟著改變。
        這說明 SVM 的分界線<b className="text-ink">只由最靠近的那幾顆「邊緣個案」決定</b>，
        典型、好分的水果反而沒有發言權。
      </div>
    </LessonLayout>
  )
}
