import { useEffect, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'

// 真實資料分布（1D 玩具版）：N(0.7, 0.08)
const REAL_MEAN = 0.7
const REAL_STD = 0.08
const BATCH = 24
const sigmoidFn = (z: number) => 1 / (1 + Math.exp(-z))

function gaussianRand() {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
function pdf(x: number, mu: number, sigma: number) {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2)) / (sigma * Math.sqrt(2 * Math.PI))
}

interface GanState {
  genMu: number
  genSigma: number
  w: number
  b: number
  round: number
}
const INIT: GanState = { genMu: 0.22, genSigma: 0.18, w: 0, b: 0, round: 0 }

/** 跑一輪真正的 GAN 更新：先訓練判別器幾步，再用重參數化技巧更新生成器。 */
function trainRound(s: GanState): GanState {
  let { genMu, genSigma, w, b } = s
  const zs = Array.from({ length: BATCH }, () => gaussianRand())

  // ① 訓練判別器：real 標 1、fake 標 0，做幾步邏輯回歸梯度上升
  for (let step = 0; step < 6; step++) {
    let gw = 0, gb = 0
    const reals = Array.from({ length: BATCH }, () => REAL_MEAN + gaussianRand() * REAL_STD)
    const fakes = zs.map((z) => genMu + z * genSigma)
    for (const x of reals) {
      const pred = sigmoidFn(w * x + b)
      const err = pred - 1
      gw += err * x; gb += err
    }
    for (const x of fakes) {
      const pred = sigmoidFn(w * x + b)
      const err = pred - 0
      gw += err * x; gb += err
    }
    const n = BATCH * 2
    w -= 0.6 * (gw / n)
    b -= 0.6 * (gb / n)
  }

  // ② 更新生成器：用重參數化技巧，讓生成的樣本更容易騙過判別器
  let dMu = 0, dSigma = 0
  for (const z of zs) {
    const x = genMu + z * genSigma
    const d = sigmoidFn(w * x + b)
    const grad = (1 - d) * w // d log(D(x)) / dx
    dMu += grad
    dSigma += grad * z
  }
  genMu += 0.05 * (dMu / BATCH)
  genSigma = Math.max(0.02, genSigma + 0.05 * (dSigma / BATCH))

  return { genMu, genSigma, w, b, round: s.round + 1 }
}

const CW = 460
const CH = 260
const CPAD = 34
const csx = linearScale([0, 1], [CPAD, CW - CPAD])

export function GAN() {
  const [state, setState] = useState<GanState>(INIT)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  function stepOnce() {
    setState((prev) => trainRound(prev))
  }
  function play(rounds: number) {
    if (timer.current) clearInterval(timer.current)
    setPlaying(true)
    let i = 0
    timer.current = window.setInterval(() => {
      setState((prev) => trainRound(prev))
      i++
      if (i >= rounds) {
        clearInterval(timer.current!)
        timer.current = null
        setPlaying(false)
      }
    }, 120)
  }
  function reset() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
    setState(INIT)
  }

  const maxPdf = Math.max(pdf(REAL_MEAN, REAL_MEAN, REAL_STD), pdf(state.genMu, state.genMu, state.genSigma), 1) * 1.1
  const csy = linearScale([0, maxPdf], [CH - CPAD, 16])
  const curve = (mu: number, sigma: number) =>
    Array.from({ length: 121 }, (_, i) => {
      const x = i / 120
      return `${i ? 'L' : 'M'}${csx(x).toFixed(1)},${csy(pdf(x, mu, sigma)).toFixed(1)}`
    }).join(' ')
  const discCurve = Array.from({ length: 121 }, (_, i) => {
    const x = i / 120
    const d = sigmoidFn(state.w * x + state.b)
    return `${i ? 'L' : 'M'}${csx(x).toFixed(1)},${csy(d * maxPdf).toFixed(1)}`
  }).join(' ')

  const closeness = Math.max(0, 1 - Math.abs(state.genMu - REAL_MEAN) / REAL_MEAN - Math.abs(state.genSigma - REAL_STD) / REAL_STD)

  return (
    <LessonLayout slug="gan">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        GAN（生成對抗網路）讓兩個網路互相較勁：<b className="text-brand">生成器</b>
        努力製造以假亂真的樣本；<b className="text-brand">判別器</b>努力抓出誰是真的、誰是生成器造的假貨。
        兩者<b className="text-ink">一輪輪互相進步</b>，生成器越做越像真的，判別器也越來越挑剔——
        直到生成器騙過判別器為止。
      </div>

      <Section
        title="真實分布 vs 生成器造出來的分布"
        description="橘色（生成器）一開始亂猜。藍色虛線是真實資料分布。綠線是判別器目前劃的「這是真的機率」曲線。訓練幾輪，看橘色怎麼慢慢貼近藍色。"
      >
        <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
          <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full rounded-xl border border-line bg-cream">
            <line x1={CPAD} y1={CH - CPAD} x2={CW - CPAD} y2={CH - CPAD} stroke="var(--color-line)" />
            <path d={curve(REAL_MEAN, REAL_STD)} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} strokeDasharray="5 3" />
            <path d={discCurve} fill="none" stroke="var(--color-lime)" strokeWidth={2} opacity={0.8} />
            <path d={curve(state.genMu, state.genSigma)} fill="none" stroke="var(--color-orange)" strokeWidth={2.75} />
            <text x={CW / 2} y={CH - 10} textAnchor="middle" fontSize={11} fill="var(--color-muted)">x →</text>
            <g fontSize={10}>
              <text x={CPAD} y={16} fill="var(--color-brand)">┄ 真實分布</text>
              <text x={CPAD + 80} y={16} fill="var(--color-orange)">━ 生成器</text>
              <text x={CPAD + 150} y={16} fill="var(--color-lime)">━ 判別器輸出</text>
            </g>
          </svg>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">已訓練輪數</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-ink">{state.round}</div>
              </div>
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">分布相似度</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-brand">{(closeness * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={stepOnce} disabled={playing}>訓練 1 輪</Button>
              <Button variant="outline" onClick={() => play(40)} disabled={playing}>▶ 自動訓練 40 輪</Button>
              <Button variant="ghost" onClick={reset} disabled={playing}>重置</Button>
            </div>
            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              {state.round === 0 && <p>生成器一開始亂猜，判別器一眼就能分辨真假。</p>}
              {state.round > 0 && state.round < 15 && <p>生成器正在慢慢逼近真實分布的位置與範圍，判別器也跟著調整判斷標準。</p>}
              {state.round >= 15 && <p><b className="text-ink">兩條曲線越來越接近了！</b>判別器也越來越難分辨真假——這正是 GAN 訓練成功的訊號。</p>}
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">這是一場零和賽局：</b>{' '}
        判別器進步，會逼生成器做得更好；生成器進步，又會逼判別器更挑剔。
        理想的終點是判別器完全分不出真假（判斷機率變成 50/50）——
        這時生成器已經學會了以假亂真的本事。這也是為什麼 GAN 訓練
        比一般監督式學習更不穩定：<b className="text-ink">兩個網路要同步進步，任何一方失衡都會讓訓練垮掉</b>。
      </div>
    </LessonLayout>
  )
}
