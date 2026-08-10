import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'

// 情境：提示是「今天天氣」，模型對下一個字的原始信心（溫度=1 時就是這個分布）。
const WORDS = ['很', '真', '不太', '依然', '有點']
const BASE_P = [0.42, 0.24, 0.14, 0.12, 0.08]
const LOGITS = BASE_P.map((p) => Math.log(p))

function softmax(logits: number[], temperature: number): number[] {
  const scaled = logits.map((l) => l / temperature)
  const m = Math.max(...scaled)
  const exps = scaled.map((l) => Math.exp(l - m))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

/** nucleus sampling：由高到低累加機率，只留下累積超過門檻前的字，其餘歸零後重新正規化 */
function applyTopP(probs: number[], p: number): number[] {
  const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a])
  let cum = 0
  const keep = new Set<number>()
  for (const i of order) {
    if (cum >= p && keep.size > 0) break
    keep.add(i)
    cum += probs[i]
  }
  const filtered = probs.map((v, i) => (keep.has(i) ? v : 0))
  const sum = filtered.reduce((a, b) => a + b, 0)
  return filtered.map((v) => v / sum)
}

export function Sampling() {
  const [temp, setTemp] = useState(1)
  const [topP, setTopP] = useState(1)
  const [history, setHistory] = useState<string[]>([])

  const dist = useMemo(() => applyTopP(softmax(LOGITS, temp), topP), [temp, topP])

  function sampleOnce() {
    const r = Math.random()
    let cum = 0
    let chosen = WORDS[0]
    for (let i = 0; i < dist.length; i++) {
      cum += dist[i]
      if (r <= cum) { chosen = WORDS[i]; break }
    }
    setHistory((prev) => [...prev.slice(-9), chosen])
  }

  return (
    <LessonLayout slug="sampling">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        同一個模型，為什麼有時候回答很穩重、有時候又天馬行空？
        關鍵不在模型變了，而是<b className="text-brand">怎麼從機率分布裡「抽」出最終答案</b>。
        兩個常見旋鈕：<b className="text-ink">Temperature（溫度）</b>和
        <b className="text-ink">Top-p（核採樣）</b>。
      </div>

      <Section
        title={`情境：「今天天氣___」，下一個字要選誰？`}
        description="拉動下面的滑桿，看候選字的機率分布怎麼被重新塑形。"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-2">
            {WORDS.map((w, i) => (
              <div key={w} className="flex items-center gap-3">
                <span className="w-14 shrink-0 font-mono text-sm text-ink">{w}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-cream">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-150"
                    style={{ width: `${dist[i] * 100}%`, opacity: dist[i] === 0 ? 0.15 : 1 }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-xs text-muted">{(dist[i] * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <Slider label="Temperature（溫度）" min={0.1} max={2} step={0.05} value={temp} onChange={setTemp} format={(v) => v.toFixed(2)} />
            <Slider label="Top-p（只留最可能的一小群）" min={0.1} max={1} step={0.05} value={topP} onChange={setTopP} format={(v) => v.toFixed(2)} />
            <Button onClick={sampleOnce}>🎲 抽樣一次</Button>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-line bg-cream p-4">
          <div className="mb-2 text-xs text-muted">最近 10 次抽樣結果：</div>
          {history.length === 0 ? (
            <p className="text-sm text-muted">按上面的「抽樣一次」看看會選中哪個字。</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {history.map((w, i) => (
                <span key={i} className="rounded-full bg-brand/10 px-2.5 py-1 font-mono text-sm text-brand">{w}</span>
              ))}
            </div>
          )}
        </div>
      </Section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-cream/60 p-5 text-sm leading-relaxed text-muted">
          <b className="text-ink">Temperature 越低（趨近 0）</b>：分布被拉得又尖又高，
          幾乎每次都選最高機率的那個字——回答穩重、可預期，但也容易重複、無聊。
          <b className="text-ink">越高</b>：分布被壓平，冷門字也有機會出頭——更有創意，但也更容易語無倫次。
        </div>
        <div className="rounded-2xl border border-line bg-cream/60 p-5 text-sm leading-relaxed text-muted">
          <b className="text-ink">Top-p 越小</b>：只留下「最有把握的一小撮」候選字，
          直接把長尾的怪異選項排除在外。<b className="text-ink">Top-p = 1</b> 則完全不設限，
          所有候選字都留著（只受溫度影響）。實務上常把兩者<b className="text-ink">搭配使用</b>。
        </div>
      </div>
    </LessonLayout>
  )
}
