import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'

const DEMO_SENTENCE = '今天天氣真好'
const DEMO_TOKENS = ['今天', '天氣', '真', '好']

// 玩具版「下一個字」機率表——真正的語言模型是從幾十億字的資料學出來的，
// 這裡用手排的小圖示範同樣的概念：給定「目前最後一個 token」，猜下一個最可能是誰。
const NEXT: Record<string, { tok: string; p: number }[]> = {
  '<start>': [{ tok: '今天', p: 0.5 }, { tok: '晚餐', p: 0.3 }, { tok: '心情', p: 0.2 }],
  今天: [{ tok: '天氣', p: 0.6 }, { tok: '心情', p: 0.4 }],
  心情: [{ tok: '很', p: 1.0 }],
  天氣: [{ tok: '真', p: 0.55 }, { tok: '很', p: 0.45 }],
  很: [{ tok: '好', p: 0.5 }, { tok: '熱', p: 0.3 }, { tok: '冷', p: 0.2 }],
  真: [{ tok: '好', p: 0.7 }, { tok: '冷', p: 0.3 }],
  晚餐: [{ tok: '想', p: 0.5 }, { tok: '吃', p: 0.5 }],
  想: [{ tok: '吃', p: 1.0 }],
  吃: [{ tok: '火鍋', p: 0.5 }, { tok: '牛肉麵', p: 0.5 }],
  好: [{ tok: '。', p: 1.0 }],
  熱: [{ tok: '。', p: 1.0 }],
  冷: [{ tok: '。', p: 1.0 }],
  火鍋: [{ tok: '。', p: 1.0 }],
  牛肉麵: [{ tok: '。', p: 1.0 }],
}

const TOKEN_COLORS = ['var(--color-brand)', 'var(--color-teal)', 'var(--color-orange)', 'var(--color-coral)', 'var(--color-lime)']

export function Tokenization() {
  const [seq, setSeq] = useState<string[]>([])

  const last = seq.length ? seq[seq.length - 1] : '<start>'
  const candidates = NEXT[last] ?? []
  const finished = last === '。'

  function pick(tok: string) {
    setSeq((prev) => [...prev, tok])
  }
  function reset() {
    setSeq([])
  }

  return (
    <LessonLayout slug="tokenization">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        像 ChatGPT 這樣的語言模型，並不是「一次想好整句話」再說出來的。
        它會先把文字切成一顆顆<b className="text-brand">token</b>
        （可以是一個字、一個詞，甚至半個字），然後<b className="text-ink">一個接一個預測</b>：
        「看過前面這些字，下一個字最可能是什麼？」
      </div>

      <Section
        title="第一步：文字要先被切成 token"
        description="這是模型「看到」一句話的方式——先拆解成一顆顆積木。"
      >
        <div className="rounded-xl border border-line bg-cream p-5">
          <div className="mb-3 text-sm text-muted">原始句子：「{DEMO_SENTENCE}」</div>
          <div className="flex flex-wrap gap-2">
            {DEMO_TOKENS.map((t, i) => (
              <span
                key={i}
                className="rounded-lg px-3 py-1.5 font-mono text-sm font-medium text-white"
                style={{ background: TOKEN_COLORS[i % TOKEN_COLORS.length] }}
              >
                {t}
                <span className="ml-1.5 text-xs opacity-70">#{i}</span>
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="第二步：一個接一個，玩接龍"
        description="這是一個縮小版的玩具模型：給定最後一個 token，它列出幾個候選字和機率。點一個候選字，把它接到句子後面，看句子怎麼長出來。"
      >
        <div className="flex flex-col gap-4">
          <div className="min-h-[64px] rounded-xl border border-line bg-cream p-4">
            {seq.length === 0 ? (
              <span className="text-sm text-muted">（還沒開始，點下面的候選字開始接龍）</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-lg font-medium text-ink">
                {seq.map((t, i) => (
                  <span key={i} className="rounded bg-brand-pale/40 px-1.5">{t}</span>
                ))}
                {!finished && <span className="animate-pulse text-brand">▍</span>}
              </div>
            )}
          </div>

          {!finished ? (
            <div>
              <div className="mb-2 text-xs text-muted">下一個 token 的候選機率：</div>
              <div className="flex flex-col gap-2">
                {candidates.map((c) => (
                  <button
                    key={c.tok}
                    onClick={() => pick(c.tok)}
                    className="group flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-brand-soft"
                  >
                    <span className="w-16 font-mono text-sm text-ink">{c.tok}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${c.p * 100}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono text-xs text-muted">{(c.p * 100).toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-lime bg-lime/10 p-3 text-sm text-ink">
              ✅ 生成完成！這就是語言模型「一個字一個字接龍」寫出一整句話的方式。
            </div>
          )}

          <div>
            <Button variant="ghost" onClick={reset}>重新開始</Button>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">真正的語言模型規模大很多：</b>{' '}
        候選字不是 2、3 個，而是幾萬個 token 同時競爭機率；
        「看過前面」也不是像這裡只看最後一個字，而是看過<b className="text-ink">前面幾千個 token</b>
        （這需要下一課要講的<b className="text-brand">注意力機制</b>）。
        但核心邏輯完全一樣：<b className="text-ink">算出所有候選字的機率，再挑一個接上去</b>。
      </div>
    </LessonLayout>
  )
}
