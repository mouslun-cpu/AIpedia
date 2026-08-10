import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Challenge } from '../../components/Challenge'
import { Slider } from '../../components/ui/Slider'
import { linearScale } from '../../lib/plot'
import { INDICATORS, N_DAYS, N_IND, RF_STOCKS, WARMUP, type RFSample } from './data'
import { buildForest, buildTree, predictTree, seeded, type TreeNode } from './forest'

const UP = 'var(--color-red)' // 台股習慣：紅漲
const DOWN = 'var(--color-teal)' // 綠跌
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`

const MAX_TREES = 40
const JUNK = [2, 3, 4] // 波動、量能、星期＝純雜訊（頁面訊息用，不告訴學生）

// 把單棵樹翻譯成人話規則（顯示到第 3 層）
function rulesOf(node: TreeNode, depth: number, branch: string, out: string[]) {
  const pad = '　'.repeat(depth)
  const tag = branch ? `${branch}→ ` : ''
  if (node.leaf) {
    out.push(pad + tag + (node.pred === 1 ? '📈 看漲' : '📉 看跌'))
    return
  }
  if (depth >= 3) {
    out.push(pad + tag + '…（規則已經細到在背個案了）')
    return
  }
  const f = INDICATORS[node.feat]
  out.push(`${pad}${tag}${f.emoji}${f.name} 小於 ${(node.thr * 100).toFixed(0)}？`)
  rulesOf(node.left, depth + 1, '是', out)
  rulesOf(node.right, depth + 1, '否', out)
}

// ── 圖表尺寸 ──
const PW = 760
const PH = 190
const GW = 460
const GH = 210
const VW = 760
const VH = 170
const EW = 760
const EH = 210

export function RandomForest() {
  const [stockIdx, setStockIdx] = useState(0)
  const [sel, setSel] = useState<boolean[]>(Array(N_IND).fill(true))
  const [singleDepth, setSingleDepth] = useState(4)
  const [mtry, setMtry] = useState(2)
  const [nTrees, setNTrees] = useState(10)
  const [threshold, setThreshold] = useState(0.5)

  const stock = RF_STOCKS[stockIdx]
  const train = useMemo(() => stock.samples.slice(0, stock.trainCount), [stock])
  const test = useMemo(() => stock.samples.slice(stock.trainCount), [stock])

  const feats = useMemo(() => sel.flatMap((v, i) => (v ? [i] : [])), [sel])
  const effMtry = Math.min(mtry, feats.length)
  const isAllJunk = feats.every((f) => JUNK.includes(f))

  function toggleFeat(i: number) {
    setSel((prev) => {
      const n = prev.filter(Boolean).length
      if (prev[i] && n <= 2) return prev // 至少留 2 個
      return prev.map((v, j) => (j === i ? !v : v))
    })
  }

  // ── Step 2：單棵樹 ──
  const singleTree = useMemo(
    () => buildTree(train, feats, singleDepth, feats.length, seeded(1)),
    [train, feats, singleDepth],
  )
  const stAcc = (set: RFSample[]) =>
    set.filter((s) => predictTree(singleTree, s.nf) === s.label).length / set.length
  const stTrain = stAcc(train)
  const stTest = stAcc(test)
  const rules = useMemo(() => {
    const out: string[] = []
    rulesOf(singleTree, 0, '', out)
    return out.slice(0, 30)
  }, [singleTree])

  // ── Step 3：森林 ──
  const allTrees = useMemo(
    () => buildForest(train, feats, MAX_TREES, effMtry),
    [train, feats, effMtry],
  )
  // 一次算好「前 m 棵樹」的測試正確率曲線，以及目前 nTrees 下每天的喊漲比例
  const { accCurve, probs } = useMemo(() => {
    const sums = new Array(test.length).fill(0)
    const curve: number[] = []
    let probsAt: number[] = test.map(() => 0)
    allTrees.forEach((t, i) => {
      test.forEach((s, j) => {
        if (predictTree(t, s.nf) === 1) sums[j]++
      })
      const m = i + 1
      curve.push(
        test.filter((s, j) => (sums[j] / m >= 0.5 ? 1 : -1) === s.label).length / test.length,
      )
      if (m === nTrees) probsAt = sums.map((v) => v / m)
    })
    return { accCurve: curve, probs: probsAt }
  }, [allTrees, test, nTrees])
  const forestTest = accCurve[nTrees - 1]
  const forestTrain = useMemo(() => {
    const trees = allTrees.slice(0, nTrees)
    return (
      train.filter(
        (s) =>
          (trees.filter((t) => predictTree(t, s.nf) === 1).length / trees.length >= 0.5 ? 1 : -1) ===
          s.label,
      ).length / train.length
    )
  }, [allTrees, nTrees, train])

  // ── Step 4：策略回測 ──
  const backtest = useMemo(() => {
    let ai = 1
    let bh = 1
    let wins = 0
    let entered = 0
    const aiCurve = [1]
    const bhCurve = [1]
    test.forEach((s, j) => {
      if (probs[j] >= threshold) {
        ai *= 1 + s.ret
        entered++
        if (s.ret > 0) wins++
      }
      bh *= 1 + s.ret
      aiCurve.push(ai)
      bhCurve.push(bh)
    })
    return { aiCurve, bhCurve, aiRet: ai - 1, bhRet: bh - 1, entered, winRate: entered ? wins / entered : 0 }
  }, [test, probs, threshold])

  // ── 圖表比例尺 ──
  const pMin = Math.min(...stock.prices)
  const pMax = Math.max(...stock.prices)
  const px = linearScale([0, N_DAYS - 1], [30, PW - 14])
  const py = linearScale([pMin - 1, pMax + 1], [PH - 24, 28])
  const pricePath = stock.prices.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(p).toFixed(1)}`).join(' ')
  const splitDay = WARMUP + stock.trainCount

  const gx = linearScale([1, MAX_TREES], [40, GW - 14])
  const gy = linearScale([0.35, 0.85], [GH - 26, 14])
  const curvePathG = accCurve.map((a, i) => `${i ? 'L' : 'M'}${gx(i + 1).toFixed(1)},${gy(a).toFixed(1)}`).join(' ')

  const vx = linearScale([0, test.length], [36, VW - 12])
  const vy = linearScale([0, 1], [VH - 24, 12])
  const barW = (VW - 48) / test.length

  const allEq = [...backtest.aiCurve, ...backtest.bhCurve]
  const ex = linearScale([0, test.length], [40, EW - 14])
  const ey = linearScale([Math.min(...allEq) - 0.01, Math.max(...allEq) + 0.01], [EH - 24, 14])
  const eqPath = (c: number[]) => c.map((v, i) => `${i ? 'L' : 'M'}${ex(i).toFixed(1)},${ey(v).toFixed(1)}`).join(' ')

  const gap = stTrain - stTest

  return (
    <LessonLayout slug="random-forest">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        SVM 專題用一條直線做多空判斷；這次你升格為<b className="text-ink">操盤團隊主管</b>，
        要打造一套<b className="text-brand">隨機森林（Random Forest）選股策略</b>。
        流程走真的：<b className="text-ink">挑指標 → 先種一棵樹（見識它死背）→ 種一片森林（看它被治好）→
        用「投票信心」組成進出場策略</b>。
        隨機森林的核心哲學一句話：<b className="text-brand">與其相信一個想太多的天才，不如讓一群各有偏見的普通人投票</b>。
      </div>

      {/* ── Step 1：指標工廠 ── */}
      <Section
        title="Step 1｜指標工廠：挑你要餵給模型的指標"
        description="6 個常見技術指標任你挑（至少 2 個）。注意：指標不是越多越好——裡面混了幾個根本沒用的「玄學指標」，選到什麼就餵什麼，模型不會幫你過濾良心。"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {RF_STOCKS.map((s, i) => (
            <button
              key={s.code}
              onClick={() => setStockIdx(i)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                i === stockIdx
                  ? 'border-brand bg-brand/10 font-medium text-brand'
                  : 'border-line text-muted hover:border-brand-soft'
              }`}
            >
              📈 {s.code} {s.name}
            </button>
          ))}
          <span className="text-xs text-muted">← 跟 SVM 專題同兩檔股票，隨時可切換驗證</span>
        </div>

        <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full rounded-xl border border-line bg-cream">
          <rect x={px(0)} y={24} width={px(WARMUP) - px(0)} height={PH - 48} fill="var(--color-muted)" opacity={0.07} />
          <rect x={px(WARMUP)} y={24} width={px(splitDay) - px(WARMUP)} height={PH - 48} fill="var(--color-brand)" opacity={0.08} />
          <rect x={px(splitDay)} y={24} width={px(N_DAYS - 1) - px(splitDay)} height={PH - 48} fill="var(--color-orange)" opacity={0.1} />
          <line x1={px(splitDay)} y1={24} x2={px(splitDay)} y2={PH - 24} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={(px(WARMUP) + px(splitDay)) / 2} y={16} textAnchor="middle" fontSize={11} fill="var(--color-brand)">📘 訓練期 {stock.trainCount} 天</text>
          <text x={(px(splitDay) + px(N_DAYS - 1)) / 2} y={16} textAnchor="middle" fontSize={11} fill="var(--color-orange)">📝 考試期 {test.length} 天</text>
          <path d={pricePath} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
        </svg>

        <div className="mt-4 flex flex-wrap gap-2">
          {INDICATORS.map((f, i) => (
            <button
              key={i}
              onClick={() => toggleFeat(i)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                sel[i]
                  ? 'border-brand bg-brand/10 font-medium text-brand'
                  : 'border-line text-muted opacity-60 hover:border-brand-soft'
              }`}
            >
              {sel[i] ? '✓' : '+'} {f.emoji} {f.name}
            </button>
          ))}
          <span className="self-center text-xs text-muted">已選 {feats.length} 個</span>
        </div>
        <div className="mt-3 rounded-xl bg-cream p-3 text-xs leading-relaxed text-muted">
          {feats.map((f) => (
            <div key={f}>{INDICATORS[f].emoji} <b className="text-ink">{INDICATORS[f].name}</b>：{INDICATORS[f].desc}</div>
          ))}
        </div>
      </Section>

      {/* ── Step 2：一棵樹 ── */}
      <Section
        title="Step 2｜先種一棵樹：親眼看「死背」長什麼樣"
        description="決策樹用你選的指標，一路問是非題把日子分堆。拉深度滑桿：越深，訓練成績越漂亮、規則越瑣碎——然後看它上考場的樣子。"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-line bg-cream p-4">
            <div className="mb-2 text-sm font-medium text-muted">這棵樹學到的規則（指標值已正規化為 0～100）</div>
            <div className="max-h-56 overflow-y-auto font-mono text-[13px] leading-relaxed text-ink">
              {rules.map((r, i) => (
                <div key={i}>{r}</div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Slider label="樹的深度（最多問幾層問題）" min={1} max={6} value={singleDepth} onChange={setSingleDepth} suffix="層" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">📘 訓練期正確率</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-ink">{(stTrain * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-xl border-2 border-orange/50 bg-cream p-3">
                <div className="text-xs text-muted">📝 考試期正確率</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-orange">{(stTest * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              {singleDepth <= 1 ? (
                <p>只問 1 層＝只用一刀切。簡單到<b className="text-ink">想不夠</b>，但也因此不太會死背。記下這個考試分數，等等跟森林比。</p>
              ) : gap >= 0.2 ? (
                <p><b className="text-red">死背現行犯！</b>訓練 {(stTrain * 100).toFixed(0)}% vs 考試 {(stTest * 100).toFixed(0)}%，
                  差了 {(gap * 100).toFixed(0)} 個百分點。看左邊的規則——它已經在為個別日子量身訂做瑣碎規則了。
                  這就是單棵深樹的天性：<b className="text-ink">記憶力太好、又只會一條路走到黑</b>。</p>
              ) : (
                <p>訓練 {(stTrain * 100).toFixed(0)}%、考試 {(stTest * 100).toFixed(0)}%。繼續往深調，看訓練分數怎麼一路虛胖、考試分數卻開始下滑。</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Step 3：森林 ── */}
      <Section
        title="Step 3｜種一片森林：用兩個「隨機」治好死背"
        description={
          <>
            隨機森林對每棵樹動兩個手腳：<b className="text-ink">① Bootstrap 抽樣</b>——每棵樹只看「隨機抽出（可重複）」的訓練日，
            每棵看到的歷史都不太一樣；<b className="text-ink">② 指標隨機</b>——每次分裂只從隨機抽出的幾個指標裡挑刀。
            兩個隨機讓每棵樹「笨得各有特色」，最後<b className="text-brand">多數決投票</b>，個別的怪癖互相抵銷。
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">考試正確率 vs 樹的數量</div>
            <svg viewBox={`0 0 ${GW} ${GH}`} className="w-full rounded-xl border border-line bg-cream">
              <line x1={40} y1={gy(0.5)} x2={GW - 14} y2={gy(0.5)} stroke="var(--color-line)" strokeDasharray="4 4" />
              <text x={GW - 16} y={gy(0.5) - 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">🪙 丟銅板 50%</text>
              <line x1={40} y1={gy(stTest)} x2={GW - 14} y2={gy(stTest)} stroke="var(--color-orange)" strokeWidth={1.5} strokeDasharray="6 4" />
              <text x={GW - 16} y={gy(stTest) - 4} textAnchor="end" fontSize={10} fill="var(--color-orange)">你的單棵樹 {(stTest * 100).toFixed(0)}%</text>
              <path d={curvePathG} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />
              <circle cx={gx(nTrees)} cy={gy(forestTest)} r={6} fill="var(--color-brand)" stroke="#fff" strokeWidth={2} />
              <text x={40} y={GH - 8} fontSize={10} fill="var(--color-muted)">1 棵</text>
              <text x={GW - 14} y={GH - 8} textAnchor="end" fontSize={10} fill="var(--color-muted)">{MAX_TREES} 棵</text>
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <Slider label="森林裡的樹" min={1} max={MAX_TREES} value={nTrees} onChange={setNTrees} suffix="棵" />
            <Slider
              label={`指標隨機：每次分裂只看幾個指標（共選了 ${feats.length} 個）`}
              min={1}
              max={Math.max(1, feats.length)}
              value={effMtry}
              onChange={setMtry}
              suffix="個"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">🌳 森林：訓練 / 考試</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-ink">
                  {(forestTrain * 100).toFixed(0)}% / <span className="text-brand">{(forestTest * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">🌲 單棵樹：訓練 / 考試</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-ink">
                  {(stTrain * 100).toFixed(0)}% / <span className="text-orange">{(stTest * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              {isAllJunk ? (
                <p>😵 你只選了<b className="text-ink">玄學指標</b>——就算 {nTrees} 棵樹投票，垃圾進還是垃圾出。
                  森林能平滑雜訊，但<b className="text-ink">不能無中生有</b>。回 Step 1 換指標吧。</p>
              ) : forestTest > stTest + 0.02 ? (
                <p>🌳 <b className="text-ink">森林（{(forestTest * 100).toFixed(0)}%）贏過單棵樹（{(stTest * 100).toFixed(0)}%）</b>。
                  注意森林的訓練分數可能也很高，但它靠投票抵銷了個別樹的死背，考試不崩盤。
                  也試試把「指標隨機」調到 1：每棵樹被迫用不同指標思考，意見更多元。</p>
              ) : (
                <p>目前森林 {(forestTest * 100).toFixed(0)}% vs 單棵樹 {(stTest * 100).toFixed(0)}%。
                  樹太少時投票還不穩，把樹加多一點看曲線怎麼爬。</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Step 4：策略 ── */}
      <Section
        title="Step 4｜組合成策略：不是每天都要出手"
        description="森林投票還送你一個禮物：信心。40 棵樹裡有幾棵喊漲，就是它「多有把握」。老手不會每天交易——只在把握夠高的日子進場。拉動信心門檻，看策略怎麼從「天天賭」變成「只打甜蜜球」。"
      >
        <div className="mb-1.5 text-sm font-medium text-muted">考試期每天的「森林喊漲比例」（棒子顏色＝隔天實際漲跌）</div>
        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full rounded-xl border border-line bg-cream">
          {test.map((s, j) => (
            <rect
              key={j}
              x={vx(j) + 0.5}
              y={vy(probs[j])}
              width={Math.max(1, barW - 2)}
              height={vy(0) - vy(probs[j])}
              fill={s.label === 1 ? UP : DOWN}
              opacity={probs[j] >= threshold ? 0.9 : 0.28}
            >
              <title>{`考試第 ${j + 1} 天：${(probs[j] * 100).toFixed(0)}% 的樹喊漲 → 隔天${s.label === 1 ? '漲' : '跌'} ${fmtPct(s.ret)}`}</title>
            </rect>
          ))}
          <line x1={36} y1={vy(0.5)} x2={VW - 12} y2={vy(0.5)} stroke="var(--color-line)" />
          <line x1={36} y1={vy(threshold)} x2={VW - 12} y2={vy(threshold)} stroke="var(--color-orange)" strokeWidth={2} strokeDasharray="6 4" />
          <text x={VW - 14} y={vy(threshold) - 5} textAnchor="end" fontSize={11} fill="var(--color-orange)">進場門檻 {(threshold * 100).toFixed(0)}%</text>
          <text x={8} y={vy(1) + 8} fontSize={10} fill="var(--color-muted)">100%</text>
          <text x={8} y={vy(0)} fontSize={10} fill="var(--color-muted)">0%</text>
        </svg>
        <p className="mt-1.5 text-xs text-muted">亮色＝有進場的日子（喊漲比例過門檻）；暗色＝空手觀望。紅棒＝那天實際上漲、綠棒＝下跌。</p>

        <div className="mt-4">
          <Slider
            label="信心門檻：至少幾 % 的樹喊漲才進場"
            min={0.5}
            max={0.85}
            step={0.05}
            value={threshold}
            onChange={setThreshold}
            format={(v) => `${(v * 100).toFixed(0)}%`}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-cream p-3">
            <div className="text-xs text-muted">🤖 策略報酬</div>
            <div className="mt-0.5 font-mono text-xl font-semibold" style={{ color: backtest.aiRet >= 0 ? UP : DOWN }}>{fmtPct(backtest.aiRet)}</div>
          </div>
          <div className="rounded-xl bg-cream p-3">
            <div className="text-xs text-muted">🧘 買著不動</div>
            <div className="mt-0.5 font-mono text-xl font-semibold" style={{ color: backtest.bhRet >= 0 ? UP : DOWN }}>{fmtPct(backtest.bhRet)}</div>
          </div>
          <div className="rounded-xl bg-cream p-3">
            <div className="text-xs text-muted">進場天數</div>
            <div className="mt-0.5 font-mono text-xl font-semibold text-ink">{backtest.entered}<span className="text-sm text-muted"> / {test.length}</span></div>
          </div>
          <div className="rounded-xl bg-cream p-3">
            <div className="text-xs text-muted">出手勝率</div>
            <div className="mt-0.5 font-mono text-xl font-semibold text-brand">{backtest.entered ? (backtest.winRate * 100).toFixed(0) : '–'}%</div>
          </div>
        </div>

        <svg viewBox={`0 0 ${EW} ${EH}`} className="mt-4 w-full rounded-xl border border-line bg-cream">
          <line x1={40} y1={ey(1)} x2={EW - 14} y2={ey(1)} stroke="var(--color-line)" strokeDasharray="4 4" />
          <text x={36} y={ey(1) + 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">本金</text>
          <path d={eqPath(backtest.bhCurve)} fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeDasharray="6 4" />
          <path d={eqPath(backtest.aiCurve)} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />
        </svg>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-brand" /> 🌳 森林策略</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-muted" /> 🧘 買著不動</span>
        </div>

        <div className="mt-4 rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
          {backtest.entered === 0 ? (
            <p>門檻高到整段考試期都空手——太挑了，一顆甜蜜球都沒等到。降一點門檻吧。</p>
          ) : backtest.aiRet > backtest.bhRet && backtest.winRate >= 0.7 ? (
            <p>🏆 <b className="text-ink">高門檻的威力</b>：只在 {backtest.entered} 天出手，勝率 {(backtest.winRate * 100).toFixed(0)}%，
              報酬 {fmtPct(backtest.aiRet)} 還贏過買著不動。這就是森林投票「信心」的價值——
              <b className="text-brand">寧可少做，只做有把握的</b>。換一檔股票驗證看看。</p>
          ) : backtest.aiRet > 0 ? (
            <p>💰 有賺。試著把門檻拉高，觀察「進場天數變少、勝率變高」的交換——找到你的甜蜜點。</p>
          ) : (
            <p>😅 策略賠錢。回頭檢查：Step 1 的指標選得好嗎？Step 3 的森林考試分數夠高嗎？
              <b className="text-ink">上游壞掉，下游的門檻救不了</b>。</p>
          )}
        </div>
      </Section>

      <Challenge
        module="random-forest"
        id="high-winrate"
        title="打造一套「只打有把握的球」策略"
        goal={<>調整上面各步驟的設定，讓 Step 4 的<b className="text-ink">出手勝率達到 75% 以上</b>（而且至少有出手幾天，不能整段都空手）。</>}
        steps={[
          '回到 Step 1，只留下真正有用的指標：🧲 乖離 和 🏃 動量（其他先取消）。',
          '到 Step 3，把「森林裡的樹」拉到 30 棵以上，讓投票夠穩。',
          '到 Step 4，把「信心門檻」往右拉高——只在很多樹都看漲的日子才進場。',
          '看右下角「出手勝率」，衝到 75% 以上就達成。',
        ]}
        hints={[
          <>指標不是越多越好。🌊波動、📢量能、🗓️星期 是故意混進來的雜訊，選了它們反而拖累森林。</>,
          <>門檻越高＝越挑剔＝出手越少但越準。把門檻拉到 <b className="text-ink">65% 或 70%</b>，觀察「進場天數變少、勝率變高」的取捨。</>,
          <>如果某一檔股票怎麼調都不理想，換另一檔（上方切換按鈕）再試——真實市場本來就有的行情差異。</>,
        ]}
        done={backtest.winRate >= 0.75 && backtest.entered >= 3}
        success={<>你剛剛體會到專業操盤的心法：<b className="text-ink">不是每天都要交易，而是只在把握夠高時才出手</b>。森林裡「多少樹看漲」就是它的信心，你用這個信心設了一道門檻，把勝率篩上去。這也呼應了整個隨機森林的精神——<b className="text-ink">與其相信一個想太多的天才，不如讓一群各有偏見的普通人投票</b>。⚠️ 當然，真實市場的訊號更弱、還有手續費，別把這個練習當明牌！</>}
      />

      {/* ── 收尾 ── */}
      <div className="mt-10 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">🌳 隨機森林，你剛剛全部親手做過一遍：</b>
        <ul className="mt-2 space-y-1.5">
          <li>· <b className="text-ink">Bootstrap 抽樣</b>——每棵樹看隨機抽出的訓練日（Step 3 的隨機之一）</li>
          <li>· <b className="text-ink">指標隨機</b>——每次分裂只看部分指標，逼樹們「想得不一樣」（隨機之二）</li>
          <li>· <b className="text-ink">多數決投票</b>——把一群過擬合的樹，平均成一個穩健的判斷</li>
          <li>· <b className="text-ink">投票比例＝信心</b>——免費送的機率輸出，直接變成進出場門檻（Step 4）</li>
        </ul>
        <p className="mt-3">
          🧯 誠實時間：真實市場的訊號更弱、手續費會吃掉薄利、規律會失效——但「單棵樹會死背、森林用隨機+投票治好它」這件事，
          在任何領域都成立。下一課 <b className="text-brand">Bagging vs Boosting</b>，
          會拆開「組隊」這件事的兩種完全不同的哲學。
        </p>
      </div>
    </LessonLayout>
  )
}
