import { useEffect, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Challenge } from '../../components/Challenge'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'
import { REG_XS, REG_YS, leastSquares, sse } from '../../lib/regression'

const W = 420
const H = 340
const PAD = 40
const sx = linearScale([0, 10], [PAD, W - PAD])
const sy = linearScale([0, 8], [H - PAD, PAD])

const BEST = leastSquares(REG_XS, REG_YS)

export function LinearRegression() {
  const [w, setW] = useState(0.3)
  const [b, setB] = useState(2.5)
  const [showResiduals, setShowResiduals] = useState(true)
  const timer = useRef<number | null>(null)

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const error = sse(REG_XS, REG_YS, { w, b })
  const bestError = sse(REG_XS, REG_YS, BEST)
  const isGood = error < bestError * 1.15

  // 動畫：把目前的線平滑地移動到最佳解（用 setInterval，分 30 格補間）
  function autoFit() {
    if (timer.current) clearInterval(timer.current)
    const w0 = w
    const b0 = b
    const steps = 30
    let i = 0
    timer.current = window.setInterval(() => {
      i++
      const ease = 1 - (1 - i / steps) ** 3
      setW(w0 + (BEST.w - w0) * ease)
      setB(b0 + (BEST.b - b0) * ease)
      if (i >= steps) {
        clearInterval(timer.current!)
        timer.current = null
      }
    }, 25)
  }

  const lineY = (x: number) => w * x + b

  return (
    <LessonLayout slug="linear-regression">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        想像下面這群人：他們<b className="text-ink">每週運動的次數</b>不同，
        一個月後<b className="text-ink">瘦下來的公斤數</b>也不同。
        運動越多，好像瘦得越多——如果把每個人畫成一個點，
        會發現它們大致沿著<b className="text-ink">一條線</b>分佈——
        這條線就能幫你預測「這週運動 6 次，大概能瘦多少公斤」。
        這就是最基本的預測方式：給一堆點，找一條<b className="text-ink">直線</b>穿過它們，
        描述「運動次數變多時，體重大概怎麼變」。這條線可以寫成{' '}
        <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-ink">
          y = w · x + b
        </code>
        ——<b className="text-brand">w 是斜率</b>（每多運動一次，多瘦幾公斤）、
        <b className="text-brand">b 是截距</b>（完全不運動時的基準體重變化）。
        調調看下面兩個滑桿，幫這些點找出最合適的線。
      </div>

      <Section
        title="動手調一條線"
        description="每個點代表一個人：🏃 每週運動次數、⚖️ 瘦了幾公斤。每條灰色虛線是「這個人實際瘦的公斤數」跟「你的線預測他會瘦多少」的誤差，虛線越短代表預測越準。下方的總誤差把所有誤差加起來——目標是讓它越小越好。"
      >
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full rounded-xl border border-line bg-cream"
            >
              {/* 軸 */}
              <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-line)" />
              <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--color-line)" />
              <text x={W / 2} y={H - 10} textAnchor="middle" fontSize={12} fill="var(--color-muted)">🏃 每週運動次數（次）</text>
              <text x={16} y={H / 2} textAnchor="middle" fontSize={12} fill="var(--color-muted)" transform={`rotate(-90,16,${H / 2})`}>⚖️ 瘦了幾公斤</text>

              {/* 殘差線 */}
              {showResiduals &&
                REG_XS.map((x, i) => (
                  <line
                    key={i}
                    x1={sx(x)}
                    y1={sy(REG_YS[i])}
                    x2={sx(x)}
                    y2={sy(lineY(x))}
                    stroke="var(--color-muted)"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    opacity={0.6}
                  />
                ))}

              {/* 回歸線 */}
              <line
                x1={sx(0)}
                y1={sy(lineY(0))}
                x2={sx(10)}
                y2={sy(lineY(10))}
                stroke="var(--color-brand)"
                strokeWidth={3}
              />

              {/* 資料點 */}
              {REG_XS.map((x, i) => (
                <circle
                  key={i}
                  cx={sx(x)}
                  cy={sy(REG_YS[i])}
                  r={5.5}
                  fill="var(--color-ink)"
                  stroke="#fff"
                  strokeWidth={1.5}
                >
                  <title>{`每週運動 ${x.toFixed(1)} 次 → 瘦了 ${REG_YS[i].toFixed(1)} 公斤`}</title>
                </circle>
              ))}
            </svg>
          </div>

          <div className="flex flex-col gap-5">
            <Slider label="斜率 w（每多運動 1 次，多瘦幾公斤）" min={-0.5} max={2} step={0.01} value={w} onChange={setW} format={(v) => v.toFixed(2)} />
            <Slider label="截距 b（完全不運動的基準瘦身量）" min={-2} max={5} step={0.1} value={b} onChange={setB} format={(v) => v.toFixed(1)} />

            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: isGood ? 'var(--color-lime)' : 'var(--color-line)',
                background: isGood
                  ? 'color-mix(in srgb, var(--color-lime) 14%, white)'
                  : 'var(--color-cream)',
              }}
            >
              <div className="text-xs text-muted">總誤差（預測瘦身量的誤差平方和）</div>
              <div className="mt-0.5 font-mono text-2xl font-semibold text-ink">
                {error.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-muted">
                {isGood
                  ? '很接近最佳解了！'
                  : `理論最小值約 ${bestError.toFixed(2)}，再調調看`}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={autoFit}>✨ 自動找最佳線</Button>
              <Button variant="ghost" onClick={() => { setW(0.3); setB(2.5) }}>
                重置
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showResiduals} onChange={(e) => setShowResiduals(e.target.checked)} />
              顯示每個點的誤差（虛線）
            </label>
          </div>
        </div>
      </Section>

      <Challenge
        module="linear-regression"
        id="fit-by-hand"
        title="不靠電腦，自己找出最好的線"
        goal={<>先<b className="text-ink">別按</b>「自動找最佳線」！用你自己的眼睛和手，拉動兩個滑桿，把總誤差壓到夠低，讓右下角出現綠色的<b className="text-ink">「很接近最佳解了！」</b>。</>}
        steps={[
          '看左邊的圖：灰色虛線是每個點「猜錯了多少」。你的目標是讓所有虛線盡量變短。',
          '先拉「斜率 w」讓藍線的傾斜角度貼合這排點的走向。',
          '再拉「截距 b」把整條線上下平移，蓋在點群中間。',
          '盯著右邊的「總誤差」數字——越小越好，變綠色就成功了。',
        ]}
        hints={[
          <>這排點是「往右上斜」的，所以斜率 w 要調成<b className="text-ink">正的</b>（線往右上）。</>,
          <>調好斜率後，如果線整體偏高或偏低，就用截距 b 把它整條平移到點群正中間。</>,
          <>真的卡住，就先按一次「自動找最佳線」看答案長怎樣，記住那個角度和高度，再自己重現一次。</>,
        ]}
        done={isGood}
        success={<>你剛剛做的事，正是機器學習的核心：<b className="text-ink">不斷微調，讓「猜錯的總量」越來越小</b>。你用眼睛和直覺找線，機器則是用數學自動做同一件事——而且快上幾百萬倍。這個「把誤差降到最小」的目標，就是接下來<b className="text-ink">損失函數</b>和<b className="text-ink">梯度下降</b>兩課要拆解的東西。</>}
      />

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">那台機器是怎麼「自動」找到最佳線的？</b>{' '}
        剛剛那顆「自動找最佳線」按鈕，背後其實有一套數學。
        關鍵是先定義「誤差」到底怎麼算（<b className="text-brand">損失函數</b>，這個章節稍後會介紹），
        再讓機器順著誤差往下走（<b className="text-brand">梯度下降</b>，也在後面）——
        這兩個概念合起來，就是機器「自動學習」的核心引擎。
      </div>
    </LessonLayout>
  )
}
