import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'
import { polyfit, mse } from '../../lib/polyfit'

// 固定 40 位「學生」的讀書時數 → 考試分數關聯（帶雜訊），這批資料本身不會變，
// 只有「怎麼切成訓練/驗證/測試」會隨比例和洗牌種子改變。
const N_TOTAL = 40
const DEGREES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function trueCurve(x: number) {
  return 0.55 + 0.25 * Math.sin(x * 6.2 + 0.3)
}
function seededRand(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}
function makePool(seed: number) {
  const rand = seededRand(seed)
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < N_TOTAL; i++) {
    const x = Math.min(0.98, Math.max(0.02, (i + 0.5) / N_TOTAL + (rand() - 0.5) * 0.15))
    xs.push(x)
    ys.push(trueCurve(x) + (rand() - 0.5) * 0.26)
  }
  return { xs, ys }
}
const POOL = makePool(777)
const GLOBAL_VAR = (() => {
  const m = POOL.ys.reduce((a, b) => a + b, 0) / POOL.ys.length
  return POOL.ys.reduce((s, y) => s + (y - m) ** 2, 0) / POOL.ys.length
})()

function shuffledIndices(seed: number) {
  const rand = seededRand(seed)
  const arr = Array.from({ length: N_TOTAL }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function scoreFrom(m: number) {
  return Math.max(0, Math.min(100, 100 * (1 - m / GLOBAL_VAR)))
}

const W = 400
const H = 300
const PAD = 32
const sx = linearScale([0, 1], [PAD, W - PAD])
const sy = linearScale([0, 1.2], [H - PAD, PAD])

export function TrainValTest() {
  const [trainPct, setTrainPct] = useState(70)
  const [valShare, setValShare] = useState(50) // 剩下的資料裡，驗證集佔多少 %
  const [shuffleSeed, setShuffleSeed] = useState(1)

  const remainder = 100 - trainPct
  const valPct = remainder * (valShare / 100)
  const testPct = remainder - valPct

  const result = useMemo(() => {
    const order = shuffledIndices(shuffleSeed)
    let nTrain = Math.round((trainPct / 100) * N_TOTAL)
    let nVal = Math.round((valPct / 100) * N_TOTAL)
    nTrain = Math.max(6, Math.min(N_TOTAL - 2, nTrain))
    nVal = Math.max(1, Math.min(N_TOTAL - nTrain - 1, nVal))
    const nTest = N_TOTAL - nTrain - nVal

    const trainIdx = order.slice(0, nTrain)
    const valIdx = order.slice(nTrain, nTrain + nVal)
    const testIdx = order.slice(nTrain + nVal)

    const pick = (idx: number[]) => ({
      xs: idx.map((i) => POOL.xs[i]),
      ys: idx.map((i) => POOL.ys[i]),
    })
    const train = pick(trainIdx)
    const val = pick(valIdx)
    const test = pick(testIdx)

    // 依驗證集誤差，從候選次數裡挑出「模考成績最好」的模型
    let best = { degree: DEGREES[0], valMse: Infinity }
    for (const d of DEGREES) {
      if (train.xs.length < d + 2) continue
      const model = polyfit(train.xs, train.ys, d)
      const vMse = mse(model, val.xs, val.ys)
      if (vMse < best.valMse) best = { degree: d, valMse: vMse }
    }
    const chosen = polyfit(train.xs, train.ys, best.degree)
    const trainScore = scoreFrom(mse(chosen, train.xs, train.ys))
    const valScore = scoreFrom(mse(chosen, val.xs, val.ys))
    const testScore = scoreFrom(mse(chosen, test.xs, test.ys))

    return {
      trainIdx, valIdx, testIdx, nTrain, nVal, nTest,
      degree: best.degree, chosen, trainScore, valScore, testScore,
    }
  }, [trainPct, valPct, shuffleSeed])

  const membership = useMemo(() => {
    const m = new Array(N_TOTAL).fill('train')
    result.valIdx.forEach((i) => (m[i] = 'val'))
    result.testIdx.forEach((i) => (m[i] = 'test'))
    return m
  }, [result])

  const gap = result.valScore - result.testScore
  const fooled = gap > 15
  const testTiny = result.nTest <= 3

  const curve = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 160; i++) {
      const x = i / 160
      pts.push(`${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(result.chosen.predict(x)).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [result])

  const COLOR: Record<string, string> = {
    train: 'var(--color-brand)',
    val: 'var(--color-teal)',
    test: 'var(--color-orange)',
  }

  return (
    <LessonLayout slug="train-val-test">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        手上有一批「讀書時數 → 考試分數」的學生資料，能不能<b className="text-ink">全部拿去教機器</b>就好？
        不行——那樣就像「小考、模擬考、正式考的題目全部一樣」，機器只要死背就能拿高分。
        所以資料要切成三份，各司其職。但切的<b className="text-ink">比例沒抓好</b>，
        會發生更麻煩的事：<b className="text-brand">模擬考拿高分，正式考卻不及格</b>。往下調調看就知道為什麼。
      </div>

      <Section
        title="調整比例，看模型選擇的真實後果"
        description="下面會用「訓練集」試著擬合幾種複雜度的曲線，挑出「驗證集」上表現最好的那個當作最終模型，最後用「測試集」給出真正誠實的分數。"
      >
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-cream">
              <defs>
                <clipPath id="tvtClip"><rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} /></clipPath>
              </defs>
              <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke="var(--color-line)" />
              <path d={curve} fill="none" stroke="var(--color-ink)" strokeWidth={2.5} clipPath="url(#tvtClip)" opacity={0.75} />
              {POOL.xs.map((x, i) => (
                <circle
                  key={i}
                  cx={sx(x)}
                  cy={sy(POOL.ys[i])}
                  r={membership[i] === 'train' ? 4.5 : 6}
                  fill={membership[i] === 'train' ? COLOR.train : 'none'}
                  stroke={COLOR[membership[i]]}
                  strokeWidth={membership[i] === 'train' ? 1 : 2.5}
                />
              ))}
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />訓練（{result.nTrain}）</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-teal" />驗證（{result.nVal}）</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-orange" />測試（{result.nTest}）</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Slider label="訓練集佔全部的比例" min={40} max={90} step={5} value={trainPct} onChange={setTrainPct} suffix="%" />
            <Slider label="剩下的資料裡，驗證集佔多少" min={10} max={90} step={10} value={valShare} onChange={setValShare} suffix="%" />
            <p className="-mt-2 text-xs text-muted">
              目前切成：訓練 {trainPct}%、驗證 {valPct.toFixed(0)}%、測試 {testPct.toFixed(0)}%
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-cream p-3 text-center">
                <div className="text-xs text-muted">小考（訓練）</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-brand">{result.trainScore.toFixed(0)}</div>
              </div>
              <div className="rounded-xl bg-cream p-3 text-center">
                <div className="text-xs text-muted">模考（驗證）</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-teal">{result.valScore.toFixed(0)}</div>
              </div>
              <div className="rounded-xl bg-cream p-3 text-center">
                <div className="text-xs text-muted">正式考（測試）</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-orange">{result.testScore.toFixed(0)}</div>
              </div>
            </div>

            <div className="text-xs text-muted">機器自動選中的複雜度：<b className="text-ink">{result.degree} 次多項式</b>（依驗證集分數挑出來的）</div>

            <Button variant="outline" onClick={() => setShuffleSeed((s) => s + 1)}>🔀 重新洗牌（比例不變，換一批人分組）</Button>

            {fooled && (
              <div className="rounded-xl border border-red bg-red/10 p-3 text-sm text-ink">
                ⚠️ <b>模考（驗證）{result.valScore.toFixed(0)} 分，正式考（測試）卻只有 {result.testScore.toFixed(0)} 分！</b>{' '}
                機器挑模型時只看得到驗證集，而驗證集資料太少，讓它誤選了一個「剛好很會猜這幾題」但其實不夠通用的模型。
              </div>
            )}
            {!fooled && testTiny && (
              <div className="rounded-xl border border-line bg-cream p-3 text-sm text-muted">
                這次兩邊分數差不多，但測試集只有 {result.nTest} 筆資料——按「重新洗牌」試試看，
                你會發現正式考分數<b className="text-ink">忽高忽低很不穩定</b>，因為題目太少，一兩題運氣就能左右結果。
              </div>
            )}
            {!fooled && !testTiny && (
              <div className="rounded-xl border border-lime bg-lime/10 p-3 text-sm text-ink">
                ✅ 模考和正式考分數對得上，代表這組切分比例的驗證集、測試集都夠大，評估結果值得信任。
              </div>
            )}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">試試這兩個極端：</b>{' '}
        把「驗證集佔比」拉到很小，機器選模型時只看得到寥寥幾筆資料，很容易被那幾筆的雜訊騙走，
        選出一個表面上模考很行、正式考見真章就破功的模型——這就是<b className="text-brand">驗證集太小的風險</b>。
        接著把「測試集」拉到很小（訓練+驗證佔比拉到 85% 以上）並多按幾次重新洗牌，
        你會看到正式考分數<b className="text-brand">上下亂跳</b>——這代表測試集太小時，
        連「這個分數到底準不準」這件事本身都不可靠。
      </div>
    </LessonLayout>
  )
}
