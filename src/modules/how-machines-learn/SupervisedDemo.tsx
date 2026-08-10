import { useState } from 'react'
import { Button } from '../../components/ui/Button'

// 歷屆學長姐的「讀書時數 × 出席率」與最後「及格 / 不及格」紀錄。
// 座標範圍 0~100：x 軸是讀書時數(0~10hr *10)，y 軸是出席率(%)。
const FAIL = [
  [20, 30],
  [28, 22],
  [18, 45],
  [32, 38],
  [25, 55],
  [38, 28],
]
const PASS = [
  [70, 72],
  [78, 60],
  [65, 82],
  [82, 75],
  [72, 58],
  [60, 68],
]

function centroid(pts: number[][]) {
  const n = pts.length
  const sx = pts.reduce((a, p) => a + p[0], 0) / n
  const sy = pts.reduce((a, p) => a + p[1], 0) / n
  return [sx, sy]
}

const cF = centroid(FAIL)
const cP = centroid(PASS)
// 分界線 = 兩類中心連線的垂直平分線
const mid = [(cF[0] + cP[0]) / 2, (cF[1] + cP[1]) / 2]
const dir = [cP[0] - cF[0], cP[1] - cF[1]] // 指向及格類的法向量

/** 判斷某點在分界線的哪一側：>0 偏及格，<0 偏不及格 */
function classify(x: number, y: number) {
  return (x - mid[0]) * dir[0] + (y - mid[1]) * dir[1]
}

// 把資料座標(0~100) 轉成 SVG 座標(y 軸翻轉，留邊界)
const S = 300
const PAD = 24
const px = (v: number) => PAD + (v / 100) * (S - 2 * PAD)
const py = (v: number) => S - PAD - (v / 100) * (S - 2 * PAD)

type Stage = 'data' | 'trained' | 'quiz'

export function SupervisedDemo() {
  const [stage, setStage] = useState<Stage>('data')
  const [testPoint, setTestPoint] = useState<{
    x: number
    y: number
    willPass: boolean
  } | null>(null)

  function train() {
    setStage('trained')
    setTestPoint(null)
  }

  function quiz() {
    // 隨機丟一個新學弟妹，用學到的分界線判斷
    const x = 20 + Math.random() * 60
    const y = 20 + Math.random() * 60
    setTestPoint({ x, y, willPass: classify(x, y) > 0 })
    setStage('quiz')
  }

  function reset() {
    setStage('data')
    setTestPoint(null)
  }

  // 畫分界線：通過 mid、方向垂直於 dir
  const perp = [-dir[1], dir[0]]
  const len = Math.hypot(perp[0], perp[1])
  const ux = perp[0] / len
  const uy = perp[1] / len
  const lineA = [mid[0] - ux * 80, mid[1] - uy * 80]
  const lineB = [mid[0] + ux * 80, mid[1] + uy * 80]

  return (
    <div className="grid gap-5 md:grid-cols-[300px_1fr]">
      <svg
        viewBox={`0 0 ${S} ${S}`}
        className="w-full rounded-xl border border-line bg-cream"
      >
        {/* 座標軸標籤 */}
        <text x={S / 2} y={S - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted)">讀書時數 →</text>
        <text x={12} y={S / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)" transform={`rotate(-90, 12, ${S / 2})`}>出席率 →</text>

        {/* 分界線 */}
        {stage !== 'data' && (
          <line
            x1={px(lineA[0])}
            y1={py(lineA[1])}
            x2={px(lineB[0])}
            y2={py(lineB[1])}
            stroke="var(--color-brand)"
            strokeWidth={2.5}
            strokeDasharray="6 5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from={200}
              to={0}
              dur="0.6s"
              fill="freeze"
            />
          </line>
        )}

        {/* 學長姐的歷史紀錄 */}
        {FAIL.map(([x, y], i) => (
          <circle
            key={`f${i}`}
            cx={px(x)}
            cy={py(y)}
            r={7}
            fill="var(--color-red)"
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}
        {PASS.map(([x, y], i) => (
          <circle
            key={`p${i}`}
            cx={px(x)}
            cy={py(y)}
            r={7}
            fill="var(--color-brand)"
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}

        {/* 新學弟妹 */}
        {testPoint && (
          <g>
            <circle
              cx={px(testPoint.x)}
              cy={py(testPoint.y)}
              r={9}
              fill={testPoint.willPass ? 'var(--color-brand)' : 'var(--color-red)'}
              stroke="#fff"
              strokeWidth={2}
            >
              <animate
                attributeName="r"
                from={16}
                to={9}
                dur="0.4s"
                fill="freeze"
              />
            </circle>
            <text
              x={px(testPoint.x)}
              y={py(testPoint.y) - 16}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill="var(--color-ink)"
            >
              新同學
            </text>
          </g>
        )}
      </svg>

      <div className="flex flex-col justify-center gap-4">
        <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
          {stage === 'data' && (
            <p>
              <b className="text-ink">監督式學習</b>{' '}
              就是給機器一堆「已經知道結果」的例子。
              下方每個點都是一位學長姐的讀書時數和出席率，而且事先就知道他最後
              <span className="font-medium text-red">不及格</span>還是
              <span className="font-medium text-brand">及格</span>。
              機器的任務是從這些歷史紀錄裡找出規律。
            </p>
          )}
          {stage === 'trained' && (
            <p>
              機器看完這些歷屆紀錄後，
              學到了一條<b className="text-ink">及格分界線</b>——
              線的一側大多不及格、另一側大多及格。
              現在丟一位新同學的資料給它測試看看！
            </p>
          )}
          {stage === 'quiz' && testPoint && (
            <p>
              這位新同學的讀書時數和出席率落在分界線的
              <b className="text-ink">
                {testPoint.willPass ? '及格那一側' : '不及格那一側'}
              </b>
              ，所以機器預測他「
              <span
                className="font-semibold"
                style={{
                  color: testPoint.willPass
                    ? 'var(--color-brand)'
                    : 'var(--color-red)',
                }}
              >
                {testPoint.willPass ? '會及格' : '恐怕會不及格'}
              </span>
              」。這就是機器用學到的規律去<b className="text-ink">預測新資料</b>。
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {stage === 'data' && <Button onClick={train}>① 開始訓練</Button>}
          {stage !== 'data' && (
            <Button onClick={quiz}>
              {stage === 'trained' ? '② 測一位新同學' : '再測一位'}
            </Button>
          )}
          {stage !== 'data' && (
            <Button variant="ghost" onClick={reset}>
              重置
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
