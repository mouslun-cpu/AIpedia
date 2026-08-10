import { useEffect, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'

// 情境：RNN 怎麼讀一句話？它一個字一個字讀，腦中維護一份「目前的印象」（記憶／隱藏狀態）。
// 關鍵：讀到「不」會改變後面字的意思——所以「不 好吃」和「好吃」結果相反。
// 這展示 RNN 三大特性：① 逐步處理序列 ② 記憶往後傳 ③ 順序會影響結果。

interface Word {
  text: string
  kind: 'sent' | 'neg' | 'amp' // 情緒詞 / 否定詞 / 強調詞
  value?: number // 情緒詞的分數
}
const BANK: Word[] = [
  { text: '好吃', kind: 'sent', value: 2 },
  { text: '難吃', kind: 'sent', value: -2 },
  { text: '普通', kind: 'sent', value: 0 },
  { text: '新鮮', kind: 'sent', value: 2 },
  { text: '雷', kind: 'sent', value: -2 },
  { text: '不', kind: 'neg' },
  { text: '很', kind: 'amp' },
  { text: '有點', kind: 'amp' },
]
interface State {
  score: number // 目前印象分數
  pendingNeg: boolean // 記憶：下一個情緒詞要翻轉嗎
  pendingAmp: number // 記憶：下一個情緒詞要放大幾倍
}
const INIT: State = { score: 0, pendingNeg: false, pendingAmp: 1 }

function stepRNN(s: State, w: Word): { next: State; note: string } {
  if (w.kind === 'neg') {
    return { next: { ...s, pendingNeg: !s.pendingNeg }, note: `讀到「${w.text}」→ 記住：下一個詞要「翻轉」意思` }
  }
  if (w.kind === 'amp') {
    const amp = w.text === '很' ? 1.6 : 0.5
    return { next: { ...s, pendingAmp: amp }, note: `讀到「${w.text}」→ 記住：下一個詞的感受 ×${amp}` }
  }
  // 情緒詞：套用記憶裡的翻轉與放大
  const base = w.value ?? 0
  const applied = base * s.pendingAmp * (s.pendingNeg ? -1 : 1)
  return {
    next: { score: s.score + applied, pendingNeg: false, pendingAmp: 1 },
    note:
      `讀到「${w.text}」(感受 ${base >= 0 ? '+' : ''}${base})` +
      (s.pendingAmp !== 1 ? ` ×${s.pendingAmp}` : '') +
      (s.pendingNeg ? '，翻轉為 ' + (applied >= 0 ? '+' : '') + applied : '') +
      ` → 印象 ${applied >= 0 ? '加' : '減'} ${Math.abs(applied)}`,
  }
}

function wordOf(text: string): Word {
  return BANK.find((b) => b.text === text) ?? { text, kind: 'sent', value: 0 }
}
const kindColor = (k: Word['kind']) =>
  k === 'neg' ? 'var(--color-orange)' : k === 'amp' ? 'var(--color-brand-soft)' : 'var(--color-brand)'

// ── 架構圖：一個帶自我迴圈的神經網路 = 沿著時間展開成一串重複使用的網路 ──
function UnrollDiagram() {
  const rows = [1, 2, 3]
  const rowY = [34, 100, 166]
  return (
    <svg viewBox="0 0 640 210" className="w-full max-w-2xl">
      {/* 左：帶自我迴圈的版本 */}
      <circle cx={44} cy={107} r={24} fill="var(--color-orange)" opacity={0.85} />
      <text x={44} y={112} textAnchor="middle" fontSize={12} fill="#fff" fontWeight={700}>資料</text>
      <line x1={68} y1={107} x2={112} y2={107} stroke="var(--color-muted)" strokeWidth={1.5} markerEnd="url(#rnn-arrow)" />
      <rect x={114} y={82} width={92} height={50} rx={10} fill="var(--color-brand)" />
      <text x={160} y={112} textAnchor="middle" fontSize={13} fill="#fff" fontWeight={700}>神經網路</text>
      <line x1={206} y1={107} x2={250} y2={107} stroke="var(--color-muted)" strokeWidth={1.5} markerEnd="url(#rnn-arrow)" />
      <circle cx={274} cy={107} r={24} fill="var(--color-brand-pale)" />
      <text x={274} y={112} textAnchor="middle" fontSize={12} fill="var(--color-ink)" fontWeight={700}>結果</text>
      {/* 自我迴圈 */}
      <path d="M 206 122 Q 160 168 114 122" fill="none" stroke="var(--color-muted)" strokeWidth={1.5} markerEnd="url(#rnn-arrow)" />

      <text x={330} y={112} textAnchor="middle" fontSize={22} fill="var(--color-muted)" fontWeight={700}>=</text>

      {/* 右：沿時間展開 */}
      {rows.map((t, i) => (
        <g key={t}>
          <text x={362} y={rowY[i] + 5} fontSize={12} fill="var(--color-muted)" fontFamily="monospace">t={t}</text>
          <circle cx={430} cy={rowY[i]} r={20} fill="var(--color-orange)" opacity={0.85} />
          <text x={430} y={rowY[i] + 4} textAnchor="middle" fontSize={10.5} fill="#fff" fontWeight={700}>資料{t}</text>
          <line x1={450} y1={rowY[i]} x2={486} y2={rowY[i]} stroke="var(--color-muted)" strokeWidth={1.5} markerEnd="url(#rnn-arrow)" />
          <rect x={488} y={rowY[i] - 20} width={76} height={40} rx={8} fill="var(--color-brand)" />
          <text x={526} y={rowY[i] + 4} textAnchor="middle" fontSize={11.5} fill="#fff" fontWeight={700}>神經網路</text>
          <line x1={564} y1={rowY[i]} x2={598} y2={rowY[i]} stroke="var(--color-muted)" strokeWidth={1.5} markerEnd="url(#rnn-arrow)" />
          <circle cx={618} cy={rowY[i]} r={20} fill="var(--color-brand-pale)" />
          <text x={618} y={rowY[i] + 4} textAnchor="middle" fontSize={10.5} fill="var(--color-ink)" fontWeight={700}>結果{t}</text>
          {i < rows.length - 1 && (
            <line x1={526} y1={rowY[i] + 20} x2={526} y2={rowY[i + 1] - 20} stroke="var(--color-ink)" strokeWidth={2} markerEnd="url(#rnn-arrow-ink)" />
          )}
        </g>
      ))}
      <defs>
        <marker id="rnn-arrow" markerWidth={7} markerHeight={7} refX={6} refY={3.5} orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--color-muted)" />
        </marker>
        <marker id="rnn-arrow-ink" markerWidth={7} markerHeight={7} refX={6} refY={3.5} orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--color-ink)" />
        </marker>
      </defs>
    </svg>
  )
}

export function RNN() {
  const [sentence, setSentence] = useState<string[]>(['不', '好吃'])
  const [pos, setPos] = useState(0) // 已經讀到第幾個字（0 = 還沒開始）
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const words = sentence.map(wordOf)

  // 重算目前狀態（讀完前 pos 個字）
  let state = INIT
  let lastNote = '按「讀下一個字 →」，一個字一個字讀進去。'
  for (let i = 0; i < pos; i++) {
    const res = stepRNN(state, words[i])
    state = res.next
    if (i === pos - 1) lastNote = res.note
  }
  const done = pos >= words.length && words.length > 0
  const verdict = state.score > 0 ? '正評 😊' : state.score < 0 ? '負評 😞' : '中立 😐'

  function reset() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
    setPos(0)
  }
  function stepOne() {
    setPos((p) => Math.min(words.length, p + 1))
  }
  function play() {
    if (timer.current) clearInterval(timer.current)
    setPos(0)
    setPlaying(true)
    let i = 0
    timer.current = window.setInterval(() => {
      i++
      setPos(i)
      if (i >= words.length) {
        clearInterval(timer.current!)
        timer.current = null
        setPlaying(false)
      }
    }, 900)
  }

  function addWord(text: string) {
    if (playing) return
    setSentence((s) => (s.length >= 7 ? s : [...s, text]))
    reset()
  }
  function loadPreset(p: string[]) {
    setSentence(p)
    reset()
  }
  function clearSentence() {
    setSentence([])
    reset()
  }

  // 印象分數條：-6 ~ +6
  const barPct = Math.max(0, Math.min(100, ((state.score + 6) / 12) * 100))

  return (
    <LessonLayout slug="rnn">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        看一則餐廳評論時，你是<b className="text-ink">一個字一個字讀</b>的，腦中一直維護著「目前感覺是好是壞」的<b className="text-brand">印象</b>。
        <b className="text-brand">RNN（循環神經網路）</b>就是這樣讀序列：每讀一個字，就用<b className="text-ink">同一套規則</b>更新一次腦中的記憶，
        再把記憶帶到下一個字。最妙的是——讀到<b className="text-ink">「不」</b>會改變後面字的意思，
        所以<b className="text-ink">順序很重要</b>：「不 好吃」跟「好吃」結果剛好相反。
      </div>

      <Section
        title="架構圖：一個「會自我循環」的神經網路"
        description="RNN 的正式定義畫成圖，就是左邊這樣——同一顆神經網路，輸出會繞回來當作下一次的輸入之一（那個自我迴圈的箭頭）。這個畫法比較抽象，把它「沿著時間攤開」，就變成右邊那串一直重複、彼此用箭頭相連的網路——每一步都是同一顆神經網路，只是吃進新的資料、也接收上一步傳來的記憶。下面的互動，就是你親手操作這串攤開的網路。"
      >
        <div className="overflow-x-auto rounded-xl border border-line bg-cream p-4">
          <UnrollDiagram />
        </div>
      </Section>

      <Section
        title="一個字一個字讀，看腦中的「印象」怎麼變"
        description="按「讀下一個字」，看每個字怎麼更新記憶。橘色的「不」會設一個翻轉記號、影響下一個情緒詞；藍色的「很／有點」會放大或縮小下一個字的感受。讀完看它判成正評還是負評。"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {/* 句子：畫成展開圖的樣子——每個字是一個時間步，箭頭代表記憶往後傳 */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-cream p-4">
              {words.length === 0 && <span className="text-sm text-muted">下面點詞卡，組一個句子…</span>}
              {words.map((w, i) => {
                const read = i < pos
                const current = i === pos - 1
                return (
                  <div key={i} className="flex items-center gap-1">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono text-[10px] text-muted">t={i + 1}</span>
                      <span
                        className="rounded-lg px-3 py-2 text-sm font-medium transition-all"
                        style={{
                          background: read ? kindColor(w.kind) : 'white',
                          color: read ? 'white' : 'var(--color-muted)',
                          outline: current ? '3px solid var(--color-ink)' : '1px solid var(--color-line)',
                          opacity: read ? 1 : 0.7,
                        }}
                      >
                        {w.text}
                      </span>
                    </div>
                    {i < words.length - 1 && (
                      <span className="mb-4 text-sm" style={{ color: read ? 'var(--color-ink)' : 'var(--color-line)' }}>→</span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-1 text-xs text-muted">每個字都是攤開圖裡的一步（t=1,2,3…），箭頭 → 就是記憶（隱藏狀態）往下一步傳遞。</p>

            {/* 記憶狀態 */}
            <div className="mt-4 rounded-xl border border-line p-4">
              <div className="text-sm font-medium text-ink">🧠 目前的印象（記憶／隱藏狀態）</div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>負評</span><span>中立</span><span>正評</span>
                </div>
                <div className="relative h-4 overflow-hidden rounded-full bg-cream">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
                  <div
                    className="absolute inset-y-0 rounded-full transition-all duration-500"
                    style={{
                      left: state.score >= 0 ? '50%' : `${barPct}%`,
                      width: `${Math.abs(barPct - 50)}%`,
                      background: state.score >= 0 ? 'var(--color-brand)' : 'var(--color-red)',
                    }}
                  />
                </div>
                <div className="mt-1 text-right font-mono text-sm font-semibold text-ink">印象分數 {state.score > 0 ? '+' : ''}{state.score}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {state.pendingNeg && <span className="rounded-full bg-orange/15 px-2 py-0.5 text-orange">記憶：下一個詞要翻轉 🔄</span>}
                {state.pendingAmp !== 1 && <span className="rounded-full bg-brand-pale/40 px-2 py-0.5 text-brand">記憶：下一個詞 ×{state.pendingAmp}</span>}
              </div>
              <div className="mt-3 rounded-lg bg-cream p-3 text-sm leading-relaxed text-muted">{lastNote}</div>
            </div>

            {done && (
              <div className="mt-3 rounded-xl border border-lime bg-lime/10 p-3 text-sm text-ink">
                讀完整句！最終判斷：<b>{verdict}</b>（印象分數 {state.score > 0 ? '+' : ''}{state.score}）
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={stepOne} disabled={playing || done}>讀下一個字 →</Button>
              <Button variant="outline" onClick={play} disabled={playing || words.length === 0}>▶ 自動讀完</Button>
              <Button variant="ghost" onClick={reset} disabled={playing}>⏮ 重讀</Button>
            </div>
          </div>

          {/* 詞卡 */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-1.5 text-sm font-medium text-muted">點詞卡加進句子（最多 7 個）</div>
              <div className="flex flex-wrap gap-2">
                {BANK.map((w) => (
                  <button
                    key={w.text}
                    onClick={() => addWord(w.text)}
                    className="rounded-lg border px-3 py-1.5 text-sm transition-colors"
                    style={{ borderColor: kindColor(w.kind), color: kindColor(w.kind) }}
                  >
                    + {w.text}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-brand)' }} />情緒詞</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-orange)' }} />否定詞</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-brand-soft)' }} />強調詞</span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-sm font-medium text-muted">或試試這些句子：</div>
              <div className="flex flex-col gap-1.5">
                {[['很', '好吃'], ['不', '好吃'], ['不', '難吃'], ['很', '難吃']].map((p, i) => (
                  <button key={i} onClick={() => loadPreset(p)} className="rounded-lg border border-line px-3 py-1.5 text-left text-sm text-muted transition-colors hover:border-brand-soft">
                    「{p.join(' ')}」
                  </button>
                ))}
                <button onClick={clearSentence} className="rounded-lg border border-line px-3 py-1.5 text-left text-sm text-muted transition-colors hover:border-brand-soft">
                  清空重組
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">試試「不 好吃」跟「好吃 不」（把不放後面）：</b>{' '}
        同樣兩個字，順序不同，機器讀出來的意思完全不一樣——這就是 RNN 的精髓：
        <b className="text-ink">記憶會沿著時間往後傳，前面讀到的東西會改變後面的理解</b>。
        也因為每一步都用<b className="text-ink">同一套規則</b>（同一顆神經元反覆用），再長的句子都處理得了。
        但這也埋了一個問題：如果重要的字出現在很前面、要記很久，記憶會慢慢被後面的字<b className="text-ink">沖淡、忘掉</b>——
        這正是下一課 <b className="text-brand">LSTM</b> 要解決的事。
      </div>
    </LessonLayout>
  )
}
