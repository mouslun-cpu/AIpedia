import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'

// 每個關鍵字在「垃圾信」和「正常信」裡出現的機率（由過往資料學來的）。
interface Word {
  text: string
  pSpam: number // P(這個字 | 垃圾信)
  pHam: number // P(這個字 | 正常信)
}
const WORDS: Word[] = [
  { text: '免費', pSpam: 0.6, pHam: 0.05 },
  { text: '中獎', pSpam: 0.7, pHam: 0.02 },
  { text: '點擊連結', pSpam: 0.5, pHam: 0.1 },
  { text: '限時優惠', pSpam: 0.45, pHam: 0.08 },
  { text: '會議', pSpam: 0.05, pHam: 0.5 },
  { text: '報告', pSpam: 0.04, pHam: 0.45 },
  { text: '附件', pSpam: 0.15, pHam: 0.4 },
  { text: '專案進度', pSpam: 0.03, pHam: 0.35 },
]

export function NaiveBayes() {
  const [active, setActive] = useState<boolean[]>(
    () => WORDS.map((w) => ['免費', '中獎'].includes(w.text)),
  )
  const [priorSpam, setPriorSpam] = useState(0.4)

  const toggle = (i: number) =>
    setActive((prev) => prev.map((v, j) => (j === i ? !v : v)))

  // 樸素貝氏：把先驗機率，乘上每個出現的字的「條件機率」
  let scoreSpam = priorSpam
  let scoreHam = 1 - priorSpam
  const contributions: { text: string; ratio: number }[] = []
  WORDS.forEach((w, i) => {
    if (active[i]) {
      scoreSpam *= w.pSpam
      scoreHam *= w.pHam
      contributions.push({ text: w.text, ratio: w.pSpam / w.pHam })
    }
  })
  const postSpam = scoreSpam / (scoreSpam + scoreHam)
  const isSpam = postSpam >= 0.5

  return (
    <LessonLayout slug="naive-bayes">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        樸素貝氏用<b className="text-ink">機率</b>來分類：面對一封信，它問的是
        「<b className="text-brand">在看到這些字的情況下，它是垃圾信的機率有多高？</b>」
        做法是把每個字提供的線索<b className="text-ink">一個個乘起來</b>。
        「樸素」是因為它假設每個字彼此獨立——雖然不完全對，但意外地好用。
      </div>

      <Section
        title="組一封信，看機器怎麼判斷"
        description="點下面的關鍵字，把它們加進信裡或拿掉。每加一個字，機器就更新一次「這是垃圾信」的機率。"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            {/* 關鍵字選擇 */}
            <div className="rounded-xl border border-line bg-cream p-4">
              <div className="mb-2 text-sm text-muted">信件中包含的關鍵字：</div>
              <div className="flex flex-wrap gap-2">
                {WORDS.map((w, i) => {
                  const spammy = w.pSpam > w.pHam
                  return (
                    <button
                      key={i}
                      onClick={() => toggle(i)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        active[i]
                          ? spammy
                            ? 'border-red bg-red/10 text-red'
                            : 'border-brand bg-brand/10 text-brand'
                          : 'border-line text-muted hover:border-brand-soft'
                      }`}
                    >
                      {active[i] ? '✓ ' : '+ '}
                      {w.text}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 計算過程 */}
            <div className="mt-4 rounded-xl border border-line p-4">
              <div className="text-sm font-medium text-ink">機器的推理</div>
              {contributions.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  還沒放任何關鍵字。這時只能靠「先驗機率」猜——也就是不看內容，
                  單純用「平常有多少比例是垃圾信」來判斷。
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {contributions.map((c, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>「{c.text}」</span>
                      <span className="font-mono">
                        {c.ratio >= 1 ? (
                          <span className="text-red">
                            垃圾信可能性 ×{c.ratio.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-brand">
                            正常信可能性 ×{(1 / c.ratio).toFixed(1)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Slider
              label="先驗機率：平常垃圾信的比例"
              min={0.1}
              max={0.9}
              step={0.05}
              value={priorSpam}
              onChange={setPriorSpam}
              format={(v) => `${Math.round(v * 100)}%`}
            />

            {/* 結果 */}
            <div className="rounded-xl border p-4" style={{ borderColor: isSpam ? 'var(--color-red)' : 'var(--color-brand)' }}>
              <div className="text-xs text-muted">判斷結果</div>
              <div className="mt-1 text-lg font-bold" style={{ color: isSpam ? 'var(--color-red)' : 'var(--color-brand)' }}>
                {isSpam ? '🚫 垃圾信' : '✅ 正常信'}
              </div>
              <div className="mt-3 text-xs text-muted">是垃圾信的機率</div>
              <div className="mt-1 h-4 overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${postSpam * 100}%`,
                    background: isSpam ? 'var(--color-red)' : 'var(--color-brand)',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div className="mt-1 text-right font-mono text-sm font-semibold text-ink">
                {(postSpam * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">試試看：</b>{' '}
        先只放「會議」「報告」，機率會壓得很低（像正常信）；再加上「免費」「中獎」，
        機率立刻飆高。每個字都是一條<b className="text-ink">線索</b>，
        貝氏把它們乘在一起做最後裁決。這就是早年 Email 垃圾信過濾器背後的核心技術。
      </div>
    </LessonLayout>
  )
}
