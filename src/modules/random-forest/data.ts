// RF 選股專題的合成股票資料。
// 與 SVM 專題同一個宇宙（同兩檔股票、同一個「物極必反」的秘密），
// 但這次提供 6 個指標——其中有真訊號、也有故意混入的雜訊指標，
// 讓「挑指標」成為策略成敗的關鍵。
//
// 訊號設計（已用調參腳本驗證）：
//   🧲乖離 強訊號、🏃動量 中等、📉昨日漲跌 弱訊號
//   🌊波動、📢量能、🗓️星期幾 = 純雜訊
// 單棵深樹 train 94% / test 57%（死背）；40 棵森林 test ~64%，
// 信心門檻 65% 時勝率可達 ~89%。

export const N_DAYS = 140
export const WARMUP = 25
const REV = 0.42
const NOISE = 0.011
const DRIFT = 0.0004

export const INDICATORS = [
  { name: '動量', emoji: '🏃', desc: '最近 5 天漲了多少——正在衝還是在跌？' },
  { name: '乖離', emoji: '🧲', desc: '價格偏離 20 日均線多遠——是不是漲/跌過頭了？' },
  { name: '波動', emoji: '🌊', desc: '最近 5 天上沖下洗的劇烈程度。' },
  { name: '量能', emoji: '📢', desc: '昨天的成交量比平常熱絡多少。' },
  { name: '星期', emoji: '🗓️', desc: '今天星期幾——有人深信「星期五必漲」這種月曆玄學。' },
  { name: '昨漲', emoji: '📉', desc: '昨天收盤是漲是跌、幅度多少。' },
] as const
export const N_IND = INDICATORS.length

export interface RFSample {
  day: number
  /** 正規化到 [0,1] 的 6 個指標值 */
  nf: number[]
  /** 隔天實際報酬率（回測用） */
  ret: number
  /** 隔天漲(+1)跌(−1) */
  label: 1 | -1
}

export interface RFStock {
  code: string
  name: string
  prices: number[]
  samples: RFSample[]
  trainCount: number
}

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}

export function buildStock(seed: number, code: string, name: string, trainCount = 70): RFStock {
  const rnd = seeded(seed)
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 2

  const prices: number[] = [100]
  for (let t = 0; t < N_DAYS - 1; t++) {
    const start = Math.max(0, t - 19)
    const ma = prices.slice(start, t + 1).reduce((a, b) => a + b, 0) / (t + 1 - start)
    prices.push(prices[t] * (1 + DRIFT - REV * ((prices[t] - ma) / ma) + NOISE * gauss()))
  }
  const volumes = Array.from({ length: N_DAYS }, () => Math.exp(0.4 * gauss()))

  const raw: { day: number; f: number[]; ret: number; label: 1 | -1 }[] = []
  for (let t = WARMUP; t <= N_DAYS - 2; t++) {
    const ma = prices.slice(t - 19, t + 1).reduce((a, b) => a + b, 0) / 20
    const rets: number[] = []
    for (let i = t - 4; i <= t; i++) rets.push(prices[i] / prices[i - 1] - 1)
    const mean = rets.reduce((a, b) => a + b, 0) / 5
    const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / 5)
    raw.push({
      day: t,
      f: [
        (prices[t] - prices[t - 5]) / prices[t - 5], // 動量5
        (prices[t] - ma) / ma, // 乖離20
        sd, // 波動5
        volumes[t], // 量能
        (t % 5) / 4, // 星期幾（純雜訊）
        prices[t] / prices[t - 1] - 1, // 昨日漲跌
      ],
      ret: prices[t + 1] / prices[t] - 1,
      label: prices[t + 1] > prices[t] ? 1 : -1,
    })
  }

  // 正規化：只用訓練期的 min/max（不能偷看考試期）
  const lo = Array(N_IND).fill(Infinity)
  const hi = Array(N_IND).fill(-Infinity)
  for (const s of raw.slice(0, trainCount))
    for (let i = 0; i < N_IND; i++) {
      lo[i] = Math.min(lo[i], s.f[i])
      hi[i] = Math.max(hi[i], s.f[i])
    }
  const samples: RFSample[] = raw.map((s) => ({
    day: s.day,
    nf: s.f.map((v, i) => Math.min(1, Math.max(0, (v - lo[i]) / (hi[i] - lo[i] || 1)))),
    ret: s.ret,
    label: s.label,
  }))

  return { code, name, prices, samples, trainCount }
}

export const RF_STOCKS: RFStock[] = [
  buildStock(2026, '8787', '珍奶控股'),
  buildStock(77, '5566', '雞排帝國'),
]
