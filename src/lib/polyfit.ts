/**
 * 多項式最小平方擬合（least squares）。
 * 用正規方程 (AᵀA)c = Aᵀy + 高斯消去法求解。
 * x 會先正規化到 [-1, 1] 以改善數值條件。
 */

/** 解線性方程組 M c = b（高斯消去 + 部分樞紐）。回傳解向量。 */
function solve(M: number[][], b: number[]): number[] {
  const n = b.length
  // 建立增廣矩陣
  const A = M.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    // 部分樞紐：找該欄絕對值最大的列
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r
    }
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    const pv = A[col][col]
    if (Math.abs(pv) < 1e-12) continue // 近似奇異，跳過
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = A[r][col] / pv
      for (let k = col; k <= n; k++) A[r][k] -= factor * A[col][k]
    }
  }
  return A.map((row, i) => row[n] / (row[i] || 1))
}

export interface PolyModel {
  /** 係數（對應正規化後的 x），coeffs[0] + coeffs[1]·x + ... */
  coeffs: number[]
  /** 用正規化的 x 求值 */
  predictNorm: (xNorm: number) => number
  /** 用原始 x（0~1）求值 */
  predict: (x: number) => number
}

/**
 * 對 (xs, ys) 擬合指定次數的多項式。xs 假設落在 [0,1]。
 * ridge 為 L2 正則化強度（預設 0 = 不正則化）；越大係數被壓得越小、曲線越平滑。
 */
export function polyfit(
  xs: number[],
  ys: number[],
  degree: number,
  ridge = 0,
): PolyModel {
  // 正規化 x: [0,1] → [-1,1]
  const norm = (x: number) => x * 2 - 1
  const xn = xs.map(norm)
  const m = degree + 1

  // 建立正規方程：AᵀA 與 Aᵀy
  // powers[i][k] = xn[i]^k
  const ATA: number[][] = Array.from({ length: m }, () =>
    new Array(m).fill(0),
  )
  const ATy: number[] = new Array(m).fill(0)
  for (let i = 0; i < xn.length; i++) {
    const pw: number[] = new Array(2 * degree + 1)
    pw[0] = 1
    for (let k = 1; k <= 2 * degree; k++) pw[k] = pw[k - 1] * xn[i]
    for (let a = 0; a < m; a++) {
      for (let b = 0; b < m; b++) ATA[a][b] += pw[a + b]
      ATy[a] += pw[a] * ys[i]
    }
  }

  // L2 正則化：在 AᵀA 對角線加上 ridge（截距項 index 0 不罰）
  if (ridge > 0) {
    for (let a = 1; a < m; a++) ATA[a][a] += ridge
  }

  const coeffs = solve(ATA, ATy)
  const predictNorm = (xNorm: number) => {
    let acc = 0
    let p = 1
    for (let k = 0; k < m; k++) {
      acc += coeffs[k] * p
      p *= xNorm
    }
    return acc
  }
  return {
    coeffs,
    predictNorm,
    predict: (x: number) => predictNorm(norm(x)),
  }
}

/** 均方誤差 */
export function mse(
  model: PolyModel,
  xs: number[],
  ys: number[],
): number {
  let s = 0
  for (let i = 0; i < xs.length; i++) {
    const e = model.predict(xs[i]) - ys[i]
    s += e * e
  }
  return s / xs.length
}
