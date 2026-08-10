import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { linearScale } from '../../lib/plot'
import { polyfit } from '../../lib/polyfit'

// 一組帶雜訊的資料 + 高次多項式(9次)。不正則化時一定過擬合、亂扭。
const XS = [0.05, 0.16, 0.27, 0.36, 0.45, 0.55, 0.64, 0.73, 0.84, 0.95]
const YS = [0.30, 0.52, 0.44, 0.70, 0.58, 0.66, 0.50, 0.72, 0.40, 0.60]
const DEGREE = 9

const W = 460
const H = 320
const PAD = 32
const sx = linearScale([0, 1], [PAD, W - PAD])
const sy = linearScale([-0.1, 1.1], [H - PAD, PAD])

// λ 用對數刻度：滑桿 0~100 對應 ridge 0 ~ 約 0.5
function sliderToLambda(s: number): number {
  if (s <= 0) return 0
  return 0.0002 * Math.pow(10, (s / 100) * 3.4) - 0.0002
}

export function Regularization() {
  const [sliderVal, setSliderVal] = useState(0)
  const lambda = sliderToLambda(sliderVal)

  const model = useMemo(() => polyfit(XS, YS, DEGREE, lambda), [lambda])

  const curve = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 200; i++) {
      const x = i / 200
      pts.push(`${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(model.predict(x)).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [model])

  // 係數長條（跳過截距，看 w1..w9 的大小）
  const coefs = model.coeffs.slice(1)
  const maxAbs = Math.max(...coefs.map((c) => Math.abs(c)), 0.1)

  const state =
    sliderVal < 8
      ? { t: '沒有正則化 → 過擬合', c: 'var(--color-coral)', d: '曲線用力扭曲去穿過每個點，係數又大又亂。看起來完美，其實在死背雜訊。' }
      : sliderVal > 70
        ? { t: '正則化太強 → 欠擬合', c: 'var(--color-brand-soft)', d: '係數幾乎被壓成零，曲線變得太平，連真正的趨勢都抓不到了。' }
        : { t: '剛剛好', c: 'var(--color-lime)', d: '曲線平滑又貼合大致趨勢，係數被控制在合理範圍。這就是正則化的甜蜜點。' }

  return (
    <LessonLayout slug="regularization">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        對付過擬合，還有一招很優雅的方法——<b className="text-brand">正則化</b>。
        它不減少模型的複雜度，而是在訓練時多加一條規矩：
        「<b className="text-ink">係數不准太大</b>」。係數一被壓小，曲線就沒辦法劇烈扭曲，
        自然變得平滑、不再死背雜訊。
      </div>

      <Section
        title="拉大正則化強度，看曲線冷靜下來"
        description="這是一條 9 次多項式（很容易過擬合）。從左往右加大正則化強度 λ，看它從瘋狂扭曲慢慢變平滑，右邊的係數長條也跟著縮短。"
      >
        <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
          <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-cream">
              <defs>
                <clipPath id="regClip"><rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} /></clipPath>
              </defs>
              <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke="var(--color-line)" />
              <path d={curve} fill="none" stroke="var(--color-brand)" strokeWidth={3} clipPath="url(#regClip)" />
              {XS.map((x, i) => (
                <circle key={i} cx={sx(x)} cy={sy(YS[i])} r={5.5} fill="var(--color-ink)" stroke="#fff" strokeWidth={1.5} />
              ))}
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <Slider label="正則化強度 λ" min={0} max={100} value={sliderVal} onChange={setSliderVal} format={() => lambda.toFixed(4)} />

            {/* 係數長條圖 */}
            <div className="rounded-xl border border-line p-3">
              <div className="mb-2 text-xs text-muted">各項係數的大小（w₁…w₉）</div>
              <div className="flex items-end gap-1" style={{ height: 70 }}>
                {coefs.map((c, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${(Math.abs(c) / maxAbs) * 100}%`,
                        background: c >= 0 ? 'var(--color-brand)' : 'var(--color-coral)',
                        transition: 'height 0.2s',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: state.c, background: `color-mix(in srgb, ${state.c} 12%, white)` }}>
              <div className="flex items-center gap-2 font-semibold text-ink">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: state.c }} />
                {state.t}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{state.d}</p>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-line bg-cream/60 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">L1 還是 L2？</b>{' '}
        剛剛用的是 <b className="text-brand">L2（Ridge）</b>：懲罰「係數的平方」，
        會把所有係數<b className="text-ink">平均壓小</b>但通常不會變成零。
        另一種 <b className="text-brand">L1（Lasso）</b> 懲罰「係數的絕對值」，
        會直接把一些不重要的係數<b className="text-ink">壓成 0</b>——
        等於順手做了「特徵篩選」，只留下真正有用的那幾項。
      </div>
    </LessonLayout>
  )
}
