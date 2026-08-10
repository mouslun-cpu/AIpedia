import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'

// 情境：AI 的「工作記憶」（context window）就像一塊小桌子，空間有限。
// 你放什麼上去，它才知道什麼——但桌子塞爆了，最重要的東西會被擠掉。
// 脈絡工程 = 在有限的桌面上，只擺「對的資料」，而不是把所有東西都倒上去。
// 情境任務：客服 AI 要回答「我上週訂的珍奶禮盒到哪了？」

const CAP = 100 // 桌面容量（把 token 抽象成「格」）

interface Block {
  key: string
  name: string
  size: number
  essential: boolean // 回答這題真正需要的
  note: string
}
const BLOCKS: Block[] = [
  { key: 'system', name: '🧭 系統指令：你是親切的訂單客服', size: 12, essential: false, note: '決定 AI 的語氣與角色' },
  { key: 'question', name: '❓ 客人的問題：珍奶禮盒訂單到哪了？', size: 12, essential: true, note: '不放它，AI 根本不知道要答什麼' },
  { key: 'record', name: '📦 這位客人的訂單紀錄', size: 24, essential: true, note: '答案就藏在這裡（檢索來的關鍵資料）' },
  { key: 'handbook', name: '📖 整本 100 頁員工手冊', size: 72, essential: false, note: '很大，但跟這題幾乎無關' },
  { key: 'chat', name: '💬 過去三個月的閒聊紀錄', size: 55, essential: false, note: '佔位置，對這題沒幫助' },
  { key: 'catalog', name: '🛒 全店 500 樣商品目錄', size: 60, essential: false, note: '龐大又離題' },
]

export function ContextEngineering() {
  const [active, setActive] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setActive((prev) => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  const used = BLOCKS.filter((b) => active.has(b.key)).reduce((s, b) => s + b.size, 0)
  const over = used > CAP
  const has = (k: string) => active.has(k)

  // 依桌面內容決定 AI 的回答
  let face = '😐'
  let tierColor = 'var(--color-muted)'
  let answer = '（工作記憶空空的，AI 完全不知道背景，也答不出來。）'
  if (active.size > 0) {
    if (over) {
      face = '😵'; tierColor = 'var(--color-red)'
      answer = '桌面塞爆了！最重要的資訊被擠出視窗，AI 連你剛剛問什麼都想不起來……'
    } else if (!has('question')) {
      face = '🤔'; tierColor = 'var(--color-brand-soft)'
      answer = '你還沒把「問題」放上桌，AI 不知道你想問什麼。'
    } else if (!has('record')) {
      face = '😅'; tierColor = 'var(--color-amber)'
      answer = '我查不到你的訂單資料耶——AI 只知道桌上有的東西，沒放訂單紀錄它就無從查起。'
    } else if (!has('system')) {
      face = '🙂'; tierColor = 'var(--color-brand-soft)'
      answer = '出貨了，明天到。（答對了，但沒放系統指令，語氣有點冷。）'
    } else {
      face = '🤩'; tierColor = 'var(--color-lime)'
      answer = '您好～您的珍奶禮盒昨天已出貨，預計明天下午送達 🚚 需要幫您追蹤物流嗎？'
    }
  }

  // 有放進龐大又離題的東西、但還沒爆 → 提醒浪費空間
  const noiseIn = BLOCKS.filter((b) => active.has(b.key) && !b.essential && b.key !== 'system' && b.size >= 40)
  const wasteHint = !over && noiseIn.length > 0

  return (
    <LessonLayout slug="context-engineering">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        上一課學會「把話講清楚」，但還有個殘酷的事實：AI 的<b className="text-ink">工作記憶（context window）</b>
        就像<b className="text-ink">一塊小桌子</b>，空間有限。它<b className="text-ink">只知道你放上桌的東西</b>，
        而且<b className="text-ink">桌子塞爆了，最重要的資料會被擠掉</b>。
        「在有限桌面上只擺對的資料」這門功夫，就叫<b className="text-brand">脈絡工程（Context Engineering）</b>。
        任務：讓客服 AI 回答「<b className="text-ink">我上週訂的珍奶禮盒到哪了？</b>」——你來決定桌上放什麼。
      </div>

      <Section
        title="把資料放上 AI 的工作桌，看它答得好不好"
        description="下面每一塊都是可以放進工作記憶的資料，右邊數字是它佔的空間。點它加到桌上、再點一次拿掉。注意上方的容量條——塞太多會爆，關鍵資料就被擠掉了。"
      >
        {/* 容量條 */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-ink">🪟 工作記憶容量</span>
            <span className="font-mono" style={{ color: over ? 'var(--color-red)' : 'var(--color-muted)' }}>
              {used} / {CAP} {over && '⚠️ 爆了！'}
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (used / CAP) * 100)}%`, background: over ? 'var(--color-red)' : 'var(--color-brand)' }}
            />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* 資料塊 */}
          <div className="flex flex-col gap-2">
            {BLOCKS.map((b) => {
              const on = active.has(b.key)
              return (
                <button
                  key={b.key}
                  onClick={() => toggle(b.key)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${on ? 'border-brand bg-brand/5' : 'border-line hover:border-brand-soft'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${on ? 'text-brand' : 'text-ink'}`}>{on ? '✓ ' : '+ '}{b.name}</span>
                    <span className="shrink-0 rounded-full bg-cream px-2 py-0.5 font-mono text-xs text-muted">{b.size} 格</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{b.essential && <b className="text-brand">必要 · </b>}{b.note}</div>
                </button>
              )
            })}
          </div>

          {/* AI 回答 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-muted">💬 AI 的回答</span>
              <span className="text-xl">{face}</span>
            </div>
            <div className="rounded-xl border-2 p-4 text-sm leading-relaxed text-ink" style={{ borderColor: tierColor }}>
              {answer}
            </div>
            {wasteHint && (
              <p className="mt-2 text-xs text-muted">
                💡 你放的「{noiseIn.map((b) => b.name.replace(/^\S+\s/, '')).join('、')}」佔了一堆空間卻幫不上這題——
                這些格子本來能留給更有用的資料。<b className="text-ink">脈絡不是塞越多越好，是塞越準越好。</b>
              </p>
            )}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">試著走一遍：</b>{' '}
        只放「系統指令＋問題＋訂單紀錄」——AI 精準又親切地回答 🤩。
        再手癢「保險起見」把員工手冊、商品目錄全倒上桌 → <b className="text-ink">桌面爆掉</b>，AI 反而忘了你問什麼 😵。
        <p className="mt-3">
          這就是脈絡工程的核心：<b className="text-ink">工作記憶是稀缺資源</b>。真實系統裡，
          「該檢索哪幾份文件、要保留多少對話歷史、工具回傳的一大坨結果要不要精簡」——
          全都是在這塊有限桌面上做的取捨。提示工程管「怎麼問」，脈絡工程管「桌上擺什麼」。
          下一課再看看：當 AI 需要<b className="text-brand">現算、現查</b>桌上沒有的東西時，該怎麼辦——給它<b className="text-brand">工具</b>。
        </p>
      </div>
    </LessonLayout>
  )
}
