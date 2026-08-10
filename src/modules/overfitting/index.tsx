import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { linearScale } from '../../lib/plot'
import { polyfit, mse } from '../../lib/polyfit'
import { TRAIN, VALID, trueCurve } from './data'
import { ErrorCurve } from './ErrorCurve'

const MAX_DEGREE = 9

export function Overfitting() {
  const [degree, setDegree] = useState(1)
  const [showTrue, setShowTrue] = useState(false)

  // 預先算好每個次數的訓練 / 驗證誤差（資料固定，只算一次）
  const { trainErrs, validErrs } = useMemo(() => {
    const tr: number[] = []
    const va: number[] = []
    for (let d = 1; d <= MAX_DEGREE; d++) {
      const m = polyfit(TRAIN.xs, TRAIN.ys, d)
      tr.push(mse(m, TRAIN.xs, TRAIN.ys))
      va.push(mse(m, VALID.xs, VALID.ys))
    }
    return { trainErrs: tr, validErrs: va }
  }, [])

  const model = useMemo(() => polyfit(TRAIN.xs, TRAIN.ys, degree), [degree])
  const trainErr = trainErrs[degree - 1]
  const validErr = validErrs[degree - 1]
  const minValid = Math.min(...validErrs)

  // 判斷目前落在哪個狀態
  const regime: 'under' | 'good' | 'over' =
    trainErr > 0.02
      ? 'under'
      : validErr > minValid * 1.5
        ? 'over'
        : 'good'

  const REGIME = {
    under: {
      label: '欠擬合 Underfitting',
      color: 'var(--color-brand-soft)',
      text: '模型太簡單，連訓練資料的規律都抓不住——訓練誤差和驗證誤差都偏高。',
    },
    good: {
      label: '剛剛好 Just Right',
      color: 'var(--color-lime)',
      text: '複雜度恰到好處，抓到了真正的規律，對沒看過的驗證資料也表現得好。',
    },
    over: {
      label: '過擬合 Overfitting',
      color: 'var(--color-coral)',
      text: '模型太複雜，把訓練資料的「雜訊」也硬背了下來——訓練誤差極低，但一遇到新資料就露餡。',
    },
  }[regime]

  // 繪圖座標
  const W = 380
  const H = 320
  const PAD = 30
  const sx = linearScale([0, 1], [PAD, W - PAD])
  const sy = linearScale([-0.15, 1.15], [H - PAD, PAD])

  // 擬合曲線取樣
  const curve = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 160; i++) {
      const x = i / 160
      const y = model.predict(x)
      pts.push(`${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
    }
    return pts.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model])

  const truePath = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 160; i++) {
      const x = i / 160
      pts.push(`${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(trueCurve(x)).toFixed(1)}`)
    }
    return pts.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <LessonLayout slug="overfitting">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        給你一堆資料點，要你畫一條線去描述它們的規律。
        線<b className="text-ink">太簡單</b>會抓不到重點，
        <b className="text-ink">太複雜</b>又會連雜訊都硬背下來。
        拖動下面的滑桿，改變曲線的「複雜度」，看看會發生什麼事。
      </div>

      <Section>
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* 主圖 */}
          <div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full rounded-xl border border-line bg-cream"
            >
              <defs>
                <clipPath id="plotClip">
                  <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
                </clipPath>
              </defs>
              {/* 邊框 */}
              <rect
                x={PAD}
                y={PAD}
                width={W - 2 * PAD}
                height={H - 2 * PAD}
                fill="none"
                stroke="var(--color-line)"
              />

              {/* 真實規律（可選顯示）*/}
              {showTrue && (
                <path
                  d={truePath}
                  fill="none"
                  stroke="var(--color-muted)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  clipPath="url(#plotClip)"
                  opacity={0.7}
                />
              )}

              {/* 擬合曲線 */}
              <path
                d={curve}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth={2.75}
                clipPath="url(#plotClip)"
              />

              {/* 驗證點（空心）*/}
              {VALID.xs.map((x, i) => (
                <circle
                  key={`v${i}`}
                  cx={sx(x)}
                  cy={sy(VALID.ys[i])}
                  r={5}
                  fill="var(--color-cream)"
                  stroke="var(--color-orange)"
                  strokeWidth={2}
                />
              ))}
              {/* 訓練點（實心）*/}
              {TRAIN.xs.map((x, i) => (
                <circle
                  key={`t${i}`}
                  cx={sx(x)}
                  cy={sy(TRAIN.ys[i])}
                  r={5}
                  fill="var(--color-brand)"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
                訓練資料
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-orange" />
                驗證資料（沒給機器看過）
              </span>
            </div>
          </div>

          {/* 控制面板 */}
          <div className="flex flex-col gap-5">
            <Slider
              label="模型複雜度（多項式次數）"
              min={1}
              max={MAX_DEGREE}
              value={degree}
              onChange={setDegree}
              suffix="次"
            />

            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: REGIME.color,
                background: `color-mix(in srgb, ${REGIME.color} 12%, white)`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: REGIME.color }}
                />
                <span className="font-semibold text-ink">{REGIME.label}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {REGIME.text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">訓練誤差</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-brand">
                  {trainErr.toFixed(4)}
                </div>
              </div>
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">驗證誤差</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-orange">
                  {validErr.toFixed(4)}
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={showTrue}
                onChange={(e) => setShowTrue(e.target.checked)}
              />
              顯示背後真正的規律（虛線）
            </label>
          </div>
        </div>
      </Section>

      <Section
        title="換個角度看：誤差怎麼隨複雜度變化"
        description="同一組資料，把每種複雜度的訓練誤差和驗證誤差都畫出來。注意驗證誤差呈現「先降後升」的 U 型——最低點就是最好的複雜度。"
      >
        <div className="rounded-xl border border-line bg-cream p-4">
          <ErrorCurve
            trainErrs={trainErrs}
            validErrs={validErrs}
            degree={degree}
          />
        </div>
      </Section>

      <div className="mt-10 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">關鍵直覺：</b>{' '}
        訓練誤差會隨複雜度一路下降（模型總能把看過的資料背得更熟），
        但我們真正在乎的是<b className="text-ink">沒看過的資料</b>。
        驗證誤差的最低點，才是模型「學到真規律」而不是「死背」的甜蜜點。
      </div>
    </LessonLayout>
  )
}
