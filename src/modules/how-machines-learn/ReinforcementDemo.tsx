import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'

// 5x5 廚房地圖——最經典的貓抓老鼠橋段。
// 傑利鼠要從鼠洞溜到起司那邊，同時要避開會巡邏的湯姆貓。
const N = 5
const START = { r: 0, c: 0 }
const GOAL = { r: 4, c: 4 }
const TRAPS = [
  { r: 2, c: 1 },
  { r: 1, c: 3 },
  { r: 3, c: 3 },
]

const idx = (r: number, c: number) => r * N + c
const isTrap = (r: number, c: number) =>
  TRAPS.some((t) => t.r === r && t.c === c)
const isGoal = (r: number, c: number) => r === GOAL.r && c === GOAL.c

// 動作：0上 1下 2左 3右
const MOVES = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
]
const ARROWS = ['↑', '↓', '←', '→']

const ALPHA = 0.4
const GAMMA = 0.9
const EPS = 0.2
const MAX_TRAIN_STEPS = 40
const MAX_WALK_STEPS = 30
// 樂觀初始化：把還沒走過的路都先當成「感覺不錯」，逼機器多方嘗試，
// 避免它太早卡在一個「兩格互繞」的壞習慣裡。
const OPTIMISTIC_INIT = 0.3

type Outcome = 'goal' | 'trap' | 'timeout'

function emptyQ(): number[][] {
  return Array.from({ length: N * N }, () => Array(4).fill(OPTIMISTIC_INIT))
}

function step(r: number, c: number, a: number) {
  const nr = Math.max(0, Math.min(N - 1, r + MOVES[a].dr))
  const nc = Math.max(0, Math.min(N - 1, c + MOVES[a].dc))
  return { nr, nc }
}

/** ε-greedy 選一個動作、算出獎勵，並就地更新 Q 表格。訓練的快轉/動畫兩種模式共用同一份邏輯，避免兩邊算法兜不起來。 */
function qLearningStep(Q: number[][], r: number, c: number) {
  const s = idx(r, c)
  const a = Math.random() < EPS ? Math.floor(Math.random() * 4) : Q[s].indexOf(Math.max(...Q[s]))
  const { nr, nc } = step(r, c, a)
  let reward = -0.2
  let terminal = false
  if (isGoal(nr, nc)) { reward = 10; terminal = true }
  else if (isTrap(nr, nc)) { reward = -10; terminal = true }
  const ns = idx(nr, nc)
  const target = terminal ? reward : reward + GAMMA * Math.max(...Q[ns])
  Q[s][a] += ALPHA * (target - Q[s][a])
  return { nr, nc, reward, terminal }
}

const CELL = 62
const SIZE = N * CELL
const HISTORY_LIMIT = 20

const OUTCOME_ICON: Record<Outcome, string> = { goal: '🧀', trap: '🐱', timeout: '💫' }

export function ReinforcementDemo() {
  const qRef = useRef<number[][]>(emptyQ())
  const [, force] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [history, setHistory] = useState<Outcome[]>([])
  const [agent, setAgent] = useState<{ r: number; c: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<Outcome | null>(null)
  const [floatText, setFloatText] = useState<{ text: string; key: number } | null>(null)
  const [evalResult, setEvalResult] = useState<'goal' | 'trap' | 'stuck' | null>(null)
  const stepTimer = useRef<number | null>(null)
  const floatKey = useRef(0)

  useEffect(() => () => {
    if (stepTimer.current) clearInterval(stepTimer.current)
  }, [])

  function clearTimers() {
    if (stepTimer.current) { clearInterval(stepTimer.current); stepTimer.current = null }
  }

  function pushHistory(o: Outcome) {
    setHistory((prev) => [...prev, o].slice(-HISTORY_LIMIT))
  }

  // 快速訓練（不看過程）：一次跑完 count 回合，供想跳過動畫、直接拿到訓練成果的人使用。
  function fastTrain(count: number) {
    const Q = qRef.current
    const outcomes: Outcome[] = []
    for (let e = 0; e < count; e++) {
      let r = START.r, c = START.c
      let outcome: Outcome = 'timeout'
      for (let t = 0; t < MAX_TRAIN_STEPS; t++) {
        const { nr, nc, reward, terminal } = qLearningStep(Q, r, c)
        r = nr; c = nc
        if (terminal) { outcome = reward > 0 ? 'goal' : 'trap'; break }
      }
      outcomes.push(outcome)
    }
    setAttemptCount((n) => n + count)
    setHistory((prev) => [...prev, ...outcomes].slice(-HISTORY_LIMIT))
    setAgent(null)
    setEvalResult(null)
    force((n) => n + 1)
  }

  // 動畫訓練：一次一步播放，讓你親眼看到牠一次次撞到湯姆貓、扣分、退回鼠洞重來。
  // 全程只建立「一個」setInterval（跟下面的 evaluate() 用同一種寫法），
  // 停頓用內部計數器模擬，不中途清除、重新註冊計時器——避免計時器交接時卡死。
  function watchAttempts(count: number) {
    clearTimers()
    const Q = qRef.current
    let attemptsLeft = count
    let r = START.r, c = START.c
    let stepsInEpisode = 0
    let pauseTicksLeft = 0 // 0 = 正常走一步；>0 = 停頓中，倒數結束才繼續
    setAgent({ r, c })
    setBusy(true)
    setEvalResult(null)
    setFlash(null)
    setFloatText(null)

    stepTimer.current = window.setInterval(() => {
      if (pauseTicksLeft > 0) {
        pauseTicksLeft--
        if (pauseTicksLeft === 0) {
          setFlash(null)
          setFloatText(null)
          if (attemptsLeft > 0) {
            r = START.r; c = START.c
            setAgent({ r, c })
          } else {
            clearInterval(stepTimer.current!)
            stepTimer.current = null
            setBusy(false)
          }
        }
        return
      }

      const { nr, nc, reward, terminal } = qLearningStep(Q, r, c)
      r = nr; c = nc
      stepsInEpisode++
      setAgent({ r, c })
      force((n) => n + 1) // 讓箭頭跟著即時更新的 Q 值一起浮現

      const gaveUp = stepsInEpisode >= MAX_TRAIN_STEPS
      if (terminal || gaveUp) {
        const outcome: Outcome = terminal ? (reward > 0 ? 'goal' : 'trap') : 'timeout'
        pushHistory(outcome)
        setAttemptCount((n) => n + 1)
        setFlash(outcome)
        floatKey.current += 1
        setFloatText({ text: outcome === 'goal' ? '+10' : outcome === 'trap' ? '−10' : '…', key: floatKey.current })
        attemptsLeft--
        stepsInEpisode = 0
        pauseTicksLeft = 3 // 停頓約 3 個 tick，讓玩家看清楚這回合的結果
      }
    }, 260)
  }

  function reset() {
    clearTimers()
    qRef.current = emptyQ()
    setAttemptCount(0)
    setHistory([])
    setAgent(null)
    setBusy(false)
    setFlash(null)
    setFloatText(null)
    setEvalResult(null)
    force((n) => n + 1)
  }

  // 讓傑利鼠依照學到的策略走一次（貪婪，不探索）。
  // 如果 Q 值還沒收斂，貪婪策略可能讓兩格互相指向對方、無限來回——
  // 這裡加入「最近走過的格子」記憶，偵測到快要繞圈時改選次佳的方向避開。
  function evaluate() {
    clearTimers()
    const Q = qRef.current
    let r = START.r
    let c = START.c
    const recentStates: number[] = [idx(r, c)]
    setAgent({ r, c })
    setBusy(true)
    setEvalResult(null)
    setFlash(null)
    setFloatText(null)
    let steps = 0
    let stuckStreak = 0
    stepTimer.current = window.setInterval(() => {
      const s = idx(r, c)
      const ranked = Q[s].map((q, a) => ({ a, q })).sort((x, y) => y.q - x.q)

      let chosen = ranked[0].a
      for (const cand of ranked) {
        const { nr, nc } = step(r, c, cand.a)
        if (!recentStates.includes(idx(nr, nc))) {
          chosen = cand.a
          break
        }
      }
      const { nr, nc } = step(r, c, chosen)
      const nextIdx = idx(nr, nc)
      const looped = recentStates.includes(nextIdx)
      stuckStreak = looped ? stuckStreak + 1 : 0

      r = nr
      c = nc
      setAgent({ r, c })
      recentStates.push(nextIdx)
      if (recentStates.length > 6) recentStates.shift()
      steps++

      const arrived = isGoal(r, c)
      const trapped = isTrap(r, c)
      const gaveUp = steps >= MAX_WALK_STEPS || stuckStreak >= 4

      if (arrived || trapped || gaveUp) {
        clearInterval(stepTimer.current!)
        stepTimer.current = null
        setBusy(false)
        setEvalResult(arrived ? 'goal' : trapped ? 'trap' : 'stuck')
        setFlash(arrived ? 'goal' : trapped ? 'trap' : null)
      }
    }, 320)
  }

  const Q = qRef.current
  const trained = attemptCount > 0
  const recentAllGoal = history.length >= 3 && history.slice(-3).every((o) => o === 'goal')

  return (
    <div className="grid gap-5 md:grid-cols-[auto_1fr]">
      <div>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-[320px] rounded-xl border border-line bg-cream"
        >
          {Array.from({ length: N }).map((_, r) =>
            Array.from({ length: N }).map((__, c) => {
              const goal = isGoal(r, c)
              const trap = isTrap(r, c)
              const s = idx(r, c)
              const best = Math.max(...Q[s])
              const bestA = Q[s].indexOf(best)
              const showArrow = trained && !goal && !trap && best > OPTIMISTIC_INIT + 0.01
              return (
                <g key={`${r}-${c}`}>
                  <rect
                    x={c * CELL + 1}
                    y={r * CELL + 1}
                    width={CELL - 2}
                    height={CELL - 2}
                    rx={6}
                    fill={
                      goal
                        ? 'var(--color-lime)'
                        : trap
                          ? 'var(--color-coral)'
                          : '#fff'
                    }
                    stroke="var(--color-line)"
                    style={{ transition: 'fill 0.2s' }}
                  />
                  {goal && (
                    <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 8} textAnchor="middle" fontSize={24}>🧀</text>
                  )}
                  {trap && (
                    <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 8} textAnchor="middle" fontSize={22}>🐱</text>
                  )}
                  {showArrow && (
                    <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 7} textAnchor="middle" fontSize={22} fill="var(--color-brand-soft)">
                      {ARROWS[bestA]}
                    </text>
                  )}
                </g>
              )
            }),
          )}

          {/* 撞到貓/吃到起司時，agent 位置閃一個色圈 */}
          {flash && agent && (
            <circle
              cx={agent.c * CELL + CELL / 2}
              cy={agent.r * CELL + CELL / 2}
              r={CELL / 2 - 2}
              fill="none"
              strokeWidth={4}
              stroke={flash === 'goal' ? 'var(--color-lime)' : 'var(--color-red)'}
            >
              <animate attributeName="r" from={10} to={CELL / 2 + 4} dur="0.5s" fill="freeze" />
              <animate attributeName="opacity" from={1} to={0} dur="0.7s" fill="freeze" />
            </circle>
          )}

          {/* 浮動的得分/扣分文字 */}
          {floatText && agent && (
            <text
              key={floatText.key}
              x={agent.c * CELL + CELL / 2}
              y={agent.r * CELL - 4}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              fill={floatText.text.startsWith('+') ? 'var(--color-brand)' : floatText.text.startsWith('−') ? 'var(--color-red)' : 'var(--color-muted)'}
            >
              {floatText.text}
              <animate attributeName="y" from={agent.r * CELL - 4} to={agent.r * CELL - 26} dur="0.75s" fill="freeze" />
              <animate attributeName="opacity" from={1} to={0} dur="0.75s" fill="freeze" />
            </text>
          )}

          {/* 傑利鼠 */}
          {(agent ?? START) && (
            <text
              x={(agent ?? START).c * CELL + CELL / 2}
              y={(agent ?? START).r * CELL + CELL / 2 + 9}
              textAnchor="middle"
              fontSize={26}
              style={{ transition: 'all 0.22s' }}
            >
              🐭
            </text>
          )}
        </svg>

        {/* 嘗試紀錄：一排小圖示，直接看出牠從一直被抓到穩定吃到起司的進步過程 */}
        {history.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs text-muted">嘗試紀錄：</span>
            {history.map((o, i) => (
              <span key={i} className="text-base leading-none" title={o}>
                {OUTCOME_ICON[o]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center gap-4">
        <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
          {!trained && (
            <p>
              <b className="text-ink">強化學習</b>{' '}
              沒有標準答案，只有<b className="text-ink">獎勵與懲罰</b>。
              傑利鼠🐭 要溜去吃起司🧀，成功吃到得
              <span className="font-medium text-brand"> +10 分</span>
              ，途中被湯姆貓🐱 抓到
              <span className="font-medium text-red"> −10 分</span>，
              每移動一步也扣一點點分。按下面的「看牠反覆嘗試」，
              你會看到牠<b className="text-ink">一開始一直被抓、一直碰壁</b>，
              但每失敗一次，牠都會偷偷修正一點記憶，最後才摸索出安全路線。
            </p>
          )}
          {trained && !busy && evalResult === null && (
            <p>
              已經嘗試了 <b className="text-ink">{attemptCount}</b> 次。
              {recentAllGoal ? (
                <>最近幾次都<b className="text-brand">成功吃到起司</b>了！代表策略已經穩定，
                  可以按「測試最佳路線」看牠不再探索、直接照學到的走法溜一次。</>
              ) : (
                <>看嘗試紀錄裡🐱 還很多嗎？那就再多按幾次「看牠反覆嘗試」，
                  讓牠累積更多經驗——每格上浮現的<b className="text-brand">箭頭</b>，
                  就是牠目前學到的「在這裡該往哪逃」。</>
              )}
            </p>
          )}
          {evalResult === 'goal' && (
            <p>🎉 <b className="text-ink">成功了！</b>傑利鼠完全照著學到的策略，一路不繞路地溜到了起司旁邊。</p>
          )}
          {evalResult === 'trap' && (
            <p>😿 這次照著目前學到的策略走，還是被湯姆貓抓到了——代表某幾格的學習還不夠準，多練幾輪「看牠反覆嘗試」再測一次。</p>
          )}
          {evalResult === 'stuck' && (
            <p>
              <b className="text-red">傑利鼠好像在原地打轉，還沒找到出路！</b>{' '}
              代表 Q 值還沒訓練收斂——這在強化學習裡很常見，
              多按幾次「看牠反覆嘗試」讓牠多累積一些經驗，通常就能改善。
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => watchAttempts(6)} disabled={busy}>
            ▶ 看牠反覆嘗試（6 次）
          </Button>
          <Button variant="outline" onClick={evaluate} disabled={!trained || busy}>
            🏆 測試最佳路線
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => fastTrain(20)} disabled={busy}>
            ⏩ 快轉訓練 20 次（跳過動畫）
          </Button>
          {trained && (
            <Button variant="ghost" onClick={reset} disabled={busy}>
              重置
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
