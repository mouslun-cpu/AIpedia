import { useEffect, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'

// 情境：把前面幾課合起來——一個 AI 代理（Agent）拿到一個「目標」（不是一步步指令），
// 自己跑「想 → 做 → 看」的迴圈，一步步把任務完成。這正是所謂 agentic loop。
// 任務：幫我訂一張明天台北→台中、最便宜的高鐵票。

interface LoopStep {
  think: string // 想：現在該做什麼
  act: string // 做：呼叫哪個工具
  observe: string // 看：拿到什麼結果
}
const STEPS: LoopStep[] = [
  {
    think: '要訂票，得先知道明天有哪些班次。',
    act: '🔧 查高鐵班次(明天, 台北→台中)',
    observe: '👀 找到 6 班：08:12、09:30、11:00、13:24、15:48、18:00。',
  },
  {
    think: '目標是「最便宜」，得比較這幾班的票價。',
    act: '🔧 比價(6 班)',
    observe: '👀 08:12 那班最便宜，$700（其他多為 $750–$900）。',
  },
  {
    think: '那就訂 08:12 這班。',
    act: '🔧 訂位(08:12 台北→台中)',
    observe: '👀 訂位成功，取得座位 12A，總金額 $700。',
  },
  {
    think: '任務達成，回報結果給使用者。',
    act: '✅ 完成',
    observe: '🎉 已訂明天 08:12 台北→台中，座位 12A，$700。',
  },
]

export function AiAgent() {
  const [done, setDone] = useState(0) // 已完成幾步
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const finished = done >= STEPS.length

  function stepOne() {
    setDone((d) => Math.min(STEPS.length, d + 1))
  }
  function auto() {
    if (timer.current) clearInterval(timer.current)
    setDone(0)
    setPlaying(true)
    let d = 0
    timer.current = window.setInterval(() => {
      d++
      setDone(d)
      if (d >= STEPS.length) { clearInterval(timer.current!); timer.current = null; setPlaying(false) }
    }, 1100)
  }
  function reset() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
    setDone(0)
  }

  return (
    <LessonLayout slug="ai-agent">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        前面幾課的 AI 都是「你問一句、它答一句」。但如果你丟給它的是一個<b className="text-ink">目標</b>，
        而不是一步步的指令呢？<b className="text-brand">AI 代理（Agent）</b>會自己跑一個迴圈：
        <b className="text-ink">想</b>（現在該做什麼）→ <b className="text-ink">做</b>（呼叫工具）→ <b className="text-ink">看</b>（拿到結果）→
        再<b className="text-ink">想</b>下一步……直到任務完成。這個一圈一圈的迴圈，就是它能自己搞定複雜任務的秘密。
        任務：<b className="text-ink">幫我訂一張明天台北→台中、最便宜的高鐵票。</b>
      </div>

      <Section
        title="按「下一步」，看代理一圈一圈把任務做完"
        description="你只給了一個目標，沒教它怎麼做。看它每一輪怎麼「想→做→看」：先查班次、再比價、再訂位，最後回報。這就是 agentic loop——AI 自己拆解、自己一步步推進。"
      >
        {/* 迴圈示意 */}
        <div className="mb-4 flex items-center justify-center gap-2 text-sm">
          {['💭 想', '🔧 做', '👀 看'].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1.5 font-medium ${!finished && playing ? 'border-brand text-brand' : 'border-line text-muted'}`}>{s}</span>
              {i < 2 && <span className="text-muted">→</span>}
            </div>
          ))}
          <span className="text-muted">↻ 重複</span>
        </div>

        {/* 步驟卡 */}
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => {
            const revealed = i < done
            const isLast = i === STEPS.length - 1
            return (
              <div
                key={i}
                className="rounded-xl border-2 p-4 transition-all"
                style={{
                  borderColor: revealed ? (isLast ? 'var(--color-lime)' : 'var(--color-brand)') : 'var(--color-line)',
                  opacity: revealed ? 1 : 0.35,
                  background: revealed && isLast ? 'color-mix(in srgb, var(--color-lime) 10%, white)' : 'white',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{i + 1}</span>
                  <span className="text-sm font-medium text-ink">第 {i + 1} 圈</span>
                </div>
                {revealed && (
                  <div className="mt-2 space-y-1.5 pl-8 text-sm leading-relaxed">
                    <div className="text-muted">💭 想：{s.think}</div>
                    <div className="text-ink">{s.act}</div>
                    <div className="text-muted">{s.observe}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={stepOne} disabled={playing || finished}>下一步（跑一圈）→</Button>
          <Button variant="outline" onClick={auto} disabled={playing}>▶ 自動跑完</Button>
          <Button variant="ghost" onClick={reset} disabled={playing}>⏮ 重來</Button>
        </div>

        {finished && (
          <div className="mt-4 rounded-xl border border-lime bg-lime/10 p-4 text-sm leading-relaxed text-ink">
            🎉 任務完成！你只說了「訂最便宜的票」，代理<b>自己拆成四圈</b>：查班次 → 比價 → 訂位 → 回報。
            這就是 AI 代理的威力——<b>你給目標，它給結果，中間的步驟它自己想</b>。
          </div>
        )}
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">「駕馭 LLM」這一章，到這裡串起來了：</b>
        <ul className="mt-2 space-y-1.5">
          <li>· <b className="text-ink">提示工程</b>——把每一圈的「想」講清楚，它才做對事。</li>
          <li>· <b className="text-ink">脈絡工程</b>——每一圈把「該記得的、查到的」擺進有限的工作記憶。</li>
          <li>· <b className="text-ink">工具調用</b>——每一圈的「做」，就是呼叫查班次、比價、訂位這些工具。</li>
          <li>· <b className="text-ink">代理迴圈</b>——把以上綁成「想→做→看」不斷重複，直到達標。</li>
        </ul>
        <p className="mt-3">
          設計這種迴圈其實很講究：<b className="text-ink">什麼時候該停、選哪個工具、工具出錯了怎麼補救、會不會繞圈圈繞不出來</b>——
          這些正是目前 AI 工程最新、最搶手的題目（有人把它叫做 agent／loop 的設計）。
          從你會<b className="text-ink">問一句</b>，到打造一個能<b className="text-ink">自己完成任務</b>的代理，
          就是「駕馭 LLM」的完整旅程。
        </p>
      </div>
    </LessonLayout>
  )
}
