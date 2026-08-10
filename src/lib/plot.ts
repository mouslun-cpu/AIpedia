/**
 * 座標轉換小工具：把「資料座標」映射到 SVG 的「像素座標」。
 * 三個知識點的散點圖都會用到，避免每個地方重寫一次縮放邏輯。
 */

export interface Scale {
  /** 資料值 → 像素 */
  (v: number): number
  /** 像素 → 資料值（反向，用於拖曳） */
  invert: (px: number) => number
}

export function linearScale(
  domain: [number, number],
  range: [number, number],
): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const m = (r1 - r0) / (d1 - d0)
  const fn = ((v: number) => r0 + (v - d0) * m) as Scale
  fn.invert = (px: number) => d0 + (px - r0) / m
  return fn
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** 在兩個 RGB 顏色之間線性插值，t=0 回傳 a、t=1 回傳 b。回傳 rgb() 字串。 */
export function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  const c = a.map((av, i) => Math.round(av + (b[i] - av) * clamp(t, 0, 1)))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

/** 幾個主題色的 RGB 值，方便做漸層／機率場著色。 */
export const RGB = {
  brand: [40, 115, 138] as [number, number, number],
  red: [231, 90, 72] as [number, number, number],
  orange: [255, 136, 56] as [number, number, number],
  paper: [255, 255, 255] as [number, number, number],
}

/** 從滑鼠/觸控事件取得相對於 SVG 的座標（處理縮放與位移）。 */
export function pointerToSvg(
  evt: { clientX: number; clientY: number },
  svg: SVGSVGElement,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect()
  const vb = svg.viewBox.baseVal
  const scaleX = vb.width ? vb.width / rect.width : 1
  const scaleY = vb.height ? vb.height / rect.height : 1
  return {
    x: (evt.clientX - rect.left) * scaleX + vb.x,
    y: (evt.clientY - rect.top) * scaleY + vb.y,
  }
}
