// 產生一組固定的資料：來自一條平滑的真實曲線 + 雜訊。
// 訓練點與驗證點分開，用來示範模型在「沒看過的資料」上表現如何。

// 真實規律（機器看不到，我們用來產生資料）
export function trueCurve(x: number): number {
  return 0.5 + 0.28 * Math.sin(x * 6.6 + 0.5)
}

function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function makeSet(
  seed: number,
  count: number,
  noise: number,
  xShift = 0,
) {
  const rand = seededRand(seed)
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < count; i++) {
    const x = (i + 0.5 + xShift + (rand() - 0.5) * 0.3) / count
    const y = trueCurve(x) + (rand() - 0.5) * 2 * noise
    xs.push(Math.max(0.02, Math.min(0.98, x)))
    ys.push(y)
  }
  return { xs, ys }
}

// 訓練資料（機器拿來學）：點少、雜訊較大 → 高次曲線容易「硬背雜訊」。
export const TRAIN = makeSet(7, 9, 0.16)
// 驗證資料（檢驗有沒有真的學會）：x 位置刻意錯開訓練點，落在曲線最會亂擺的區間。
export const VALID = makeSet(21, 9, 0.09, 0.5)
