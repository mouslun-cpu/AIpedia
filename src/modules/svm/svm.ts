// 線性 SVM（軟間隔），用原始問題的次梯度下降求解。
// 座標假設已正規化到 [0,1]。
//
// 目標函數： J(w,b) = ½‖w‖² + C · Σ max(0, 1 − yᵢ(w·xᵢ + b))
//   C 大 → 硬間隔（不容許分錯，間隔窄）
//   C 小 → 軟間隔（容許少數分錯，間隔寬）

export interface Point {
  x: number
  y: number
  label: 1 | -1
}

export interface SVMResult {
  w: [number, number]
  b: number
  /** 間隔寬度 = 2/‖w‖（正規化座標下）*/
  margin: number
  /** 每個點是否為支持向量（落在間隔上或違反間隔）*/
  isSupport: boolean[]
}

export function trainSVM(points: Point[], C: number): SVMResult {
  let w0 = 0
  let w1 = 0
  let b = 0
  const iterations = 3000
  const lr = 0.0015

  for (let it = 0; it < iterations; it++) {
    // 正則項梯度
    let gw0 = w0
    let gw1 = w1
    let gb = 0
    for (const p of points) {
      const margin = p.label * (w0 * p.x + w1 * p.y + b)
      if (margin < 1) {
        // hinge 有效 → 加入 −C·yᵢ·xᵢ
        gw0 -= C * p.label * p.x
        gw1 -= C * p.label * p.y
        gb -= C * p.label
      }
    }
    w0 -= lr * gw0
    w1 -= lr * gw1
    b -= lr * gb
  }

  const norm = Math.hypot(w0, w1) || 1e-6
  const isSupport = points.map(
    (p) => p.label * (w0 * p.x + w1 * p.y + b) <= 1.05,
  )

  return {
    w: [w0, w1],
    b,
    margin: 2 / norm,
    isSupport,
  }
}

/**
 * 求直線 w0·x + w1·y + g = 0 與單位方框 [0,1]² 的兩個交點。
 * 用來把決策邊界 / 間隔線畫滿整個繪圖區。
 */
export function lineBoxIntersect(
  w0: number,
  w1: number,
  g: number,
): [number, number][] {
  const pts: [number, number][] = []
  const push = (x: number, y: number) => {
    if (x >= -1e-6 && x <= 1 + 1e-6 && y >= -1e-6 && y <= 1 + 1e-6) {
      pts.push([Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))])
    }
  }
  // 與 x=0, x=1
  if (Math.abs(w1) > 1e-9) {
    push(0, -(w0 * 0 + g) / w1)
    push(1, -(w0 * 1 + g) / w1)
  }
  // 與 y=0, y=1
  if (Math.abs(w0) > 1e-9) {
    push(-(w1 * 0 + g) / w0, 0)
    push(-(w1 * 1 + g) / w0, 1)
  }
  // 去重，取前兩個相異點
  const uniq: [number, number][] = []
  for (const p of pts) {
    if (!uniq.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-4)) {
      uniq.push(p)
    }
  }
  return uniq.slice(0, 2)
}
