import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { linearScale } from '../../lib/plot'
import { polyfit } from '../../lib/polyfit'

// 一組明顯「彎曲」的資料：直線一定擬合得很差，需要曲線才貼得上。
// 借用「一天的氣溫變化」情境：x = 一天的時間比例（6:00 ~ 22:00），y = 氣溫。
const XS = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]
const YS = [0.26, 0.44, 0.63, 0.77, 0.84, 0.82, 0.69, 0.52, 0.36, 0.24]

const W = 460
const H = 340
const PAD = 34
const sx = linearScale([0, 1], [PAD, W - PAD])
const sy = linearScale([0, 1], [H - PAD, PAD])

// 純粹用來把 0~1 的抽象座標，轉成看得懂的時間與氣溫顯示文字
function timeLabel(x: number) {
  const totalMin = Math.round((6 + x * 16) * 60)
  const hh = Math.floor(totalMin / 60)
  const mm = totalMin % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
function tempLabel(y: number) {
  return `${Math.round(20 + y * 15)}°C`
}

const DEGREE_NOTE: Record<number, string> = {
  1: '一次 = 直線。氣溫只能一路上升或一路下降，完全跟不上「先變熱、再變涼」的彎曲。',
  2: '二次 = 拋物線。有了一個彎，終於能貼上「白天先熱後涼」這種單峰的形狀了。',
  3: '三次。彎曲更靈活，通常已經很貼合。',
}

export function PolynomialRegression() {
  const [degree, setDegree] = useState(1)

  const curve = useMemo(() => {
    const model = polyfit(XS, YS, degree)
    const pts: string[] = []
    for (let i = 0; i <= 160; i++) {
      const x = i / 160
      pts.push(`${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(model.predict(x)).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [degree])

  const note =
    DEGREE_NOTE[degree] ??
    `${degree} 次。彎來彎去幾乎穿過每一個點——但這麼高的次數，小心開始「死背」雜訊了（見「欠擬合與過擬合」）。`

  return (
    <LessonLayout slug="polynomial-regression">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        想像記錄一天的<b className="text-ink">氣溫變化</b>：清晨較涼、中午最熱、
        傍晚又降下來——先變熱、再變涼，不是一路往上或一路往下的<b className="text-brand">拋物線</b>形狀。
        這種「先變化方向、再變回來」的資料，
        直線就描述不好了，需要讓線<b className="text-brand">彎</b>起來。
        上一課我們都在畫<b className="text-ink">直線</b>，但真實世界的資料常常是彎的。
        這時候只要在公式裡多加幾項
        （x²、x³…），線就能<b className="text-brand">彎起來</b>去貼合資料。
        加的項數越多（次數越高），線能彎得越厲害。
      </div>

      <Section
        title="拉一下次數，看直線怎麼變成曲線"
        description="橫軸是一天的時間（6:00 → 22:00），縱軸是氣溫。從 1 次開始，每加一次，線就多一個可以彎的地方。觀察它從「一條斜線」慢慢變成能穿過資料、貼合「先熱後涼」的曲線。"
      >
        <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-cream">
            <defs>
              <clipPath id="polyClip">
                <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
              </clipPath>
            </defs>
            <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke="var(--color-line)" />
            <path d={curve} fill="none" stroke="var(--color-brand)" strokeWidth={3} clipPath="url(#polyClip)" />
            {XS.map((x, i) => (
              <circle key={i} cx={sx(x)} cy={sy(YS[i])} r={5.5} fill="var(--color-ink)" stroke="#fff" strokeWidth={1.5}>
                <title>{`${timeLabel(x)} → 氣溫 ${tempLabel(YS[i])}`}</title>
              </circle>
            ))}
            <text x={sx(0)} y={H - 10} textAnchor="start" fontSize={11} fill="var(--color-muted)">🕕 {timeLabel(0)}</text>
            <text x={sx(0.5)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--color-muted)">☀️ {timeLabel(0.5)}</text>
            <text x={sx(1)} y={H - 10} textAnchor="end" fontSize={11} fill="var(--color-muted)">🌙 {timeLabel(1)}</text>
            <text x={sx(0) - 6} y={sy(1) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)">{tempLabel(1)}</text>
            <text x={sx(0) - 6} y={sy(0) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)">{tempLabel(0)}</text>
          </svg>

          <div className="flex flex-col gap-5">
            <Slider label="多項式次數" min={1} max={8} value={degree} onChange={setDegree} suffix="次" />
            <div className="rounded-xl bg-cream p-4">
              <div className="font-mono text-sm text-brand">
                y = w₀ + w₁x{degree >= 2 && ' + w₂x²'}
                {degree >= 3 && ' + w₃x³'}
                {degree >= 4 && ' + …'}
              </div>
            </div>
            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              {note}
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">彎得越厲害，就一定越好嗎？</b>{' '}
        把次數拉到 7、8，你會看到線開始<b className="text-ink">刻意扭曲</b>去穿過每一個點。
        看起來很完美，其實它已經在「死背」而不是「學規律」了。
        這個陷阱有一個專門的名字——<b className="text-brand">過擬合</b>，
        就是「模型評估與調校」那一層要處理的問題。
      </div>
    </LessonLayout>
  )
}
