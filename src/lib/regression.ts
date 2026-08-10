// 線性回歸的共用數學：最小平方解、預測、誤差。
// 1-1 線性回歸、1-2 損失函數、1-3 梯度下降 三個知識點共用同一組資料與工具。

export interface Line {
  w: number // 斜率
  b: number // 截距
}

/** 用最小平方法求最佳直線 y = w·x + b */
export function leastSquares(xs: number[], ys: number[]): Line {
  const n = xs.length
  const mx = xs.reduce((a, v) => a + v, 0) / n
  const my = ys.reduce((a, v) => a + v, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  const w = den === 0 ? 0 : num / den
  return { w, b: my - w * mx }
}

/** 誤差平方和（sum of squared errors）*/
export function sse(xs: number[], ys: number[], line: Line): number {
  let s = 0
  for (let i = 0; i < xs.length; i++) {
    const e = line.w * xs[i] + line.b - ys[i]
    s += e * e
  }
  return s
}

/** 均方誤差 */
export function mse(xs: number[], ys: number[], line: Line): number {
  return sse(xs, ys, line) / xs.length
}

/** SSE 對 (w, b) 的梯度，供梯度下降使用 */
export function gradient(
  xs: number[],
  ys: number[],
  line: Line,
): { dw: number; db: number } {
  let dw = 0
  let db = 0
  for (let i = 0; i < xs.length; i++) {
    const e = line.w * xs[i] + line.b - ys[i]
    dw += 2 * e * xs[i]
    db += 2 * e
  }
  const n = xs.length
  return { dw: dw / n, db: db / n }
}

// 回歸主線共用的一組資料（x, y 都在 0~10 的直覺範圍，帶點雜訊、明顯正相關）
export const REG_XS = [0.6, 1.5, 2.2, 3.1, 3.8, 4.6, 5.4, 6.3, 7.1, 8.0, 8.8, 9.4]
export const REG_YS = [1.4, 2.1, 2.0, 3.4, 3.0, 4.3, 4.1, 5.6, 5.2, 6.7, 6.3, 7.4]
