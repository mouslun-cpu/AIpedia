import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'

// 情境：你請 AI 幫珍奶店寫一則「颱風天店休公告」。
// AI 很聰明，但完全照你講的辦事——你交代得含糊，它就給你含糊的東西；
// 把「角色、目標、格式、範例、限制、先想再寫」講清楚，成品天差地別。
// 這一課讓學生一個個打開這些「提示技巧」，親眼看回覆從 😐 變 🤩。

interface Technique {
  key: string
  name: string
  promptLine: string // 打開後會加進 prompt 的那一行
  effect: string // 這一招修好了什麼
}
const TECHNIQUES: Technique[] = [
  { key: 'role', name: '🎭 給 AI 一個角色', promptLine: '你是珍奶店裡那個很會寫貼文的親切小編。', effect: '語氣從冷冰冰變親切' },
  { key: 'goal', name: '🎯 講清楚目標和對象', promptLine: '目的是讓熟客安心：說明原因、什麼時候恢復，並附一個小補償。', effect: 'AI 知道重點該放什麼' },
  { key: 'format', name: '📐 指定格式', promptLine: '請用 emoji 開頭、分「原因／恢復營業／小補償」三段，簡短好讀。', effect: '排版清楚、長度剛好' },
  { key: 'example', name: '📎 給一個範例', promptLine: '風格參考：「☔ 雨太大先休一天，雨過天晴再相見～」', effect: '風格跟你的範例對齊（few-shot）' },
  { key: 'constraint', name: '🚧 加上限制', promptLine: '不要太官腔、不要提退費。', effect: '避開你不想要的雷' },
  { key: 'think', name: '🧠 要它先想再寫', promptLine: '先列出這則公告該有的要點，再組成完整貼文。', effect: '複雜任務先規劃，成品更完整' },
]

const TIERS = [
  { min: 0, face: '😐', label: '很陽春', color: 'var(--color-muted)' },
  { min: 2, face: '🙂', label: '普通', color: 'var(--color-brand-soft)' },
  { min: 4, face: '😃', label: '不錯', color: 'var(--color-brand)' },
  { min: 6, face: '🤩', label: '很到位', color: 'var(--color-lime)' },
]

// 依照打開了哪些技巧，「生成」出對應品質的公告（這是手排的示範，不是真的呼叫模型）
function buildOutput(active: Set<string>) {
  const has = (k: string) => active.has(k)
  const think = has('think')
    ? ['停業原因＝颱風、夥伴安全', '什麼時候恢復營業', '給熟客一個小補償']
    : null

  const lines: { t: string; bad?: boolean }[] = []
  if (has('role')) lines.push({ t: '各位珍奶控 💛' })
  if (!has('goal')) {
    lines.push({ t: '本店今日公休。' })
  } else {
    lines.push({ t: '颱風來襲，為了夥伴的安全，今天先休息一天。' })
    lines.push({ t: '明天一早恢復營業，珍奶照常送上！' })
    lines.push({ t: '小補償：明天出示這則貼文，第二杯半價 🧋' })
  }
  // 沒特別限制時，AI 會習慣性補一句官腔
  if (has('goal') && !has('constraint')) lines.push({ t: '造成不便敬請見諒，本公司保留最終解釋權。', bad: true })
  if (has('role')) lines.push({ t: '我們明天見！' })
  if (has('example')) lines.push({ t: '☔ 雨過天晴再相見～' })

  const title = has('format') ? '🌀 颱風天店休公告' : null
  return { think, title, lines, formatted: has('format') }
}

export function PromptEngineering() {
  const [active, setActive] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setActive((prev) => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  const count = active.size
  const tier = [...TIERS].reverse().find((t) => count >= t.min)!
  const out = buildOutput(active)
  const activeTechs = TECHNIQUES.filter((t) => active.has(t.key))

  return (
    <LessonLayout slug="prompt-engineering">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        LLM 就像一個<b className="text-ink">超聰明、但完全照字面辦事的外包</b>：
        你交代得含糊，它就回你含糊的東西；你把要求<b className="text-ink">講清楚</b>，成品立刻升級。
        「怎麼把話講清楚」這門功夫，就叫<b className="text-brand">提示工程（Prompt Engineering）</b>。
        下面請 AI 幫珍奶店寫一則<b className="text-ink">颱風天店休公告</b>——一個技巧一個技巧打開，看回覆怎麼從 😐 變 🤩。
      </div>

      <Section
        title="一個個打開技巧，看左邊 prompt 長大、右邊回覆變好"
        description="左邊是你正在組的 prompt（指令），右邊是 AI 依這個 prompt 生出的公告。一開始什麼都沒講，AI 只會給你一句乾巴巴的『本店今日公休』；把技巧加上去，它才會寫出你真正想要的東西。"
      >
        {/* 技巧開關 */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TECHNIQUES.map((t) => {
            const on = active.has(t.key)
            return (
              <button
                key={t.key}
                onClick={() => toggle(t.key)}
                className={`rounded-xl border-2 p-3 text-left transition-colors ${on ? 'border-brand bg-brand/5' : 'border-line hover:border-brand-soft'}`}
              >
                <div className={`text-sm font-medium ${on ? 'text-brand' : 'text-ink'}`}>{on ? '✓ ' : '+ '}{t.name}</div>
                <div className="mt-0.5 text-xs text-muted">{on ? `效果：${t.effect}` : '點一下加進 prompt'}</div>
              </button>
            )
          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* 組出來的 prompt */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">📝 你組出來的 prompt</div>
            <div className="rounded-xl border border-line bg-cream p-4 text-sm leading-relaxed text-ink">
              <p className="text-muted">幫我寫一則珍奶店的颱風天店休公告。</p>
              {activeTechs.length === 0 ? (
                <p className="mt-2 text-xs italic text-muted">（就這樣，其他什麼都沒交代……）</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {activeTechs.map((t) => (
                    <li key={t.key} className="flex gap-1.5">
                      <span className="text-brand">•</span><span>{t.promptLine}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* AI 生出來的回覆 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-muted">💬 AI 生出的公告</span>
              <span className="flex items-center gap-1.5 text-sm">
                <span className="text-lg">{tier.face}</span>
                <span className="font-medium" style={{ color: tier.color }}>{tier.label}</span>
              </span>
            </div>
            <div className="rounded-xl border-2 p-4 text-sm leading-relaxed" style={{ borderColor: tier.color }}>
              {out.think && (
                <div className="mb-3 rounded-lg bg-cream p-2.5 text-xs text-muted">
                  💭 <b className="text-ink">AI 先想了一下</b>，列出要點：{out.think.join('、')}
                </div>
              )}
              {out.formatted ? (
                <div>
                  {out.title && <div className="mb-1.5 font-semibold text-ink">{out.title}</div>}
                  {out.lines.map((l, i) => (
                    <div key={i} className={l.bad ? 'text-red line-through decoration-red/50' : 'text-ink'}>{l.t}</div>
                  ))}
                </div>
              ) : (
                <p className="text-ink">
                  {out.lines.map((l, i) => (
                    <span key={i} className={l.bad ? 'text-red line-through decoration-red/50' : ''}>{l.t}{i < out.lines.length - 1 ? ' ' : ''}</span>
                  ))}
                </p>
              )}
            </div>
            {/* 品質條 */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted">清晰度</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(count / 6) * 100}%`, background: tier.color }} />
              </div>
              <span className="font-mono text-xs text-muted">{count} / 6</span>
            </div>
          </div>
        </div>

        {active.has('constraint') === false && active.has('goal') && (
          <p className="mt-3 text-xs text-muted">💡 看到那句被劃掉的官腔了嗎？打開「🚧 加上限制」，AI 就不會自作主張補上它。</p>
        )}
        {count === 6 && (
          <div className="mt-4 rounded-xl border border-lime bg-lime/10 p-4 text-sm leading-relaxed text-ink">
            🎉 六個技巧全開——同樣一句「幫我寫店休公告」，因為你<b>把角色、目標、格式、範例、限制、思路都交代清楚</b>，
            AI 給的東西完全不一樣了。這就是提示工程的核心：<b>模型的能力是固定的，但你能靠「怎麼問」把它的表現拉滿。</b>
          </div>
        )}
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">提示工程的幾個萬用心法：</b>
        <ul className="mt-2 space-y-1.5">
          <li>· <b className="text-ink">給角色與目標</b>——先讓它知道「你是誰、要達成什麼」，它才抓得到重點。</li>
          <li>· <b className="text-ink">給格式與範例</b>——與其事後嫌它寫不好，不如一開始就示範你要的樣子（這招叫 few-shot）。</li>
          <li>· <b className="text-ink">講清楚不要什麼</b>——限制跟要求一樣重要，能幫你避開雷。</li>
          <li>· <b className="text-ink">複雜任務叫它「先想再答」</b>——讓它先列步驟或要點，成品會更完整（chain-of-thought）。</li>
        </ul>
        <p className="mt-3">
          但提示工程有個天花板：你能塞進去的字有限，而且每次都要重講。
          當任務需要<b className="text-ink">大量背景資料、記住之前的對話、或臨時查外部資訊</b>時，
          光靠「把話講清楚」就不夠了——這就要進到下一步：<b className="text-brand">脈絡工程</b>，
          學會管理 AI 那塊有限的「工作記憶」。
        </p>
      </div>
    </LessonLayout>
  )
}
