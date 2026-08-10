import { useEffect, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'
import { Slider } from '../../components/ui/Slider'
import { linearScale } from '../../lib/plot'

// 情境：珍奶店在調配方。x 軸是客人要求的「茶葉濃度」(0=清淡, 1=濃郁)，
// 店裡的 SOP 建議「甜度」是一條 S 型曲線：濃度低時甜度打底、中段快速拉高、後段趨於飽和。
// 配方分兩步驟：① 抓「糖漿基底」份量（隱藏層，w1,b1 + tanh 手感修正）
//              ② 換算成最終「甜度%」（輸出層，w2,b2）
// 目標是一條 S 型曲線——線性模型擬合不好，正好凸顯「隱藏層 + 非線性」的價值。
const TX = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]
const TY = TX.map((x) => 0.75 / (1 + Math.exp(-10 * (x - 0.5))) + 0.12)

interface Params { w1: number; b1: number; w2: number; b2: number }
const INIT: Params = { w1: 0.5, b1: 0, w2: 0.3, b2: 0.4 }

function forward(p: Params, x: number) {
  const z1 = p.w1 * x + p.b1
  const h = Math.tanh(z1)
  const o = p.w2 * h + p.b2
  return { z1, h, o }
}
function lossOf(p: Params) {
  let s = 0
  for (let i = 0; i < TX.length; i++) s += (forward(p, TX[i]).o - TY[i]) ** 2
  return s / TX.length
}
function gradOf(p: Params) {
  let gw1 = 0, gb1 = 0, gw2 = 0, gb2 = 0
  const n = TX.length
  for (let i = 0; i < n; i++) {
    const { h, o } = forward(p, TX[i])
    const e = o - TY[i]
    const dOut = 2 * e // dL/do
    gw2 += dOut * h
    gb2 += dOut
    const dh = dOut * p.w2 // 鏈式法則：誤差往回傳到隱藏層輸出
    const dz1 = dh * (1 - h * h) // 乘上 tanh 的導數
    gw1 += dz1 * TX[i]
    gb1 += dz1
  }
  return { w1: gw1 / n, b1: gb1 / n, w2: gw2 / n, b2: gb2 / n }
}

const CW = 400
const CH = 300
const CPAD = 32
const csx = linearScale([0, 1], [CPAD, CW - CPAD])
const csy = linearScale([0, 1], [CH - CPAD, CPAD])

const NET_X0 = 60, NET_H = 150, NET_O = 300

export function Backpropagation() {
  const [p, setP] = useState<Params>(INIT)
  const [lr, setLr] = useState(0.3)
  const [step, setStep] = useState(0)
  const [showGrad, setShowGrad] = useState(false)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)
  const pRef = useRef(p)
  pRef.current = p

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const g = gradOf(p)
  const loss = lossOf(p)

  function doStep() {
    const grad = gradOf(pRef.current)
    setP((prev) => ({
      w1: prev.w1 - lr * grad.w1,
      b1: prev.b1 - lr * grad.b1,
      w2: prev.w2 - lr * grad.w2,
      b2: prev.b2 - lr * grad.b2,
    }))
    setStep((s) => s + 1)
    setShowGrad(true)
  }
  function play() {
    if (timer.current) clearInterval(timer.current)
    setPlaying(true)
    timer.current = window.setInterval(() => {
      doStep()
    }, 220)
    window.setTimeout(() => {
      if (timer.current) { clearInterval(timer.current); timer.current = null; setPlaying(false) }
    }, 220 * 60)
  }
  function reset() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
    setP(INIT)
    setStep(0)
    setShowGrad(false)
  }

  const curve = Array.from({ length: 101 }, (_, i) => {
    const x = i / 100
    return `${i ? 'L' : 'M'}${csx(x).toFixed(1)},${csy(forward(p, x).o).toFixed(1)}`
  }).join(' ')

  // 示範用 x（取中間值）看單一樣本的前向/反向數值
  const demoX = 0.5
  const fwd = forward(p, demoX)

  return (
    <LessonLayout slug="backpropagation">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        你在幫珍奶店調一套「依濃度配甜度」的配方 SOP：客人要求的<b className="text-ink">茶葉濃度</b>越高，
        建議的<b className="text-ink">甜度</b>不是等比例上升，而是<b className="text-ink">先打底、中段快速拉高、後段封頂</b>——一條 S 型曲線。
        配方分兩步：先<b className="text-ink">抓糖漿基底份量</b>，再<b className="text-ink">換算成最終甜度</b>。
        調出來的甜度跟 SOP 不合，要回頭檢討：<b className="text-brand">先看「換算甜度」這一步該負多少責任，
        再往前追究「抓基底」那一步又該負多少責任</b>——這一路往回究責、逐步修正配方的過程，就叫<b className="text-brand">反向傳播</b>。
      </div>

      <Section
        title="調這套「1 步基底、1 步甜度」的小配方，去擬合 SOP 曲線"
        description="右邊是誤差怎麼從最終甜度「倒流」回基底份量（橘色箭頭），這就是究責的方向。左邊是各種濃度的 SOP 建議值，跟目前配方調出來的曲線。按「走一步」看一次完整的前向配製 + 回頭究責 + 修正配方。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 擬合曲線 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">目前配方調出的「濃度→甜度」曲線</div>
            <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full rounded-xl border border-line bg-cream">
              <rect x={CPAD} y={CPAD} width={CW - 2 * CPAD} height={CH - 2 * CPAD} fill="none" stroke="var(--color-line)" />
              <path d={curve} fill="none" stroke="var(--color-brand)" strokeWidth={2.75} />
              {TX.map((x, i) => (
                <circle key={i} cx={csx(x)} cy={csy(TY[i])} r={5} fill="var(--color-ink)" stroke="#fff" strokeWidth={1.5}>
                  <title>{`濃度 ${(x * 100).toFixed(0)}% → SOP 建議甜度 ${(TY[i] * 100).toFixed(0)}%`}</title>
                </circle>
              ))}
              <text x={CW / 2} y={CH - 8} textAnchor="middle" fontSize={11} fill="var(--color-muted)">🍵 茶葉濃度 →</text>
              <text x={16} y={CPAD - 10} fontSize={11} fill="var(--color-muted)">🍯 甜度</text>
            </svg>
          </div>

          {/* 網路示意 + 反向箭頭 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">誤差怎麼往回究責（以濃度 50% 為例）</div>
            <svg viewBox="0 0 400 220" className="w-full rounded-xl border border-line bg-cream">
              {/* 前向邊 */}
              <line x1={NET_X0} y1={110} x2={NET_H} y2={110} stroke="var(--color-line)" strokeWidth={2} />
              <line x1={NET_H} y1={110} x2={NET_O} y2={110} stroke="var(--color-line)" strokeWidth={2} />
              {/* 反向箭頭（顯示時疊加）*/}
              {showGrad && (
                <>
                  <line x1={NET_O - 5} y1={130} x2={NET_H + 5} y2={130} stroke="var(--color-orange)" strokeWidth={2.5} markerEnd="url(#arrow)" />
                  <line x1={NET_H - 5} y1={130} x2={NET_X0 + 5} y2={130} stroke="var(--color-orange)" strokeWidth={2.5} markerEnd="url(#arrow)" />
                </>
              )}
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-orange)" />
                </marker>
              </defs>

              <circle cx={NET_X0} cy={110} r={26} fill="#fff" stroke="var(--color-brand)" strokeWidth={2.5} />
              <text x={NET_X0} y={116} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--color-ink)">🍵</text>
              <circle cx={NET_H} cy={110} r={26} fill="#fff" stroke="var(--color-brand)" strokeWidth={2.5} />
              <text x={NET_H} y={116} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--color-ink)">{fwd.h.toFixed(2)}</text>
              <circle cx={NET_O} cy={110} r={26} fill="#fff" stroke="var(--color-brand)" strokeWidth={2.5} />
              <text x={NET_O} y={116} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--color-ink)">{fwd.o.toFixed(2)}</text>

              <text x={NET_X0} y={155} textAnchor="middle" fontSize={11} fill="var(--color-muted)">濃度 50%</text>
              <text x={NET_H} y={155} textAnchor="middle" fontSize={11} fill="var(--color-muted)">糖漿基底</text>
              <text x={NET_O} y={155} textAnchor="middle" fontSize={11} fill="var(--color-muted)">建議甜度</text>

              {showGrad && (
                <>
                  <text x={(NET_H + NET_O) / 2} y={148} textAnchor="middle" fontSize={10} fill="var(--color-orange)">甜度換算該負責 = {g.w2.toFixed(2)}</text>
                  <text x={(NET_X0 + NET_H) / 2} y={148} textAnchor="middle" fontSize={10} fill="var(--color-orange)">抓基底該負責 = {g.w1.toFixed(2)}</text>
                </>
              )}
            </svg>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <Slider label="每次修正的幅度（學習率）" min={0.02} max={1} step={0.02} value={lr} onChange={setLr} format={(v) => v.toFixed(2)} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={doStep} disabled={playing}>走一步 →</Button>
              <Button variant="outline" onClick={play} disabled={playing}>▶ 自動試調</Button>
              <Button variant="ghost" onClick={reset} disabled={playing}>重置</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-muted">試調次數</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-ink">{step}</div>
            </div>
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-muted">配方誤差</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-orange">{loss.toFixed(4)}</div>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">關鍵步驟：</b>{' '}
        誤差要傳到「抓糖漿基底」這一步之前，得先經過「換算甜度」那一步的權重 w₂、
        再乘上 tanh 的導數（<code className="rounded bg-cream px-1 font-mono text-xs">1 − h²</code>，代表基底份量的手感修正也要打個折扣）——
        這一連串「一步乘一步」往回究責的算法，正是<b className="text-brand">鏈式法則</b>的體現。
        配方步驟越多，這條究責鏈就越長，這也是為什麼深層網路的訓練比淺層複雜得多。
        試調到後面，你會看到曲線漸漸貼合出一個 S 型——這正是<b className="text-ink">「抓基底」這一步的非線性手感</b>在發揮作用。
      </div>
    </LessonLayout>
  )
}
