import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { linearScale } from '../../lib/plot'

// 情境：健身教練怎麼「回應」你今天的表現？x 軸是「今天的表現分數」（可正可負：
// 正值＝比昨天進步、負值＝退步），y 軸是教練的反應強度。四種教練個性剛好對應
// Step / Sigmoid / Tanh / ReLU 四種激活函數的形狀與特性。
type Fn = 'step' | 'sigmoid' | 'tanh' | 'relu'
const FUNCS: Record<Fn, { label: string; coach: string; formula: string; f: (x: number) => number; note: string }> = {
  step: {
    label: 'Step',
    coach: '🥊 兩極教練',
    formula: 'x≥0 ? 1 : 0',
    f: (x) => (x >= 0 ? 1 : 0),
    note: '只要有一點點進步（x≥0）就大喊「滿分！太棒了！」，只要有一點點退步就整個句「不及格」——完全不看進步/退步「多少」，只看有沒有。這種反應在 0 分那一點會突然跳一下（不連續），教練自己也說不出「該往哪個方向調整」，沒辦法用梯度下降訓練。',
  },
  sigmoid: {
    label: 'Sigmoid',
    coach: '😊 溫暖教練',
    formula: '1 / (1+e⁻ˣ)',
    f: (x) => 1 / (1 + Math.exp(-x)),
    note: '給一個 0~100% 的「鼓勵指數」：表現普通給 50% 左右的鼓勵，越進步指數越接近 100%，越退步也頂多趨近 0%（不會給負面打擊）。缺點是表現已經很極端時，指數幾乎不再變化——教練的反應「麻木」了，梯度接近 0，深層網路訓練會變得很慢。',
  },
  tanh: {
    label: 'Tanh',
    coach: '😤 直來直往教練',
    formula: '(eˣ−e⁻ˣ)/(eˣ+e⁻ˣ)',
    f: (x) => Math.tanh(x),
    note: '反應範圍是 −100%~+100%，退步退很多時真的會「嚴厲斥責」（負值），進步很多時「大力讚美」（正值），且以 0 為中心——比溫暖教練更直接、訓練起來通常更穩定。但一樣有「表現太極端時反應就麻木」的問題。',
  },
  relu: {
    label: 'ReLU',
    coach: '📈 只看進步教練',
    formula: 'max(0, x)',
    f: (x) => Math.max(0, x),
    note: '只在乎你「有沒有比昨天更好」：退步一律當作 0 分（不額外處罰，也不鼓勵），一旦進步，進步多少就照實稱讚多少，沒有上限。計算超快、正數區反應永遠沒有麻木問題——但退步時完全沒反應，這位教練可能會對你「已讀不回」，這顆神經元就「死」了。',
  },
}

const W = 380
const H = 260
const PAD = 34
const sx = linearScale([-4, 4], [PAD, W - PAD])
const sy = linearScale([-1.3, 1.3], [H - PAD, PAD])

export function ActivationFunctions() {
  const [fn, setFn] = useState<Fn>('sigmoid')
  const [x, setX] = useState(0.5)
  const [applyActivation, setApplyActivation] = useState(true)

  const cur = FUNCS[fn]
  const curve = Array.from({ length: 161 }, (_, i) => {
    const xv = -4 + (8 * i) / 160
    return `${i ? 'L' : 'M'}${sx(xv).toFixed(1)},${sy(cur.f(xv)).toFixed(1)}`
  }).join(' ')

  // 兩層線性 vs 中間加非線性的疊層示範
  const L1 = (v: number) => 0.8 * v - 0.3 // 第一層（線性）
  const L2 = (v: number) => -0.6 * v + 0.4 // 第二層（線性）
  const composedLinear = (v: number) => L2(L1(v)) // 純線性疊加：還是線性
  const composedNonlinear = (v: number) => L2(Math.tanh(L1(v))) // 中間加 tanh：能彎了

  const S2W = 340
  const S2H = 200
  const S2PAD = 30
  const s2x = linearScale([-4, 4], [S2PAD, S2W - S2PAD])
  const s2y = linearScale([-2, 2], [S2H - S2PAD, S2PAD])
  const path2 = (f: (v: number) => number) =>
    Array.from({ length: 121 }, (_, i) => {
      const v = -4 + (8 * i) / 120
      return `${i ? 'L' : 'M'}${s2x(v).toFixed(1)},${s2y(f(v)).toFixed(1)}`
    }).join(' ')

  return (
    <LessonLayout slug="activation-functions">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        上一課「反向傳播」裡，糖漿基底那一步用了 tanh 才能彎出 S 型曲線——但 tanh 只是眾多選擇之一。
        每個神經元算完「加權加總」之後，都要決定<b className="text-ink">怎麼回應這個分數</b>，
        這道手續就叫<b className="text-brand">激活函數</b>。
        想像健身教練看到你<b className="text-ink">今天的表現分數</b>（正值＝進步、負值＝退步）後會怎麼反應——
        不同個性的教練，就是不同的激活函數。它們的共同功用是幫輸出加上<b className="text-ink">非線性的彎折</b>——
        沒有它，不管疊幾層神經網路，整體都只是一條直線，等於白疊。
      </div>

      <Section
        title="切換教練個性，看反應曲線長什麼樣"
        description="拖動下面的滑桿改變「今天的表現分數」，看橘點在曲線上移動、教練的反應強度是多少。"
      >
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-cream">
            <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="var(--color-line)" />
            <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="var(--color-line)" />
            <path d={curve} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />
            <line x1={sx(x)} y1={sy(-1.3)} x2={sx(x)} y2={sy(1.3)} stroke="var(--color-line)" strokeDasharray="3 3" />
            <circle cx={sx(x)} cy={sy(cur.f(x))} r={7} fill="var(--color-orange)" stroke="#fff" strokeWidth={2} />
            <text x={W - PAD} y={H - 10} textAnchor="end" fontSize={11} fill="var(--color-muted)">表現分數 →</text>
          </svg>

          <div className="flex flex-col gap-4">
            <SegmentedControl
              fill
              value={fn}
              onChange={setFn}
              segments={(Object.keys(FUNCS) as Fn[]).map((k) => ({ value: k, label: FUNCS[k].label }))}
            />
            <div className="rounded-xl bg-cream p-3 text-center">
              <div className="text-sm font-semibold text-ink">{cur.coach}</div>
              <div className="mt-0.5 font-mono text-xs text-brand">{cur.formula}</div>
            </div>

            <Slider label="今天的表現分數" min={-4} max={4} step={0.1} value={x} onChange={setX} format={(v) => v.toFixed(1)} />
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-muted">教練的反應強度</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-orange">{cur.f(x).toFixed(3)}</div>
            </div>

            <div className="rounded-xl border border-line p-3 text-sm leading-relaxed text-muted">{cur.note}</div>
          </div>
        </div>
      </Section>

      <Section
        title="為什麼一定要非線性？"
        description="下面疊了兩位「線性反應」的教練接力給回饋。關掉中間的非線性，看兩層接力的結果——會發現它還是一條直線！換上一位非線性反應（tanh）的教練，才能真正彎出曲線。"
      >
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <svg viewBox={`0 0 ${S2W} ${S2H}`} className="w-full rounded-xl border border-line bg-cream">
            <line x1={S2PAD} y1={s2y(0)} x2={S2W - S2PAD} y2={s2y(0)} stroke="var(--color-line)" />
            <line x1={s2x(0)} y1={S2PAD} x2={s2x(0)} y2={S2H - S2PAD} stroke="var(--color-line)" />
            <path d={path2(applyActivation ? composedNonlinear : composedLinear)} fill="none" stroke="var(--color-brand)" strokeWidth={2.75} />
          </svg>

          <div className="flex flex-col justify-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" checked={applyActivation} onChange={(e) => setApplyActivation(e.target.checked)} />
              中間那位教練換成「非線性反應」（tanh）
            </label>
            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              {applyActivation ? (
                <p>現在看到的是<b className="text-ink">彎曲的曲線</b>——因為中間那位教練用 tanh 式反應，
                  把第一位教練的回饋先「折」了一下，第二位教練再接手，整體就不再是直線。</p>
              ) : (
                <p><b className="text-ink">兩位教練都只會「照比例放大縮小」地反應（線性）</b>，接力起來還是一條直線。</p>
              )}
            </div>
            {!applyActivation && (
              <p className="text-xs leading-relaxed text-muted">
                數學上：兩個線性函數合成，結果永遠還是線性函數——不管疊幾百位教練接力，都跟只有一位教練喊話沒兩樣。
                這就是為什麼每一層之間<b className="text-ink">一定要有激活函數</b>：沒有它，深度再深的網路也只是在做「一次性的比例縮放」，學不會複雜的判斷。
              </p>
            )}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">四位教練怎麼選？</b>{' '}
        Step 教練已經被淘汰——他的反應不連續，沒辦法算梯度，練不出來。
        Sigmoid／Tanh 教練在表現太極端時會「反應麻木」（梯度消失），深層網路訓練會卡住。
        <b className="text-ink">ReLU 教練</b>簡單、快、正數區反應永遠不麻木，是目前最常見的預設選擇——
        代價是退步時「已讀不回」，神經元有時會整顆「死掉」不再更新，這也是研究者持續在改良 ReLU 的原因。
      </div>
    </LessonLayout>
  )
}
