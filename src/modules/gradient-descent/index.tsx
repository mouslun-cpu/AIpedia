import { useEffect, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Challenge } from '../../components/Challenge'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'
import { REG_XS, REG_YS } from '../../lib/regression'

// 為了讓「山谷」乾淨清楚，這裡用最簡化的單參數模型 y = w·x（過原點）。
// 損失 L(w) = 平均((w·x − y)²) 是一條漂亮的拋物線。
const N = REG_XS.length
function lossW(w: number) {
  let s = 0
  for (let i = 0; i < N; i++) s += (w * REG_XS[i] - REG_YS[i]) ** 2
  return s / N
}
function gradW(w: number) {
  let s = 0
  for (let i = 0; i < N; i++) s += 2 * REG_XS[i] * (w * REG_XS[i] - REG_YS[i])
  return s / N
}
const W_START = 0.05

// 左圖：損失山谷 (loss vs w)
const LW = 380
const LH = 300
const LPAD = 40
const W_MIN = -0.2
const W_MAX = 1.7
const lossMax = Math.max(lossW(W_MIN), lossW(W_MAX))
const lx = linearScale([W_MIN, W_MAX], [LPAD, LW - LPAD])
const ly = linearScale([0, lossMax], [LH - LPAD, 20])
const parabola = (() => {
  const pts: string[] = []
  for (let i = 0; i <= 100; i++) {
    const w = W_MIN + (W_MAX - W_MIN) * (i / 100)
    pts.push(`${i ? 'L' : 'M'}${lx(w).toFixed(1)},${ly(lossW(w)).toFixed(1)}`)
  }
  return pts.join(' ')
})()

// 右圖：資料 + 目前的線
const RW = 380
const RH = 300
const RPAD = 40
const rx = linearScale([0, 10], [RPAD, RW - RPAD])
const rry = linearScale([0, 8], [RH - RPAD, 20])

export function GradientDescent() {
  const [w, setW] = useState(W_START)
  const [lr, setLr] = useState(0.018)
  const [iter, setIter] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)
  const wRef = useRef(w)
  wRef.current = w

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  function stepOnce() {
    const g = gradW(wRef.current)
    setW((prev) => prev - lr * g)
    setIter((n) => n + 1)
  }

  function togglePlay() {
    if (playing) {
      if (timer.current) clearInterval(timer.current)
      timer.current = null
      setPlaying(false)
      return
    }
    setPlaying(true)
    timer.current = window.setInterval(() => {
      const g = gradW(wRef.current)
      // 收斂就停
      if (Math.abs(g) < 0.02 || Math.abs(wRef.current) > 5) {
        if (timer.current) clearInterval(timer.current)
        timer.current = null
        setPlaying(false)
        return
      }
      setW((prev) => prev - lr * g)
      setIter((n) => n + 1)
    }, 260)
  }

  function reset() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
    setW(W_START)
    setIter(0)
  }

  const curLoss = lossW(w)
  const diverging = Math.abs(w) > W_MAX + 0.5
  const converged = Math.abs(gradW(w)) < 0.05
  const ballX = lx(Math.max(W_MIN, Math.min(W_MAX, w)))
  const ballY = ly(Math.min(lossMax, curLoss))

  return (
    <LessonLayout slug="gradient-descent">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        機器怎麼<b className="text-ink">自己</b>找到損失最低的那條線？
        想像你被<b className="text-brand">蒙上眼睛</b>，站在一座山坡上，
        目標是走到山谷最低點。你看不到全貌，只能用腳去感覺「哪個方向是下坡」，
        然後朝那個方向踏出一步——這一步的方向，就是<b className="text-ink">梯度（坡度）</b>告訴你的。
        一步一步重複下去，就算全程蒙眼，最後也能摸到谷底。
        這個方法就叫<b className="text-brand">梯度下降</b>。
        <br />
        那每一步該跨多大呢？想像兩種走法：
        <b className="text-ink">巨人</b>一步就跨出去好幾公尺，走得快，
        但很容易一步就跨過谷底、衝到對面山坡，甚至越走越高、根本找不到最低點；
        <b className="text-ink">螞蟻</b>一步只挪一點點，非常穩，
        但要挪很久很久才能走到谷底。這一步「跨多大」，就是<b className="text-brand">學習率</b>。
      </div>

      <Section
        title="左邊是損失山谷，右邊是對應的線"
        description="按「走一步」看小球往下坡移動一格，右邊的線同時變得更貼合資料。或直接按「自動下山」讓它一路滾到谷底。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 損失山谷 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">損失山谷（loss vs 斜率 w）</div>
            <svg viewBox={`0 0 ${LW} ${LH}`} className="w-full rounded-xl border border-line bg-cream">
              <line x1={LPAD} y1={LH - LPAD} x2={LW - LPAD} y2={LH - LPAD} stroke="var(--color-line)" />
              <path d={parabola} fill="none" stroke="var(--color-brand-soft)" strokeWidth={2.5} />
              {/* 谷底標記 */}
              <line x1={lx(0.803)} y1={20} x2={lx(0.803)} y2={LH - LPAD} stroke="var(--color-lime)" strokeWidth={1.5} strokeDasharray="4 4" />
              <text x={lx(0.803)} y={16} textAnchor="middle" fontSize={11} fill="var(--color-muted)">谷底（最佳）</text>
              {/* 小球 */}
              <circle cx={ballX} cy={ballY} r={9} fill="var(--color-orange)" stroke="#fff" strokeWidth={2} style={{ transition: 'cx 0.2s, cy 0.2s' }} />
              <text x={LW / 2} y={LH - 12} textAnchor="middle" fontSize={12} fill="var(--color-muted)">斜率 w →</text>
            </svg>
          </div>

          {/* 資料擬合 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">目前這條線 y = {w.toFixed(2)} · x</div>
            <svg viewBox={`0 0 ${RW} ${RH}`} className="w-full rounded-xl border border-line bg-cream">
              <line x1={RPAD} y1={RH - RPAD} x2={RW - RPAD} y2={RH - RPAD} stroke="var(--color-line)" />
              <line x1={RPAD} y1={20} x2={RPAD} y2={RH - RPAD} stroke="var(--color-line)" />
              <line x1={rx(0)} y1={rry(0)} x2={rx(10)} y2={rry(Math.min(8, w * 10))} stroke="var(--color-brand)" strokeWidth={3} style={{ transition: 'y2 0.2s' }} />
              {REG_XS.map((x, i) => (
                <circle key={i} cx={rx(x)} cy={rry(REG_YS[i])} r={5} fill="var(--color-ink)" stroke="#fff" strokeWidth={1.5} />
              ))}
            </svg>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <Slider
              label="學習率（🐜 螞蟻的小步 ── 巨人的大步 🧌）"
              min={0.002}
              max={0.05}
              step={0.002}
              value={lr}
              onChange={setLr}
              format={(v) => v.toFixed(3)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={stepOnce} disabled={playing}>走一步 →</Button>
              <Button variant="outline" onClick={togglePlay}>
                {playing ? '⏸ 暫停' : '▶ 自動下山'}
              </Button>
              <Button variant="ghost" onClick={reset}>重置</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-muted">步數</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-ink">{iter}</div>
            </div>
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-muted">目前損失</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-orange">{curLoss.toFixed(3)}</div>
            </div>
          </div>
        </div>

        {/* 狀態提示 */}
        <div className="mt-4 rounded-xl p-4 text-sm leading-relaxed" style={{
          background: diverging
            ? 'color-mix(in srgb, var(--color-red) 12%, white)'
            : converged
              ? 'color-mix(in srgb, var(--color-lime) 14%, white)'
              : 'var(--color-cream)',
          color: 'var(--color-muted)',
        }}>
          {diverging ? (
            <p><b className="text-red">🧌 巨人步伐太大，飛出去了！</b>{' '}
              學習率太高，小球（巨人）每一步都跨過谷底、還越衝越高——這叫「發散」。把學習率調小一點再重置試試。</p>
          ) : converged ? (
            <p><b className="text-ink">抵達谷底！</b>{' '}
              梯度（坡度）幾乎是零，小球停下來了。這時的斜率就是最佳解，右邊的線也最貼合資料。</p>
          ) : (
            <p>把學習率<b className="text-ink">調很小</b>，小球就像 🐜 螞蟻走路，走得又穩又慢；
              調<b className="text-ink">很大</b>（超過 0.03 左右），小球就像 🧌 巨人走路，
              會在谷底兩側來回震盪甚至飛走。自己試試不同大小的差別。</p>
          )}
        </div>
      </Section>

      <Challenge
        module="gradient-descent"
        id="diverge"
        title="讓小球「飛出」山谷"
        goal={<>反過來玩一次：不要讓小球乖乖滾到谷底，而是想辦法讓它<b className="text-ink">越彈越高、衝出畫面</b>。看看「走太快」會有什麼下場。</>}
        steps={[
          '把上面的「學習率」滑桿，一路拉到最右邊（最大）。',
          '按下「▶ 自動下山」按鈕。',
          '盯著左邊那顆橘色小球——它會不會不減反增、飛出山谷？',
        ]}
        hints={[
          <>學習率就是小球「每一步跨多大」。想想看：如果一步大到直接跨過整個山谷，會落在哪裡？</>,
          <>把學習率滑桿拉到 <b className="text-ink">0.05</b> 附近再按自動下山。畫面出現紅色「飛出去了」的字就成功了。</>,
        ]}
        done={diverging}
        success={<>你剛剛親眼看到「學習率太大」的後果——步伐大到每一步都跨過谷底、還越衝越高，這個現象在 AI 裡叫<b className="text-ink">發散（diverge）</b>。所以學習率<b className="text-ink">不是越大越好</b>：太貪心想一步到位，模型反而完全學不起來。這就是為什麼工程師要小心翼翼地調這個「步伐大小」。</>}
      />
    </LessonLayout>
  )
}
