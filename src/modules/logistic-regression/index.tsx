import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale, lerpColor, RGB } from '../../lib/plot'

// 情境：預測學生「會不會及格」。
// x = 每週讀書時數（0~20 小時）、y = 上課出席率（0~100%）。
// c = 1 → 及格（綠 / brand，集中在右上：讀得多又常出席）
// c = 0 → 不及格（紅 / red，集中在左下）
const PTS: { x: number; y: number; c: 0 | 1 }[] = [
  { x: 0.2, y: 0.3, c: 0 },
  { x: 0.3, y: 0.24, c: 0 },
  { x: 0.25, y: 0.46, c: 0 },
  { x: 0.15, y: 0.36, c: 0 },
  { x: 0.36, y: 0.42, c: 0 },
  { x: 0.28, y: 0.2, c: 0 },
  { x: 0.7, y: 0.74, c: 1 },
  { x: 0.76, y: 0.6, c: 1 },
  { x: 0.65, y: 0.82, c: 1 },
  { x: 0.82, y: 0.7, c: 1 },
  { x: 0.72, y: 0.55, c: 1 },
  { x: 0.6, y: 0.72, c: 1 },
]

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

// 把 0~1 的座標，轉成看得懂的「時數 / 出席率」文字
const hoursLabel = (x: number) => `${(x * 20).toFixed(0)} 小時`
const attendLabel = (y: number) => `${(y * 100).toFixed(0)}%`

const S = 340
const PAD = 28
const sx = linearScale([0, 1], [PAD, S - PAD])
const sy = linearScale([0, 1], [S - PAD, PAD])
const GRID = 18 // 背景機率場的解析度

interface Boundary {
  theta: number // 邊界法線角度
  offset: number // 邊界位置
  steep: number // 陡峭度（信心轉變快慢）
}

// 機率：把「點到邊界的帶號距離」丟進 sigmoid（回傳「及格」的機率）
function probAt(x: number, y: number, b: Boundary) {
  const d = Math.cos(b.theta) * x + Math.sin(b.theta) * y - b.offset
  return sigmoid(b.steep * d)
}

// 用梯度下降訓練 logistic regression，回傳最佳邊界
function trainLogistic(): Boundary {
  let w0 = 0
  let w1 = 0
  let bias = 0
  const lr = 0.5
  for (let it = 0; it < 4000; it++) {
    let g0 = 0
    let g1 = 0
    let gb = 0
    for (const p of PTS) {
      const pred = sigmoid(w0 * p.x + w1 * p.y + bias)
      const err = pred - p.c
      g0 += err * p.x
      g1 += err * p.y
      gb += err
    }
    const n = PTS.length
    w0 -= (lr * g0) / n
    w1 -= (lr * g1) / n
    bias -= (lr * gb) / n
  }
  const steep = Math.hypot(w0, w1)
  return {
    theta: Math.atan2(w1, w0),
    offset: -bias / (steep || 1),
    steep,
  }
}

const TRAINED = trainLogistic()

export function LogisticRegression() {
  const [b, setB] = useState<Boundary>({ theta: 0.9, offset: 0.5, steep: 6 })

  // 背景機率場
  const cells = useMemo(() => {
    const out: { x: number; y: number; p: number }[] = []
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const gx = (i + 0.5) / GRID
        const gy = (j + 0.5) / GRID
        out.push({ x: gx, y: gy, p: probAt(gx, gy, b) })
      }
    }
    return out
  }, [b])

  const cellW = (S - 2 * PAD) / GRID

  // 邊界線（cosθ·x + sinθ·y = offset）與方框的交點
  const nx = Math.cos(b.theta)
  const ny = Math.sin(b.theta)
  const linePts: [number, number][] = []
  const pushIf = (x: number, y: number) => {
    if (x >= -1e-6 && x <= 1.000001 && y >= -1e-6 && y <= 1.000001)
      linePts.push([x, y])
  }
  if (Math.abs(ny) > 1e-6) {
    pushIf(0, (b.offset - nx * 0) / ny)
    pushIf(1, (b.offset - nx * 1) / ny)
  }
  if (Math.abs(nx) > 1e-6) {
    pushIf((b.offset - ny * 0) / nx, 0)
    pushIf((b.offset - ny * 1) / nx, 1)
  }

  const accuracy =
    PTS.filter((p) => (probAt(p.x, p.y, b) >= 0.5 ? 1 : 0) === p.c).length /
    PTS.length

  // 側邊 sigmoid 曲線
  const SW = 320
  const SH = 160
  const sigX = linearScale([-0.6, 0.6], [40, SW - 10])
  const sigY = linearScale([0, 1], [SH - 30, 12])
  const sigPath = Array.from({ length: 80 }, (_, i) => {
    const d = -0.6 + (1.2 * i) / 79
    return `${i ? 'L' : 'M'}${sigX(d).toFixed(1)},${sigY(sigmoid(b.steep * d)).toFixed(1)}`
  }).join(' ')

  return (
    <LessonLayout slug="logistic-regression">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        期末考前，老師想先預測<b className="text-ink">「每個學生會不會及格」</b>。
        手上有兩個線索：<b className="text-ink">每週讀書時數</b>和<b className="text-ink">上課出席率</b>。
        把過去的學生畫成一個個點——讀得多又常來上課的（右上）大多<b className="text-brand">及格</b>，
        兩者都低的（左下）容易<b className="text-red">不及格</b>。
        邏輯回歸做兩件事：先畫一條<b className="text-brand">及格門檻線</b>（決策邊界）把兩群分開；
        再用一個叫 <b className="text-ink">sigmoid</b> 的工具，把「離門檻線多遠」
        翻譯成<b className="text-brand">「及格機率有多高」</b>。
        離線越遠越有把握，剛好踩在線上就是五五波（50%）。
      </div>

      <Section
        title="背景顏色 = 機器預測的及格機率"
        description="偏綠代表機器覺得會及格、偏紅代表會不及格，中間白色的過渡帶就是它「不太確定」的地方。拖動下面的滑桿移動及格門檻線，或直接按自動訓練，讓機器自己從資料找出最合理的門檻。"
      >
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div>
            <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
              {/* 機率場 */}
              {cells.map((c, i) => (
                <rect
                  key={i}
                  x={sx(c.x) - cellW / 2}
                  y={sy(c.y) - cellW / 2}
                  width={cellW + 0.5}
                  height={cellW + 0.5}
                  fill={lerpColor(RGB.red, RGB.brand, c.p)}
                  opacity={0.3}
                />
              ))}
              {/* 決策邊界 */}
              {linePts.length >= 2 && (
                <line
                  x1={sx(linePts[0][0])}
                  y1={sy(linePts[0][1])}
                  x2={sx(linePts[1][0])}
                  y2={sy(linePts[1][1])}
                  stroke="var(--color-ink)"
                  strokeWidth={2.5}
                />
              )}
              {/* 資料點 */}
              {PTS.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(p.x)}
                  cy={sy(p.y)}
                  r={7}
                  fill={p.c === 1 ? 'var(--color-brand)' : 'var(--color-red)'}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <title>{`讀書 ${hoursLabel(p.x)}／出席 ${attendLabel(p.y)} → ${p.c === 1 ? '及格' : '不及格'}`}</title>
                </circle>
              ))}
              {/* 座標軸說明 */}
              <text x={S / 2} y={S - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted)">📚 每週讀書時數 →</text>
              <text x={12} y={S / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)" transform={`rotate(-90,12,${S / 2})`}>🙋 出席率 →</text>
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" /> 及格
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red" /> 不及格
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-ink" /> 及格門檻線
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Slider label="門檻線角度（看重讀書還是出席）" min={0} max={Math.PI} step={0.02} value={b.theta} onChange={(v) => setB({ ...b, theta: v })} format={(v) => `${Math.round((v * 180) / Math.PI)}°`} />
            <Slider label="門檻高低（標準嚴不嚴）" min={0.1} max={0.9} step={0.01} value={b.offset} onChange={(v) => setB({ ...b, offset: v })} format={(v) => v.toFixed(2)} />
            <Slider label="評分果斷度（sigmoid 有多陡）" min={1} max={20} step={0.5} value={b.steep} onChange={(v) => setB({ ...b, steep: v })} format={(v) => v.toFixed(1)} />

            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-muted">預測正確率</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-ink">
                {(accuracy * 100).toFixed(0)}%
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setB(TRAINED)}>✨ 自動訓練</Button>
              <Button variant="ghost" onClick={() => setB({ theta: 0.9, offset: 0.5, steep: 6 })}>重置</Button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="sigmoid：把「分數」翻譯成「及格機率」"
        description="機器其實先算出一個原始「分數」——就是這個學生離及格門檻線多遠（讀越多、出席越高，分數越正）。但分數是很抽象的數字，老師真正想要的是 0~100% 的「及格機率」。sigmoid 就是那台翻譯機：不管分數是多少，都壓進 0~100% 之間。"
      >
        <div className="rounded-xl border border-line bg-cream p-4">
          <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full max-w-md">
            <line x1={40} y1={sigY(0.5)} x2={SW - 10} y2={sigY(0.5)} stroke="var(--color-line)" strokeDasharray="4 4" />
            <line x1={sigX(0)} y1={12} x2={sigX(0)} y2={SH - 30} stroke="var(--color-line)" strokeDasharray="4 4" />
            <text x={44} y={sigY(1) + 3} fontSize={10} fill="var(--color-brand)">及格機率 100%</text>
            <text x={44} y={sigY(0) + 2} fontSize={10} fill="var(--color-red)">及格機率 0%</text>
            <text x={sigX(0) + 4} y={SH - 16} fontSize={10} fill="var(--color-muted)">踩在門檻線上 → 50%</text>
            <text x={SW - 10} y={SH - 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">← 分數（離門檻線的距離）→</text>
            <path d={sigPath} fill="none" stroke="var(--color-ink)" strokeWidth={2.5} />
          </svg>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            剛好踩在門檻線上（分數 0）時，機率正好 <b className="text-ink">50%</b>——最難說會不會過；
            離門檻線<b className="text-ink">越遠</b>，機率就越接近 <b className="text-brand">100%</b> 或 <b className="text-red">0%</b>，機器越有把握。
            回上面拉「評分果斷度」滑桿，看這條 S 曲線變陡或變平——
            <b className="text-ink">越陡</b>代表機器越「非過即不過」，<b className="text-ink">越平</b>代表它態度慢慢改變、留下較大的猶豫地帶。
          </p>
        </div>
      </Section>
    </LessonLayout>
  )
}
