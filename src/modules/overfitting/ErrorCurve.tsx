import { linearScale } from '../../lib/plot'

interface ErrorCurveProps {
  trainErrs: number[] // index 0 → degree 1
  validErrs: number[]
  degree: number
}

/** 小圖：訓練誤差 vs 驗證誤差 隨模型複雜度的變化（經典 U 型曲線）。 */
export function ErrorCurve({ trainErrs, validErrs, degree }: ErrorCurveProps) {
  const W = 340
  const H = 180
  const PAD = 34
  const maxErr = Math.max(...trainErrs, ...validErrs, 0.02) * 1.1
  const degrees = trainErrs.map((_, i) => i + 1)

  const sx = linearScale([1, degrees.length], [PAD, W - PAD])
  const sy = linearScale([0, maxErr], [H - PAD, 12])

  const path = (errs: number[]) =>
    errs.map((e, i) => `${i ? 'L' : 'M'}${sx(i + 1)},${sy(e)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* 軸 */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-line)" />
      <line x1={PAD} y1={12} x2={PAD} y2={H - PAD} stroke="var(--color-line)" />
      <text x={W - PAD} y={H - PAD + 18} textAnchor="end" fontSize={11} fill="var(--color-muted)">
        模型複雜度（次數）→
      </text>
      <text x={PAD - 6} y={16} textAnchor="end" fontSize={11} fill="var(--color-muted)">
        誤差
      </text>

      {/* 目前次數的參考線 */}
      <line
        x1={sx(degree)}
        y1={12}
        x2={sx(degree)}
        y2={H - PAD}
        stroke="var(--color-brand-pale)"
        strokeWidth={2}
      />

      {/* 驗證誤差 */}
      <path d={path(validErrs)} fill="none" stroke="var(--color-orange)" strokeWidth={2.5} />
      {/* 訓練誤差 */}
      <path d={path(trainErrs)} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />

      {/* 目前次數的點 */}
      <circle cx={sx(degree)} cy={sy(trainErrs[degree - 1])} r={4} fill="var(--color-brand)" />
      <circle cx={sx(degree)} cy={sy(validErrs[degree - 1])} r={4} fill="var(--color-orange)" />

      {/* 圖例 */}
      <g fontSize={11}>
        <circle cx={PAD + 8} cy={H - 8} r={4} fill="var(--color-brand)" />
        <text x={PAD + 16} y={H - 4} fill="var(--color-muted)">訓練誤差</text>
        <circle cx={PAD + 92} cy={H - 8} r={4} fill="var(--color-orange)" />
        <text x={PAD + 100} y={H - 4} fill="var(--color-muted)">驗證誤差</text>
      </g>
    </svg>
  )
}
