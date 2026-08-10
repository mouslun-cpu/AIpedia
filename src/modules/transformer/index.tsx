import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'

// 情境：Transformer 是 ChatGPT、Gemini 這些大型語言模型的「引擎」。
// 上一課「自注意力」教了『每個字去參照句中其他字』——但那只是「一位讀者、一種關係」。
// Transformer 的威力來自三件事，這一課用「一組偵探破案」的比喻把它們串起來：
//   ① 多頭注意力：好幾位偵探同時讀同一句話，各自追一種關係，合起來才讀懂
//   ② 疊很多層：讀一遍不夠，一層一層重讀，理解越來越深
//   ③ 平行處理：整句話一次讀完（不像 RNN 一個字一個字），所以又快又能長大

const TOKENS = ['老師', '稱讚', '小明', '因為', '他', '很', '認真']

interface Head {
  key: string
  name: string
  color: string
  job: string
  links: [number, number][] // 這位偵探關注的「字對字」關聯
  finding: string
}
const HEADS: Head[] = [
  {
    key: 'action',
    name: '🕵️ 動作偵探',
    color: 'var(--color-brand)',
    job: '追「誰對誰做了什麼」',
    links: [[1, 0], [1, 2]], // 稱讚←老師、稱讚←小明
    finding: '「稱讚」這個動作：老師是主角、小明是對象。',
  },
  {
    key: 'pronoun',
    name: '🔗 代名詞偵探',
    color: 'var(--color-orange)',
    job: '追「代名詞指的是誰」',
    links: [[4, 2]], // 他←小明
    finding: '「他」指的是小明，不是老師。',
  },
  {
    key: 'cause',
    name: '❓ 因果偵探',
    color: 'var(--color-teal)',
    job: '追「為什麼會這樣」',
    links: [[6, 3], [6, 1]], // 認真←因為、認真←稱讚
    finding: '稱讚的原因：因為（他）很認真。',
  },
]

const CW = 580
const ROW_Y = 132
const GAP = CW / (TOKENS.length + 1)
const xOf = (i: number) => GAP * (i + 1)

// 逐層重讀後「理解到的東西」——早層看字面、深層讀出言外之意（這是真實 Transformer 的傾向）
const LAYER_INSIGHTS = [
  '第 1 層：只看得懂字面上「誰連著誰」——老師、稱讚、小明這些字兜在一起。',
  '第 2 層：把偵探的線索綜合起來——「因為小明認真，所以老師稱讚他」。',
  '第 3 層：讀出言外之意——這句話其實在說「認真是會被看見、被肯定的」。',
]

export function Transformer() {
  const [active, setActive] = useState<Set<string>>(new Set(['action']))
  const [layers, setLayers] = useState(1)

  function toggle(key: string) {
    setActive((prev) => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }
  const activeHeads = HEADS.filter((h) => active.has(h.key))
  const allOn = active.size === HEADS.length

  return (
    <LessonLayout slug="transformer">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        上一課「自注意力」教了：<b className="text-ink">每個字都會去參照句子裡的其他字</b>。
        但那只是<b className="text-ink">一位讀者、盯著一種關係</b>。真正撐起 ChatGPT、Gemini 的引擎叫
        <b className="text-brand">Transformer</b>，它厲害在三件事：
        <b className="text-ink">找一整組偵探同時讀（多頭）、一層層重讀讀到懂（疊層）、而且整句一次讀完（平行）</b>。
        這一課就用「偵探破案」把這台引擎拆開來看。
      </div>

      <Section
        title="Step 1｜多頭注意力：一位偵探不夠，要一整組"
        description="同一句話「老師稱讚小明因為他很認真」，不同偵探各追一種線索。點下面的偵探把他們一個個加進來，看他們在句子上連出不同顏色的線——你會發現：要真正讀懂整句，得靠他們合力。"
      >
        <svg viewBox={`0 0 ${CW} 168`} className="w-full rounded-xl border border-line bg-cream">
          {/* 各偵探的關聯弧線 */}
          {activeHeads.map((h) =>
            h.links.map(([a, b], k) => {
              const x1 = xOf(a)
              const x2 = xOf(b)
              const dist = Math.abs(a - b)
              const apexY = ROW_Y - 20 - dist * 12
              const mx = (x1 + x2) / 2
              return (
                <path
                  key={`${h.key}-${k}`}
                  d={`M ${x1} ${ROW_Y - 16} Q ${mx} ${apexY} ${x2} ${ROW_Y - 16}`}
                  fill="none"
                  stroke={h.color}
                  strokeWidth={2.5}
                  opacity={0.85}
                />
              )
            }),
          )}
          {/* 詞 */}
          {TOKENS.map((t, i) => (
            <g key={i}>
              <rect x={xOf(i) - 28} y={ROW_Y - 16} width={56} height={32} rx={8} fill="#fff" stroke="var(--color-brand-soft)" strokeWidth={1.4} />
              <text x={xOf(i)} y={ROW_Y + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--color-ink)">{t}</text>
            </g>
          ))}
        </svg>

        <div className="mt-4 flex flex-wrap gap-2">
          {HEADS.map((h) => {
            const on = active.has(h.key)
            return (
              <button
                key={h.key}
                onClick={() => toggle(h.key)}
                className="rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors"
                style={{
                  borderColor: h.color,
                  background: on ? h.color : 'white',
                  color: on ? 'white' : 'var(--color-muted)',
                }}
              >
                <div className="font-medium">{on ? '✓ ' : '+ '}{h.name}</div>
                <div className="text-xs opacity-90">{h.job}</div>
              </button>
            )
          })}
        </div>

        {/* 目前偵探的發現 */}
        <div className="mt-4 rounded-xl border border-line p-4">
          {activeHeads.length === 0 ? (
            <p className="text-sm text-muted">上面點一位偵探，看他在句子裡追到什麼線索。</p>
          ) : (
            <ul className="space-y-2">
              {activeHeads.map((h) => (
                <li key={h.key} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: h.color }} />
                  <span className="text-muted"><b className="text-ink">{h.name}</b>：{h.finding}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {allOn && (
          <div className="mt-4 rounded-xl border border-lime bg-lime/10 p-4 text-sm leading-relaxed text-ink">
            🎉 三位偵探一起上，整句話的意思才完整：<b>老師稱讚小明，「他」就是小明，而稱讚是因為小明很認真。</b>
            這就是<b>多頭注意力（multi-head attention）</b>——同一句話讓好幾組注意力同時讀，各抓一種關係，再把發現拼起來。
            真實的 Transformer 一層就有<b>幾十個「偵探」</b>並肩工作。
          </div>
        )}
      </Section>

      <Section
        title="Step 2｜疊很多層：讀一遍不夠，一層一層讀到懂"
        description="就算一組偵探讀過了，也只讀懂表面。Transformer 會把「一整組偵探」疊成很多層，每一層都拿前一層的理解再讀一次——越深，讀出來的意思越抽象。按按鈕多疊幾層看看。"
      >
        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-cream p-4">
            {Array.from({ length: layers }).map((_, i) => {
              const depth = layers - i // 最上面是最深的一層
              return (
                <div
                  key={i}
                  className="w-full rounded-lg border py-2 text-center text-xs font-medium transition-all"
                  style={{
                    borderColor: 'var(--color-brand)',
                    background: `color-mix(in srgb, var(--color-brand) ${depth * 12}%, white)`,
                    color: depth * 12 > 45 ? 'white' : 'var(--color-ink)',
                  }}
                >
                  第 {depth} 層 · 一組偵探
                </div>
              )
            })}
            <div className="mt-1 text-xs text-muted">↑ 一句話從下往上，逐層被重讀</div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-line p-4">
              <div className="text-sm font-medium text-ink">疊到第 {layers} 層，模型理解到：</div>
              <ul className="mt-2 space-y-1.5">
                {LAYER_INSIGHTS.slice(0, layers).map((s, i) => (
                  <li key={i} className="text-sm leading-relaxed text-muted">{s}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setLayers((n) => Math.min(3, n + 1))} disabled={layers >= 3}>📖 再疊一層 →</Button>
              <Button variant="ghost" onClick={() => setLayers(1)} disabled={layers === 1}>重置</Button>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              真實的 GPT 有<b className="text-ink">幾十層</b>這樣的區塊疊起來——這也是為什麼它能讀懂很繞的長句、甚至言外之意。
            </p>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">第三個關鍵：一次讀完整句（平行）。</b>{' '}
        上一課的 RNN／LSTM 是<b className="text-ink">一個字一個字接力讀</b>，讀到後面容易忘、又慢。
        Transformer 讓所有偵探<b className="text-ink">同時看著整句話</b>、任兩個字都能直接互看——
        不必等前一個字讀完。這個「平行」讓它可以吃下海量文字、越訓練越大，
        才長成今天動輒上千億參數的大型語言模型。
        <p className="mt-3">
          <b className="text-ink">一句話總結 Transformer＝</b>
          多頭（一組偵探）× 疊層（讀很多遍）× 平行（一次讀完整句）。把上一課的「自注意力」放大成這台引擎，
          就是 ChatGPT 會寫文章、會對話的秘密。下一課再看它寫字時，怎麼從一堆候選字裡<b className="text-brand">抽</b>出下一個字。
        </p>
      </div>
    </LessonLayout>
  )
}
