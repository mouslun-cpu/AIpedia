import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Challenge } from '../../components/Challenge'
import { Slider } from '../../components/ui/Slider'
import { linearScale } from '../../lib/plot'
import { REG_XS, REG_YS, leastSquares, sse } from '../../lib/regression'

const W = 440
const H = 360
const PAD = 44
const sx = linearScale([0, 10], [PAD, W - PAD])
const sy = linearScale([0, 8], [H - PAD, PAD])
const yUnitPx = Math.abs(sy(1) - sy(0)) // 每單位 y 對應的像素長度

const BEST = leastSquares(REG_XS, REG_YS)

export function LossFunction() {
  const [w, setW] = useState(0.9)
  const [b, setB] = useState(0.3)

  const lineY = (x: number) => w * x + b
  const loss = sse(REG_XS, REG_YS, { w, b })
  const bestLoss = sse(REG_XS, REG_YS, BEST)

  return (
    <LessonLayout slug="loss-function">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        想像老師在改考卷：你的答案跟正確答案差多少，就是一次「誤差」。
        老師把每一題的誤差都<b className="text-ink">自乘一次</b>（放大成一個正方形的面積），
        再把所有題目加起來——分數越低，代表你考得越好。
        機器要怎麼知道一條線畫得好不好？也是同樣的邏輯，它需要一個<b className="text-ink">分數</b>。
        沿用上一課「🏃 運動次數 vs ⚖️ 瘦身公斤數」的例子：
        線預測某人運動 x 次應該瘦 ŷ 公斤，但他實際瘦了 y 公斤，
        兩者的落差就是<b className="text-brand">誤差</b>，把它<b className="text-ink">平方</b>（畫成一個正方形），再全部加起來。
        這個總和就叫<b className="text-brand">損失（loss）</b>——
        <b className="text-ink">越小代表線畫得越好</b>。
      </div>

      <Section
        title="每個誤差，都是一個看得見的方塊"
        description="每個點是一個人：🏃 運動次數、⚖️ 實際瘦了幾公斤。點到線的距離，就是「預測瘦身量」跟「實際瘦身量」的落差，也是正方形的邊長；距離平方，就是它的面積。移動下面的線，看所有方塊的總面積怎麼變。"
      >
        <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
          <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-cream">
              <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-line)" />
              <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--color-line)" />
              <text x={W / 2} y={H - 12} textAnchor="middle" fontSize={12} fill="var(--color-muted)">🏃 每週運動次數（次）</text>
              <text x={18} y={H / 2} textAnchor="middle" fontSize={12} fill="var(--color-muted)" transform={`rotate(-90,18,${H / 2})`}>⚖️ 瘦了幾公斤</text>

              {/* 誤差方塊 */}
              {REG_XS.map((x, i) => {
                const py = sy(REG_YS[i])
                const ly = sy(lineY(x))
                const side = Math.abs(REG_YS[i] - lineY(x)) * yUnitPx
                const top = Math.min(py, ly)
                return (
                  <rect
                    key={i}
                    x={sx(x)}
                    y={top}
                    width={side}
                    height={side}
                    fill="var(--color-orange)"
                    opacity={0.22}
                    stroke="var(--color-orange)"
                    strokeWidth={1}
                    style={{ transition: 'all 0.1s' }}
                  />
                )
              })}

              {/* 回歸線 */}
              <line x1={sx(0)} y1={sy(lineY(0))} x2={sx(10)} y2={sy(lineY(10))} stroke="var(--color-brand)" strokeWidth={3} />

              {/* 資料點 */}
              {REG_XS.map((x, i) => (
                <circle key={i} cx={sx(x)} cy={sy(REG_YS[i])} r={5} fill="var(--color-ink)" stroke="#fff" strokeWidth={1.5}>
                  <title>{`每週運動 ${x.toFixed(1)} 次 → 實際瘦了 ${REG_YS[i].toFixed(1)} 公斤，線預測瘦 ${lineY(x).toFixed(1)} 公斤`}</title>
                </circle>
              ))}
            </svg>
          </div>

          <div className="flex flex-col gap-5">
            <Slider label="斜率 w（每多運動 1 次，多瘦幾公斤）" min={-0.5} max={2} step={0.01} value={w} onChange={setW} format={(v) => v.toFixed(2)} />
            <Slider label="截距 b（完全不運動的基準瘦身量）" min={-2} max={5} step={0.1} value={b} onChange={setB} format={(v) => v.toFixed(1)} />

            <div className="rounded-xl bg-cream p-4">
              <div className="text-xs text-muted">總損失 = 所有方塊面積相加</div>
              <div className="mt-0.5 font-mono text-2xl font-semibold text-orange">
                {loss.toFixed(2)}
              </div>
            </div>

            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              <b className="text-ink">為什麼要「平方」？</b>
              <ul className="mt-2 space-y-1.5">
                <li>· 讓誤差不分正負，都變成正的面積</li>
                <li>· <b className="text-ink">大誤差被放得更大</b>（差 2 公斤 → 面積 4，差 3 公斤 → 面積 9），逼機器優先修正離譜的點</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Challenge
        module="loss-function"
        id="min-loss"
        title="把所有橘色方塊縮到最小"
        goal={<>每個橘色方塊都是一次「猜錯」的懲罰。調整 w 和 b，讓所有方塊的<b className="text-ink">總面積（總損失）</b>縮到 <b className="text-ink">{(bestLoss * 1.2).toFixed(0)}</b> 以下——越接近最小越好。</>}
        steps={[
          '注意看：線離某個點越遠，那個點的方塊就越大（因為誤差要平方）。',
          '拉「斜率 w」讓線順著點群的方向。',
          '拉「截距 b」把線平移到讓大方塊都縮小。',
          '看右邊橘色的「總損失」數字往下掉——掉到夠低就達成。',
        ]}
        hints={[
          <>先對付<b className="text-ink">最大的那個方塊</b>：把線往它那邊靠，它縮小，總面積就大幅下降。</>,
          <>方塊會「平方」放大誤差，所以<b className="text-ink">寧可讓每個點都差一點點，也不要有一個點差很多</b>。試著讓線穿過點群正中央。</>,
        ]}
        done={loss <= bestLoss * 1.2}
        success={<>你發現了嗎——總損失有一個<b className="text-ink">最低點</b>，再怎麼調都低不過它。這個「最低點」就是這組資料的最佳線。機器學習說穿了就是一句話：<b className="text-ink">想辦法把損失降到最低</b>。而且因為誤差被平方放大，模型會特別在意「錯很大」的點，這也是為什麼一個離譜的異常值能把整條線拉歪。</>}
      />

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">試試看：</b>{' '}
        慢慢調整 w 和 b，你會發現總損失有一個<b className="text-ink">最低點</b>
        （這組資料大約是 {bestLoss.toFixed(1)}）。
        機器學習的目標，就是找到讓損失最小的那條線。
        但它不是用猜的——下一課的<b className="text-brand">梯度下降</b>，
        會告訴你機器怎麼像<b className="text-ink">蒙著眼睛摸黑走下山谷</b>一樣，
        順著損失往下滑，自動找到谷底。
      </div>
    </LessonLayout>
  )
}
