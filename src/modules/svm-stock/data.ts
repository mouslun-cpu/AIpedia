// 專題用的合成股票資料。
//
// 這檔股票藏著一個「秘密」：物極必反（均值回歸）——
// 股價偏離 20 日均線太多時，隔天傾向往回走。
// 因此 🧲乖離（以及與它相關的 🏃動量）是有用的線索，
// 🌊波動 與 📢量能 則是刻意設計的純雜訊——選到它們，AI 就只能瞎猜。
//
// 參數經過調校：最佳線索組合的測試正確率約 62~70%、
// 雜訊組合約 50%（＝丟銅板），落在教學甜蜜點。

export const N_DAYS = 140 // 總交易日數
export const WARMUP = 25 // 計算指標需要的暖身天數（MA20 + 動量5）
const REV = 0.42 // 均值回歸強度（秘密的強度）
const NOISE = 0.011 // 每日隨機雜訊
const DRIFT = 0.0004 // 微小的長期漂移

export const FEATURES = [
  { name: '動量', emoji: '🏃', axis: '🏃 動量（最近 5 天的漲跌）', desc: '最近 5 天漲了多少——它正在衝還是在跌？' },
  { name: '乖離', emoji: '🧲', axis: '🧲 乖離（偏離 20 日均線多遠）', desc: '價格偏離「平常水準」（20 日均線）多遠——是不是衝過頭了？' },
  { name: '波動', emoji: '🌊', axis: '🌊 波動（最近震盪多劇烈）', desc: '最近 5 天上沖下洗的劇烈程度。' },
  { name: '量能', emoji: '📢', axis: '📢 量能（昨天交易多熱絡）', desc: '昨天的成交量比平常熱絡多少。' },
] as const

export interface StockSample {
  /** 對應 prices 的第幾天 */
  day: number
  /** 原始特徵值：[動量5, 乖離20, 波動5, 量能] */
  f: [number, number, number, number]
  /** 以訓練期 min/max 正規化到 [0,1] 的特徵值 */
  nf: [number, number, number, number]
  /** 隔天的實際報酬率（回測用） */
  ret: number
  /** 隔天漲(+1)或跌(−1) */
  label: 1 | -1
}

export interface StockData {
  code: string
  name: string
  prices: number[]
  samples: StockSample[]
  trainCount: number
}

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}

export function buildStock(seed: number, code: string, name: string, trainCount = 70): StockData {
  const rnd = seeded(seed)
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 2

  // 產生價格序列：帶均值回歸的隨機漫步
  const prices: number[] = [100]
  for (let t = 0; t < N_DAYS - 1; t++) {
    const start = Math.max(0, t - 19)
    const ma = prices.slice(start, t + 1).reduce((a, b) => a + b, 0) / (t + 1 - start)
    const bias = (prices[t] - ma) / ma
    prices.push(prices[t] * (1 + DRIFT - REV * bias + NOISE * gauss()))
  }
  // 成交量：與漲跌完全無關的雜訊
  const volumes = Array.from({ length: N_DAYS }, () => Math.exp(0.4 * gauss()))

  // 逐日計算特徵與標籤
  const raw: Omit<StockSample, 'nf'>[] = []
  for (let t = WARMUP; t <= N_DAYS - 2; t++) {
    const ma = prices.slice(t - 19, t + 1).reduce((a, b) => a + b, 0) / 20
    const rets: number[] = []
    for (let i = t - 4; i <= t; i++) rets.push(prices[i] / prices[i - 1] - 1)
    const mean = rets.reduce((a, b) => a + b, 0) / 5
    const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / 5)
    raw.push({
      day: t,
      f: [(prices[t] - prices[t - 5]) / prices[t - 5], (prices[t] - ma) / ma, sd, volumes[t]],
      ret: prices[t + 1] / prices[t] - 1,
      label: prices[t + 1] > prices[t] ? 1 : -1,
    })
  }

  // 正規化：只用「訓練期」的 min/max（不能偷看考試期的分布）
  const lo = [Infinity, Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity, -Infinity]
  for (const s of raw.slice(0, trainCount))
    for (let i = 0; i < 4; i++) {
      lo[i] = Math.min(lo[i], s.f[i])
      hi[i] = Math.max(hi[i], s.f[i])
    }
  const samples: StockSample[] = raw.map((s) => ({
    ...s,
    nf: s.f.map((v, i) =>
      Math.min(1, Math.max(0, (v - lo[i]) / (hi[i] - lo[i] || 1))),
    ) as StockSample['nf'],
  }))

  return { code, name, prices, samples, trainCount }
}

// 兩檔可切換的「神秘股票」（不同亂數種子＝不同走勢，但藏著同一種秘密）
export const STOCKS: StockData[] = [
  buildStock(2026, '8787', '珍奶控股'),
  buildStock(77, '5566', '雞排帝國'),
]
