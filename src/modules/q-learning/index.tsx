import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'

const N = 5
const START = { r: 4, c: 0 }
const GOAL = { r: 0, c: 4 }
const TRAPS = [{ r: 2, c: 2 }, { r: 1, c: 3 }]
const idx = (r: number, c: number) => r * N + c
const isTrap = (r: number, c: number) => TRAPS.some((t) => t.r === r && t.c === c)
const isGoal = (r: number, c: number) => r === GOAL.r && c === GOAL.c

const MOVES = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }]
const ARROWS = ['↑', '↓', '←', '→']
const ACTION_NAMES = ['上', '下', '左', '右']

function emptyQ(): number[][] {
  return Array.from({ length: N * N }, () => [0, 0, 0, 0])
}
function stepMove(r: number, c: number, a: number) {
  return {
    nr: Math.max(0, Math.min(N - 1, r + MOVES[a].dr)),
    nc: Math.max(0, Math.min(N - 1, c + MOVES[a].dc)),
  }
}

const CELL = 60
const SIZE = N * CELL

interface LastUpdate {
  s: number; a: number; r: number; sNext: number
  oldQ: number; futureEst: number; target: number; newQ: number; terminal: boolean
}

export function QLearning() {
  const [Q, setQ] = useState<number[][]>(emptyQ)
  const [agent, setAgent] = useState(START)
  const [alpha, setAlpha] = useState(0.5)
  const [gamma, setGamma] = useState(0.9)
  const [epsilon, setEpsilon] = useState(0.2)
  const [last, setLast] = useState<LastUpdate | null>(null)
  const [inspect, setInspect] = useState<{ r: number; c: number } | null>(null)

  function singleStep() {
    const { r, c } = agent
    const s = idx(r, c)
    const a = Math.random() < epsilon ? Math.floor(Math.random() * 4) : Q[s].indexOf(Math.max(...Q[s]))
    const { nr, nc } = stepMove(r, c, a)
    let reward = -0.1
    let terminal = false
    if (isGoal(nr, nc)) { reward = 10; terminal = true }
    else if (isTrap(nr, nc)) { reward = -10; terminal = true }
    const sNext = idx(nr, nc)
    const oldQ = Q[s][a]
    const futureEst = terminal ? 0 : Math.max(...Q[sNext])
    const target = terminal ? reward : reward + gamma * futureEst
    const newQ = oldQ + alpha * (target - oldQ)

    const nextQ = Q.map((row) => [...row])
    nextQ[s][a] = newQ
    setQ(nextQ)
    setLast({ s, a, r: reward, sNext, oldQ, futureEst, target, newQ, terminal })
    setAgent(terminal ? START : { r: nr, c: nc })
  }

  function trainBulk(n: number) {
    let curQ = Q.map((row) => [...row])
    let pos = agent
    for (let i = 0; i < n; i++) {
      const s = idx(pos.r, pos.c)
      const a = Math.random() < epsilon ? Math.floor(Math.random() * 4) : curQ[s].indexOf(Math.max(...curQ[s]))
      const { nr, nc } = stepMove(pos.r, pos.c, a)
      let reward = -0.1
      let terminal = false
      if (isGoal(nr, nc)) { reward = 10; terminal = true }
      else if (isTrap(nr, nc)) { reward = -10; terminal = true }
      const sNext = idx(nr, nc)
      const target = terminal ? reward : reward + gamma * Math.max(...curQ[sNext])
      curQ[s][a] += alpha * (target - curQ[s][a])
      pos = terminal ? START : { r: nr, c: nc }
    }
    setQ(curQ)
    setAgent(pos)
  }

  function reset() {
    setQ(emptyQ())
    setAgent(START)
    setLast(null)
    setInspect(null)
  }

  const trained = Q.some((row) => row.some((v) => v !== 0))

  return (
    <LessonLayout slug="q-learning">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        機器人要在格子世界裡找到走到終點的路。它心裡有一張<b className="text-brand">Q 表格</b>：
        每個格子、每個方向都對應一個數字，代表「<b className="text-ink">從這裡往這個方向走，長期而言值多少分</b>」。
        <b className="text-brand">Q-learning</b> 就是不斷用走過的經驗，把這張表格的數字修正得越來越準。
      </div>

      <Section
        title="按「走一步」，看 Q 表格的一格數字怎麼被更新"
        description="每走一步，機器人會用「這一步實際拿到的獎勵」加上「對下一格的預期」，去修正剛剛那一步的 Q 值。點任何格子可以看到它 4 個方向目前的 Q 值。"
      >
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[320px] rounded-xl border border-line bg-cream">
            {Array.from({ length: N }).map((_, r) =>
              Array.from({ length: N }).map((__, c) => {
                const goal = isGoal(r, c)
                const trap = isTrap(r, c)
                const s = idx(r, c)
                const best = Math.max(...Q[s])
                const bestA = Q[s].indexOf(best)
                const showArrow = trained && !goal && !trap && best > 0.01
                const isInspecting = inspect?.r === r && inspect?.c === c
                return (
                  <g key={`${r}-${c}`} onClick={() => setInspect({ r, c })} className="cursor-pointer">
                    <rect x={c * CELL + 1} y={r * CELL + 1} width={CELL - 2} height={CELL - 2} rx={6}
                      fill={goal ? 'var(--color-lime)' : trap ? 'var(--color-coral)' : isInspecting ? 'var(--color-brand-pale)' : '#fff'}
                      stroke={isInspecting ? 'var(--color-brand)' : 'var(--color-line)'} strokeWidth={isInspecting ? 2.5 : 1} />
                    {goal && <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 8} textAnchor="middle" fontSize={22}>🏁</text>}
                    {trap && <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 8} textAnchor="middle" fontSize={20}>💣</text>}
                    {showArrow && <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 7} textAnchor="middle" fontSize={20} fill="var(--color-brand-soft)">{ARROWS[bestA]}</text>}
                  </g>
                )
              }),
            )}
            <text x={agent.c * CELL + CELL / 2} y={agent.r * CELL + CELL / 2 + 9} textAnchor="middle" fontSize={24} style={{ transition: 'all 0.2s' }}>🤖</text>
          </svg>

          <div className="flex flex-col gap-4">
            {inspect && (
              <div className="rounded-xl border border-brand-pale bg-brand-pale/15 p-3">
                <div className="mb-1 text-xs text-muted">格子 (第{inspect.r + 1}列, 第{inspect.c + 1}欄) 的 Q 值</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {ACTION_NAMES.map((name, a) => (
                    <div key={a} className="rounded-lg bg-white p-1.5">
                      <div className="text-[10px] text-muted">{ARROWS[a]} {name}</div>
                      <div className="font-mono text-xs font-semibold text-ink">{Q[idx(inspect.r, inspect.c)][a].toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {last && (
              <div className="rounded-xl border border-line p-3 text-xs leading-relaxed text-muted">
                <div className="font-mono">
                  Q ← {last.oldQ.toFixed(2)} + {alpha.toFixed(1)} × ({last.r.toFixed(1)}
                  {!last.terminal && ` + ${gamma.toFixed(2)}×${last.futureEst.toFixed(2)}`}
                  {' − '}{last.oldQ.toFixed(2)}) = <b className="text-brand">{last.newQ.toFixed(2)}</b>
                </div>
              </div>
            )}

            <Slider label="學習率 α" min={0.1} max={1} step={0.1} value={alpha} onChange={setAlpha} format={(v) => v.toFixed(1)} />
            <Slider label="折扣因子 γ（多在乎未來）" min={0.1} max={0.99} step={0.01} value={gamma} onChange={setGamma} format={(v) => v.toFixed(2)} />
            <Slider label="ε（探索機率）" min={0} max={0.6} step={0.05} value={epsilon} onChange={setEpsilon} format={(v) => v.toFixed(2)} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={singleStep}>走一步 →</Button>
              <Button variant="outline" onClick={() => trainBulk(60)}>訓練 60 步</Button>
              <Button variant="ghost" onClick={reset}>重置</Button>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">公式拆解：</b>{' '}
        新的 Q 值 = 舊的 Q 值 + 學習率 ×（<b className="text-ink">這步實際拿到的獎勵 + γ × 對下一格「最好方向」的預期</b> − 舊的 Q 值）。
        括號裡那一大串叫<b className="text-brand">「誤差」</b>——多按幾次「走一步」，
        點點格子看數字怎麼慢慢從 0 開始「長」出來，最後訓練夠久，箭頭就會浮現出整條通往終點的路。
      </div>
    </LessonLayout>
  )
}
