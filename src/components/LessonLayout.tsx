import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MODULES, getModule, TRACK_INFO } from '../data/modules'
import { markExplored } from '../lib/progress'

interface LessonLayoutProps {
  slug: string
  children: ReactNode
}

/**
 * 每個知識點頁面的共用外框：
 * 頂部返回列、標題區、內容、底部上一課/下一課導航。
 */
export function LessonLayout({ slug, children }: LessonLayoutProps) {
  const meta = getModule(slug)

  // 進到任何知識點頁 = 標記為「已探索」，首頁會點亮
  useEffect(() => {
    markExplored(slug)
  }, [slug])
  // 上一個/下一個只在同一個分頁（判別式／生成式）裡找，避免跨分頁跳轉造成錯亂。
  const trackModules = MODULES.filter((m) => m.track === meta?.track)
  const index = trackModules.findIndex((m) => m.slug === slug)
  const prev = index > 0 ? trackModules[index - 1] : undefined
  const next = index >= 0 && index < trackModules.length - 1 ? trackModules[index + 1] : undefined

  return (
    <div className="min-h-full bg-paper">
      {/* 頂部返回列 */}
      <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand"
          >
            <span aria-hidden>←</span> AIpedia
          </Link>
          {meta && (
            <>
              <span className="text-line">/</span>
              <Link
                to={`/?track=${meta.track}`}
                className="text-sm text-muted transition-colors hover:text-brand"
              >
                {TRACK_INFO[meta.track].icon} {TRACK_INFO[meta.track].label}
              </Link>
              <span className="text-line">/</span>
              <span className="text-sm text-muted">{meta.category}</span>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        {meta && (
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-3xl">{meta.icon}</span>
              <span className="rounded-full bg-brand-pale/50 px-2.5 py-0.5 text-xs font-medium text-brand">
                {meta.difficulty}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {meta.title}
            </h1>
            <p className="mt-2 max-w-2xl text-lg text-muted">{meta.summary}</p>
          </div>
        )}

        {children}

        {/* 底部上一課 / 下一課 */}
        <nav className="mt-16 flex items-stretch justify-between gap-3 border-t border-line pt-6">
          {prev ? (
            <Link
              to={`/topic/${prev.slug}`}
              className="group flex flex-1 flex-col rounded-xl border border-line p-4 transition-colors hover:border-brand-soft"
            >
              <span className="text-xs text-muted">← 上一個</span>
              <span className="mt-1 font-medium text-ink group-hover:text-brand">
                {prev.title}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              to={`/topic/${next.slug}`}
              className="group flex flex-1 flex-col rounded-xl border border-line p-4 text-right transition-colors hover:border-brand-soft"
            >
              <span className="text-xs text-muted">下一個 →</span>
              <span className="mt-1 font-medium text-ink group-hover:text-brand">
                {next.title}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>
      </main>
    </div>
  )
}

/** 知識點內的一個「互動段落」區塊，統一卡片外觀。 */
export function Section({
  title,
  description,
  children,
}: {
  title?: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-8">
      {title && (
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
      )}
      {description && (
        <div className="mt-1.5 max-w-3xl leading-relaxed text-muted">
          {description}
        </div>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}
