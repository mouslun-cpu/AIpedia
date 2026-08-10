import { Link, useSearchParams } from 'react-router-dom'
import { CATEGORIES, MODULES, TRACK_INFO, type Track } from '../data/modules'
import { CHALLENGE_COUNTS, TOTAL_CHALLENGES } from '../data/challenges'
import { useProgress } from '../lib/progress'

const TRACKS: Track[] = ['discriminative', 'generative']

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const track: Track = searchParams.get('track') === 'generative' ? 'generative' : 'discriminative'
  const progress = useProgress()

  function setTrack(t: Track) {
    setSearchParams(t === 'discriminative' ? {} : { track: t })
  }

  const categoriesForTrack = CATEGORIES.filter((c) =>
    MODULES.some((m) => m.category === c && m.track === track),
  )

  const exploredCount = progress.explored.filter((s) => MODULES.some((m) => m.slug === s)).length
  const challengeDone = progress.challenges.length
  const explorePct = Math.round((exploredCount / MODULES.length) * 100)

  /** 一個模組的挑戰狀態 */
  function challengeStatus(slug: string): 'none' | 'partial' | 'all' {
    const total = CHALLENGE_COUNTS[slug] ?? 0
    if (total === 0) return 'none'
    const done = progress.challenges.filter((c) => c.startsWith(`${slug}::`)).length
    if (done >= total) return 'all'
    return done > 0 ? 'partial' : 'none'
  }

  return (
    <div className="min-h-full bg-paper">
      {/* Hero */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <div className="flex items-center gap-2 text-sm font-medium text-brand">
            <span className="text-xl">✦</span> AIpedia
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            用<span className="text-brand">互動</span>，
            把 AI 難懂的概念變得看得見。
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            這裡的每個知識點都能親手操作——拉滑桿、拖資料點、看動畫。
            自由挑一個有興趣的主題開始探索，遇到 🎯 就動手挑戰看看。
          </p>

          {/* 分頁切換：判別式 AI / 生成式 AI */}
          <div className="mt-8 inline-flex gap-1 rounded-2xl bg-cream p-1.5">
            {TRACKS.map((t) => {
              const info = TRACK_INFO[t]
              const active = t === track
              return (
                <button
                  key={t}
                  onClick={() => setTrack(t)}
                  className={`flex flex-col items-start rounded-xl px-5 py-3 text-left transition-colors ${
                    active ? 'bg-white shadow-sm' : 'hover:bg-white/60'
                  }`}
                >
                  <span className={`text-sm font-semibold ${active ? 'text-brand' : 'text-ink'}`}>
                    {info.icon} {info.label}
                  </span>
                  <span className="mt-0.5 text-xs text-muted">{info.tagline}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* 學習進度條 */}
      <div className="border-b border-line bg-cream/50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
          <div className="min-w-[220px] flex-1">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-ink">🗺️ 你點亮的知識點</span>
              <span className="font-mono text-muted">{exploredCount} / {MODULES.length}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${explorePct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">🏅</span>
            <span className="text-muted">完成挑戰</span>
            <span className="font-mono font-semibold text-ink">{challengeDone} / {TOTAL_CHALLENGES}</span>
          </div>
        </div>
      </div>

      {/* 主題地圖 */}
      <main className="mx-auto max-w-5xl px-5 py-12">
        {categoriesForTrack.map((category) => {
          const items = MODULES.filter((m) => m.category === category && m.track === track)
          return (
            <section key={category} className="mb-12">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const explored = progress.explored.includes(m.slug)
                  const cStatus = challengeStatus(m.slug)
                  return (
                    <Link
                      key={m.slug}
                      to={`/topic/${m.slug}`}
                      className="group relative flex flex-col rounded-2xl border border-line bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-brand-soft hover:shadow-lg hover:shadow-brand/5"
                    >
                      {/* 右上角狀態徽章 */}
                      <div className="absolute right-3 top-3 flex items-center gap-1">
                        {cStatus === 'all' && (
                          <span title="挑戰全達成" className="text-base">🏅</span>
                        )}
                        {cStatus === 'partial' && (
                          <span title="挑戰進行中" className="text-base">🎯</span>
                        )}
                        {cStatus === 'none' && CHALLENGE_COUNTS[m.slug] && (
                          <span title="有動手挑戰" className="text-sm opacity-40 grayscale">🎯</span>
                        )}
                        {explored && (
                          <span title="已探索" className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-pale/60 text-xs text-brand">✓</span>
                        )}
                      </div>

                      <span className="text-3xl">{m.icon}</span>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-muted">
                          {m.difficulty}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-ink group-hover:text-brand">
                        {m.title}
                      </h3>
                      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                        {m.summary}
                      </p>
                      <span className="mt-4 text-sm font-medium text-brand">
                        {explored ? '再玩一次 →' : '開始探索 →'}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-muted">
          AIpedia · 互動式 AI 教學平台
        </div>
      </footer>
    </div>
  )
}
