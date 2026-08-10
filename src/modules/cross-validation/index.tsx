import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'

const TOTAL = 12

// 每個 fold 當驗證時的「分數」（固定的假資料，用來示範不同 fold 分數會有高低）
function foldScore(k: number, fold: number): number {
  const base = 82
  const wiggle = [6, -5, 3, -7, 4, -2][fold % 6]
  return Math.round(base + wiggle + (k % 2 === 0 ? 2 : -1))
}

export function CrossValidation() {
  const [k, setK] = useState(4)
  const [revealed, setRevealed] = useState(0) // 已跑完幾輪
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  // 把 12 筆資料平均分成 k 組（fold）
  const foldOf = (i: number) => Math.floor((i / TOTAL) * k)

  const scores = useMemo(
    () => Array.from({ length: k }, (_, f) => foldScore(k, f)),
    [k],
  )
  const shownScores = scores.slice(0, revealed)
  const avg =
    shownScores.length > 0
      ? shownScores.reduce((a, b) => a + b, 0) / shownScores.length
      : 0

  function reset(newK = k) {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
    setRevealed(0)
    if (newK !== k) setK(newK)
  }

  function play() {
    if (timer.current) clearInterval(timer.current)
    setRevealed(0)
    setPlaying(true)
    let r = 0
    timer.current = window.setInterval(() => {
      r++
      setRevealed(r)
      if (r >= k) {
        clearInterval(timer.current!)
        timer.current = null
        setPlaying(false)
      }
    }, 750)
  }

  return (
    <LessonLayout slug="cross-validation">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        資料很寶貴，尤其當它不多的時候。如果只切一份出來當驗證，
        <b className="text-ink">剛好切到好運或壞運</b>的資料，評分就會失真。
        交叉驗證的聰明之處是：把資料分成 K 份，
        <b className="text-brand">輪流讓每一份都當一次驗證</b>，最後取平均——
        這樣每筆資料都被驗證到，結果也更公正。
      </div>

      <Section
        title="每一輪，換一份資料當驗證"
        description="下面每一橫排是一輪。橘色是那一輪被拿來當「驗證」的那份，藍色是拿來「訓練」的其餘部分。按播放，看它一輪輪跑完並累積平均分數。"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: k }).map((_, round) => {
              const done = round < revealed
              return (
                <div
                  key={round}
                  className="flex items-center gap-3 transition-opacity"
                  style={{ opacity: done || !playing ? 1 : 0.35 }}
                >
                  <span className="w-14 shrink-0 text-xs text-muted">
                    第 {round + 1} 輪
                  </span>
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: TOTAL }).map((_, i) => {
                      const isVal = foldOf(i) === round
                      return (
                        <div
                          key={i}
                          className="h-7 flex-1 rounded"
                          style={{
                            background: isVal
                              ? 'var(--color-orange)'
                              : 'var(--color-brand)',
                            opacity: isVal ? 1 : 0.35,
                          }}
                        />
                      )
                    })}
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-sm">
                    {done ? (
                      <span className="text-ink">{scores[round]}%</span>
                    ) : (
                      <span className="text-line">—</span>
                    )}
                  </span>
                </div>
              )
            })}
            <div className="mt-1 flex items-center gap-3 border-t border-line pt-3">
              <span className="w-14 shrink-0 text-xs font-medium text-ink">平均</span>
              <div className="flex-1 text-xs text-muted">
                {revealed > 0 ? `${revealed} 輪的平均分數` : '按播放開始'}
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold text-brand">
                {revealed > 0 ? `${avg.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Slider
              label="K（分成幾份）"
              min={3}
              max={6}
              value={k}
              onChange={(v) => reset(v)}
              suffix="份"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={play} disabled={playing}>▶ 開始跑</Button>
              <Button variant="ghost" onClick={() => reset()} disabled={playing}>重置</Button>
            </div>
            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              注意每一輪的分數<b className="text-ink">都不太一樣</b>
              （{Math.min(...scores)}% ~ {Math.max(...scores)}%）。
              如果只做一次，可能剛好拿到最高或最低那份而誤判。
              取平均能把這種運氣成分抵銷掉。
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        這種做法叫 <b className="text-ink">K-fold 交叉驗證</b>。
        K 常設 5 或 10——K 越大，每次訓練用的資料越多、估計越準，但要跑的次數也越多、越花時間。
        它最常用在<b className="text-brand">挑選模型設定</b>（例如該用幾次多項式、KNN 的 K 該設多少），
        因為它給的分數比單次切分可靠得多。
      </div>
    </LessonLayout>
  )
}
