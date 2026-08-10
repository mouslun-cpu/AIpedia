import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { linearScale } from '../../lib/plot'
import { trainSVM, lineBoxIntersect } from '../svm/svm'
import { FEATURES, N_DAYS, STOCKS, WARMUP, type StockSample } from './data'

// ── 股價走勢圖 ──
const PW = 760
const PH = 210
const PPAD = 34

// ── 特徵散點圖 ──
const S = 340
const SPAD = 30
const ssx = linearScale([0, 1], [SPAD, S - SPAD])
const ssy = linearScale([0, 1], [S - SPAD, SPAD])
const GRID = 20

// ── 回測資產曲線 ──
const EW = 760
const EH = 230
const EPAD = 40

const UP = 'var(--color-red)' // 台股習慣：紅漲
const DOWN = 'var(--color-teal)' // 綠跌

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`

export function SVMStock() {
  const [stockIdx, setStockIdx] = useState(0)
  // 一開始故意給兩條「純雜訊」線索——學生會先看到跟丟銅板一樣的成績，
  // 再靠自己換線索，親手把正確率救起來。
  const [fx, setFx] = useState(2)
  const [fy, setFy] = useState(3)
  const [C, setC] = useState(6)

  const stock = STOCKS[stockIdx]
  const train = useMemo(() => stock.samples.slice(0, stock.trainCount), [stock])
  const test = useMemo(() => stock.samples.slice(stock.trainCount), [stock])

  // 訓練 SVM（任何參數一變就即時重訓）
  const svm = useMemo(
    () => trainSVM(train.map((s) => ({ x: s.nf[fx], y: s.nf[fy], label: s.label })), C),
    [train, fx, fy, C],
  )
  const predict = (s: StockSample): 1 | -1 =>
    svm.w[0] * s.nf[fx] + svm.w[1] * s.nf[fy] + svm.b >= 0 ? 1 : -1

  const trainAcc = train.filter((s) => predict(s) === s.label).length / train.length
  const testAcc = test.filter((s) => predict(s) === s.label).length / test.length

  // 回測：考試期每天照 AI 訊號操作（說漲→持有一天、說跌→空手）
  const backtest = useMemo(() => {
    let ai = 1
    let bh = 1
    let tradeDays = 0
    const aiCurve = [1]
    const bhCurve = [1]
    for (const s of test) {
      if (predict(s) === 1) {
        ai *= 1 + s.ret
        tradeDays++
      }
      bh *= 1 + s.ret
      aiCurve.push(ai)
      bhCurve.push(bh)
    }
    return { aiCurve, bhCurve, aiRet: ai - 1, bhRet: bh - 1, tradeDays }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, svm, fx, fy])

  // ── 股價走勢圖比例尺 ──
  const pMin = Math.min(...stock.prices)
  const pMax = Math.max(...stock.prices)
  const px = linearScale([0, N_DAYS - 1], [PPAD, PW - 16])
  const py = linearScale([pMin - 1, pMax + 1], [PH - 26, 30])
  const pricePath = stock.prices
    .map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(p).toFixed(1)}`)
    .join(' ')
  const splitDay = WARMUP + stock.trainCount

  // ── 決策邊界與間隔線 ──
  const boundary = lineBoxIntersect(svm.w[0], svm.w[1], svm.b)
  const marginPos = lineBoxIntersect(svm.w[0], svm.w[1], svm.b - 1)
  const marginNeg = lineBoxIntersect(svm.w[0], svm.w[1], svm.b + 1)
  const line = (pts: [number, number][]) =>
    pts.length === 2
      ? `M${ssx(pts[0][0])},${ssy(pts[0][1])} L${ssx(pts[1][0])},${ssy(pts[1][1])}`
      : ''
  const cellW = (S - 2 * SPAD) / GRID

  // ── 回測曲線比例尺 ──
  const allEq = [...backtest.aiCurve, ...backtest.bhCurve]
  const eMin = Math.min(...allEq)
  const eMax = Math.max(...allEq)
  const ex = linearScale([0, test.length], [EPAD, EW - 16])
  const ey = linearScale([eMin - 0.01, eMax + 0.01], [EH - 26, 16])
  const curvePath = (curve: number[]) =>
    curve.map((v, i) => `${i ? 'L' : 'M'}${ex(i).toFixed(1)},${ey(v).toFixed(1)}`).join(' ')

  // ── 解讀訊息 ──
  const gap = trainAcc - testAcc
  const hasBias = fx === 1 || fy === 1
  const secretUnlocked = hasBias && testAcc >= 0.6

  return (
    <LessonLayout slug="svm-stock">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        你一定聽過「用 AI 預測股票」。這一頁不給你明牌，
        而是帶你<b className="text-ink">完整走一遍真正的流程</b>，親手體驗量化交易員每天在做的事。
        把「明天會漲還是跌？」翻譯成機器聽得懂的話，其實就是前面學過的<b className="text-brand">二元分類</b>：
        每一天是一個資料點，<b className="text-ink">特徵</b>＝今天以前看得到的線索，
        <b className="text-ink">標籤</b>＝隔天<b style={{ color: UP }}>漲</b>或<b style={{ color: DOWN }}>跌</b>
        （台股習慣：紅漲綠跌）。
        全程只有一條鐵則：<b className="text-brand">只能用昨天以前的線索猜明天</b>——偷看未來＝作弊。
      </div>

      {/* ── Step 1：看資料、切時間 ── */}
      <Section
        title="Step 1｜認識這檔神秘股票，把時間切成兩段"
        description="這裡有 140 天的股價。注意我們「照時間」切資料：前段給 AI 看答案學規律（訓練期），後段把答案藏起來當考試（考試期）。時間序列絕對不能隨機切——那等於讓 AI 拿未來的考古題來準備考試。"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {STOCKS.map((s, i) => (
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
          <span className="text-xs text-muted">
            ← 之後隨時可以換一檔，檢驗你找到的規律是不是巧合
          </span>
        </div>

        <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full rounded-xl border border-line bg-cream">
          {/* 三段時間底色 */}
          <rect x={px(0)} y={26} width={px(WARMUP) - px(0)} height={PH - 52} fill="var(--color-muted)" opacity={0.07} />
          <rect x={px(WARMUP)} y={26} width={px(splitDay) - px(WARMUP)} height={PH - 52} fill="var(--color-brand)" opacity={0.08} />
          <rect x={px(splitDay)} y={26} width={px(N_DAYS - 1) - px(splitDay)} height={PH - 52} fill="var(--color-orange)" opacity={0.1} />
          <line x1={px(splitDay)} y1={26} x2={px(splitDay)} y2={PH - 26} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="5 4" />
          {/* 區段標籤 */}
          <text x={(px(0) + px(WARMUP)) / 2} y={18} textAnchor="middle" fontSize={11} fill="var(--color-muted)">🧮 暖身 25 天</text>
          <text x={(px(WARMUP) + px(splitDay)) / 2} y={18} textAnchor="middle" fontSize={11} fill="var(--color-brand)">📘 訓練期 {stock.trainCount} 天（給 AI 看答案）</text>
          <text x={(px(splitDay) + px(N_DAYS - 1)) / 2} y={18} textAnchor="middle" fontSize={11} fill="var(--color-orange)">📝 考試期 {test.length} 天（藏起答案）</text>
          {/* 股價 */}
          <path d={pricePath} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
          <text x={PPAD} y={PH - 8} fontSize={10} fill="var(--color-muted)">第 1 天</text>
          <text x={PW - 16} y={PH - 8} textAnchor="end" fontSize={10} fill="var(--color-muted)">第 {N_DAYS} 天</text>
        </svg>
        <p className="mt-2 text-xs text-muted">
          最前面的灰色 25 天是「暖身」——計算 20 日均線、5 日動量這些指標需要一段歷史資料。
        </p>
      </Section>

      {/* ── Step 2：特徵工程 + 訓練 ── */}
      <Section
        title="Step 2｜當偵探：挑兩條線索，訓練你的 AI 分析師"
        description="這是整個專題的靈魂。AI 不會自己發明線索——要用哪些特徵，是「人」的功課（特徵工程）。從四條線索挑兩條當座標軸，每個點是訓練期的一天，SVM 會畫出一條「多空分界線」。注意：有些線索藏著規律，有些是徹底的雜訊。"
      >
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div>
            <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
              {/* AI 判斷的多空區域 */}
              {Array.from({ length: GRID * GRID }, (_, idx) => {
                const i = idx % GRID
                const j = Math.floor(idx / GRID)
                const gx = (i + 0.5) / GRID
                const gy = (j + 0.5) / GRID
                const up = svm.w[0] * gx + svm.w[1] * gy + svm.b >= 0
                return (
                  <rect
                    key={idx}
                    x={ssx(gx) - cellW / 2}
                    y={ssy(gy) - cellW / 2}
                    width={cellW + 0.5}
                    height={cellW + 0.5}
                    fill={up ? UP : DOWN}
                    opacity={0.09}
                  />
                )
              })}
              {/* 間隔線與分界線 */}
              <path d={line(marginPos)} stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="4 4" fill="none" opacity={0.6} />
              <path d={line(marginNeg)} stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="4 4" fill="none" opacity={0.6} />
              <path d={line(boundary)} stroke="var(--color-ink)" strokeWidth={2.5} fill="none" />
              {/* 訓練期資料點 */}
              {train.map((s, i) => (
                <circle
                  key={i}
                  cx={ssx(s.nf[fx])}
                  cy={ssy(s.nf[fy])}
                  r={5}
                  fill={s.label === 1 ? UP : DOWN}
                  stroke="#fff"
                  strokeWidth={1.3}
                >
                  <title>{`第 ${s.day + 1} 天 → 隔天${s.label === 1 ? '漲' : '跌'} ${fmtPct(s.ret)}`}</title>
                </circle>
              ))}
              <text x={S / 2} y={S - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted)">{FEATURES[fx].axis} →</text>
              <text x={11} y={S / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)" transform={`rotate(-90,11,${S / 2})`}>{FEATURES[fy].axis} →</text>
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: UP }} /> 隔天漲
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DOWN }} /> 隔天跌
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-ink" /> AI 的多空分界線
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* 線索選擇 */}
            {([['橫軸線索', fx, setFx, fy], ['縱軸線索', fy, setFy, fx]] as const).map(
              ([label, val, setter, other]) => (
                <div key={label}>
                  <div className="mb-1.5 text-sm font-medium text-muted">{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {FEATURES.map((f, i) => (
                      <button
                        key={i}
                        disabled={i === other}
                        onClick={() => setter(i)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          i === val
                            ? 'border-brand bg-brand/10 font-medium text-brand'
                            : i === other
                              ? 'cursor-not-allowed border-line text-muted opacity-40'
                              : 'border-line text-muted hover:border-brand-soft'
                        }`}
                      >
                        {f.emoji} {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              ),
            )}

            <div className="rounded-xl bg-cream p-3 text-xs leading-relaxed text-muted">
              <div>{FEATURES[fx].emoji} <b className="text-ink">{FEATURES[fx].name}</b>：{FEATURES[fx].desc}</div>
              <div className="mt-1">{FEATURES[fy].emoji} <b className="text-ink">{FEATURES[fy].name}</b>：{FEATURES[fy].desc}</div>
            </div>

            <Slider
              label="容錯程度 C（左：寬街道容忍分錯 → 右：嚴格全分對）"
              min={1}
              max={20}
              value={C}
              onChange={setC}
              format={(v) => v.toFixed(0)}
            />

            {/* 成績單 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">📘 訓練期正確率</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-ink">{(trainAcc * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-xl border-2 border-orange/50 bg-cream p-3">
                <div className="text-xs text-muted">📝 考試期正確率</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-orange">{(testAcc * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">🪙 丟銅板基準</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-muted">50%</div>
              </div>
            </div>

            {/* 偵探解讀 */}
            {secretUnlocked ? (
              <div className="rounded-xl border border-lime bg-lime/10 p-4 text-sm leading-relaxed text-ink">
                <b>🔓 秘密揭曉！</b> 你選中了 🧲乖離，AI 從資料裡挖出這檔股票的規律——
                <b>物極必反</b>：股價衝得離平常水準太遠，隔天容易拉回；跌過頭則容易反彈。
                這種現象叫<b className="text-brand">均值回歸</b>，真實市場上也存在（只是弱得多、雜得多）。
                現在換一檔股票，看這個規律是不是依然成立。
              </div>
            ) : testAcc < 0.54 ? (
              <div className="rounded-xl border border-line bg-cream p-4 text-sm leading-relaxed text-muted">
                🤔 考試成績跟<b className="text-ink">丟銅板差不多</b>——這兩條線索裡大概沒藏規律，
                模型再怎麼調也救不了（垃圾進、垃圾出）。
                <b className="text-ink">偵探筆記：這檔股票好像「漲太多就會拉回」……哪條線索能量出「漲過頭」？</b>
              </div>
            ) : gap >= 0.12 ? (
              <div className="rounded-xl border border-red/40 bg-red/5 p-4 text-sm leading-relaxed text-muted">
                ⚠️ 訓練期比考試期高出一大截——AI 在<b className="text-ink">死背訓練資料</b>了。
                試著把 C 調小，讓街道寬一點、容忍一些分錯，反而考得更好。
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-cream p-4 text-sm leading-relaxed text-muted">
                👀 比丟銅板準了，有點眉目！再試試別的線索組合或調整 C——
                提示：想想哪條線索最能量出「漲過頭／跌過頭」。
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Step 3：模擬操盤 ── */}
      <Section
        title="Step 3｜模擬操盤：讓 AI 的預測接受金錢的考驗"
        description="正確率只是紙上談兵，來真的：在考試期的每一天，AI 說「漲」就持有一天、說「跌」就空手觀望。跟最無腦的對照組「買著不動」比一比——你上面每換一次線索、每動一次 C，這條資產曲線都會改寫。"
      >
        <svg viewBox={`0 0 ${EW} ${EH}`} className="w-full rounded-xl border border-line bg-cream">
          <line x1={EPAD} y1={ey(1)} x2={EW - 16} y2={ey(1)} stroke="var(--color-line)" strokeDasharray="4 4" />
          <text x={EPAD - 4} y={ey(1) + 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">本金</text>
          <path d={curvePath(backtest.bhCurve)} fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeDasharray="6 4" />
          <path d={curvePath(backtest.aiCurve)} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />
          <text x={EPAD} y={EH - 8} fontSize={10} fill="var(--color-muted)">考試第 1 天</text>
          <text x={EW - 16} y={EH - 8} textAnchor="end" fontSize={10} fill="var(--color-muted)">第 {test.length} 天</text>
        </svg>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-brand" /> 🤖 AI 策略</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-muted" /> 🧘 買著不動</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-cream p-4">
            <div className="text-xs text-muted">🤖 AI 策略最終報酬</div>
            <div className="mt-0.5 font-mono text-2xl font-semibold" style={{ color: backtest.aiRet >= 0 ? UP : DOWN }}>
              {fmtPct(backtest.aiRet)}
            </div>
          </div>
          <div className="rounded-xl bg-cream p-4">
            <div className="text-xs text-muted">🧘 買著不動報酬</div>
            <div className="mt-0.5 font-mono text-2xl font-semibold" style={{ color: backtest.bhRet >= 0 ? UP : DOWN }}>
              {fmtPct(backtest.bhRet)}
            </div>
          </div>
          <div className="rounded-xl bg-cream p-4">
            <div className="text-xs text-muted">AI 進場天數</div>
            <div className="mt-0.5 font-mono text-2xl font-semibold text-ink">
              {backtest.tradeDays} <span className="text-sm text-muted">/ {test.length} 天</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
          {backtest.aiRet > backtest.bhRet && backtest.aiRet > 0 ? (
            <p>🏆 <b className="text-ink">你的 AI 分析師打敗了「買著不動」！</b>{' '}
              它靠著避開下跌日、只在看好的日子進場賺到超額報酬。回去換一檔股票，確認這不是運氣。</p>
          ) : backtest.aiRet > 0 ? (
            <p>💰 有賺，但還沒贏過傻抱。<b className="text-ink">擇時要贏過趨勢，比想像中難</b>——
              預測錯的那幾天可能剛好是大漲日。試試更好的線索組合。</p>
          ) : (
            <p>😅 賠錢了。<b className="text-ink">當模型考試成績不夠好，操盤只會把錯誤變成虧損</b>——
              先回 Step 2 把考試正確率救起來，再來談賺錢。</p>
          )}
        </div>
      </Section>

      {/* ── 誠實時間 ── */}
      <div className="mt-10 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">🧯 誠實時間：真實市場比這殘酷得多。</b>
        <ul className="mt-2 space-y-1.5">
          <li>· 這檔股票是為教學特製的，秘密夠強、夠乾淨。真實市場雜訊大得多——<b className="text-ink">長期做到 55~60% 已是頂尖法人水準</b>。</li>
          <li>· 我們沒算<b className="text-ink">手續費和滑價</b>，頻繁進出的薄利很容易被吃光。</li>
          <li>· 好用的規律一旦被夠多人發現，大家搶著用，<b className="text-ink">規律本身就會消失</b>。</li>
          <li>· 在幾十條線索、幾百組參數裡挑出回測最漂亮的那組，往往只是<b className="text-ink">對過去過擬合</b>——這正是「考試期」存在的意義。</li>
        </ul>
        <p className="mt-3">
          但你真正帶走的，是一條可以複用在任何領域的完整流程：
          <b className="text-brand">定義問題 → 打造特徵 → 照時間切資料 → 訓練 → 上考場 → 用結果驗證</b>。
          把「股票漲跌」換成「客戶會不會流失」「機台會不會故障」，做法一模一樣。
        </p>
      </div>
    </LessonLayout>
  )
}
