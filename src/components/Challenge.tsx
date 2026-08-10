import { useEffect, useRef, useState, type ReactNode } from 'react'
import { challengeKey, completeChallenge, useProgress } from '../lib/progress'

interface ChallengeProps {
  /** 所屬知識點 slug */
  module: string
  /** 這個挑戰的代號（同一頁多個挑戰要不同） */
  id: string
  /** 挑戰標題 */
  title: string
  /** 要達成什麼（一句話講清楚目標） */
  goal: ReactNode
  /** 手把手步驟——這是給第一次接觸的學生的主要引導，永遠顯示 */
  steps: ReactNode[]
  /** 卡關時可逐條展開的額外提示（由淺到深） */
  hints?: ReactNode[]
  /** 目前是否達成（由模組即時算出的條件） */
  done: boolean
  /** 達成後解釋「你剛剛看到的現象代表什麼」——把操作變成理解 */
  success: ReactNode
}

/**
 * 引導式挑戰卡。設計給非理工、第一次接觸 AI 的學生：
 * 先給明確目標與手把手步驟，卡關能逐步看更多提示，
 * 達成的瞬間慶祝 + 解釋原理，把「拉滑桿」變成「我懂了」。
 * 完成狀態存進 localStorage，回訪仍保留徽章。
 */
export function Challenge({ module, id, title, goal, steps, hints = [], done, success }: ChallengeProps) {
  const progress = useProgress()
  const everDone = progress.challenges.includes(challengeKey(module, id))
  const [revealed, setRevealed] = useState(0) // 已展開幾條提示
  const [justWon, setJustWon] = useState(false)
  const wasDone = useRef(everDone)

  // 第一次達成的瞬間：寫進進度 + 觸發慶祝動畫
  useEffect(() => {
    if (done && !wasDone.current) {
      wasDone.current = true
      completeChallenge(module, id)
      setJustWon(true)
      const t = setTimeout(() => setJustWon(false), 2500)
      return () => clearTimeout(t)
    }
  }, [done, module, id])

  const achieved = done || everDone

  return (
    <div
      className="mt-8 overflow-hidden rounded-2xl border-2 border-dashed transition-colors"
      style={{
        borderColor: achieved ? 'var(--color-lime)' : 'var(--color-amber)',
        background: achieved
          ? 'color-mix(in srgb, var(--color-lime) 12%, white)'
          : 'color-mix(in srgb, var(--color-amber) 10%, white)',
      }}
    >
      <div className="p-5">
        {/* 標題列 */}
        <div className="flex items-center gap-2">
          <span className={`text-xl ${justWon ? 'animate-badge-bounce inline-block' : ''}`}>
            {achieved ? '🏅' : '🎯'}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            動手挑戰
          </span>
          <span
            className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              background: achieved ? 'var(--color-lime)' : 'var(--color-cream)',
              color: achieved ? 'var(--color-ink)' : 'var(--color-muted)',
            }}
          >
            {achieved ? '✓ 已達成' : '進行中'}
          </span>
        </div>

        <h3 className="mt-2 text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 leading-relaxed text-muted">{goal}</p>

        {/* 手把手步驟 */}
        <div className="mt-4 rounded-xl bg-white/70 p-4">
          <div className="text-sm font-medium text-ink">怎麼做：</div>
          <ol className="mt-2 space-y-1.5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-pale/60 text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 逐步提示 */}
        {hints.length > 0 && !achieved && (
          <div className="mt-3">
            {revealed > 0 && (
              <ul className="mb-2 space-y-1.5">
                {hints.slice(0, revealed).map((h, i) => (
                  <li key={i} className="animate-pop-in rounded-lg bg-white/70 px-3 py-2 text-sm leading-relaxed text-muted">
                    💡 {h}
                  </li>
                ))}
              </ul>
            )}
            {revealed < hints.length && (
              <button
                onClick={() => setRevealed((r) => r + 1)}
                className="text-sm font-medium text-brand transition-colors hover:text-ink"
              >
                {revealed === 0 ? '🤔 卡住了？看個提示' : '再給我一個提示'}
              </button>
            )}
          </div>
        )}

        {/* 達成後：解釋原理 */}
        {achieved && (
          <div className={`mt-4 rounded-xl bg-white/80 p-4 ${justWon ? 'animate-pop-in' : ''}`}>
            <div className="text-sm font-semibold text-ink">
              {justWon ? '🎉 完成！你剛剛做到了——' : '💬 這個挑戰教你的事：'}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{success}</p>
          </div>
        )}
      </div>
    </div>
  )
}
