import { useEffect, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'

// 情境：LLM 本質上只會「預測下一個字」，不會真的算數學、查不到即時資訊、看不到你的私人資料。
// 就像一個超博學、但身上沒有手機和計算機的人——你問他即時或精算的問題，他只能用猜的。
// 「工具調用（Tool Use / Function Calling）」＝ 給 AI 一組工具，讓它自己判斷何時該呼叫、
// 拿到結果再回答。API／MCP／Skill 則是「工具怎麼接上 AI」的不同標準。

interface QA {
  q: string
  tool: string
  call: string
  result: string
  noTool: string // 沒工具時 AI 的（不可靠）回答
  withTool: string // 用工具結果後的正確回答
}
const QAS: QA[] = [
  {
    q: '37 × 48 等於多少？',
    tool: '🧮 計算機',
    call: '計算機(37, 48)',
    result: '1776',
    noTool: '嗯……大概 1800 左右吧？（AI 是用「猜字」的，大數乘法常算錯）',
    withTool: '37 × 48 = 1776。',
  },
  {
    q: '台北現在在下雨嗎？',
    tool: '🔍 網路搜尋',
    call: '搜尋("台北 即時天氣")',
    result: '台北 目前 陰、22°C、未降雨',
    noTool: '我沒辦法查即時天氣……應該沒下雨吧？（AI 沒有即時資訊，只能瞎猜）',
    withTool: '根據即時資料，台北目前沒有下雨，天氣陰、約 22°C。',
  },
  {
    q: '我的珍奶禮盒訂單到哪了？',
    tool: '📦 訂單資料庫',
    call: '查訂單(會員 = 你)',
    result: '訂單 #8891 昨天已出貨，明天送達',
    noTool: '我看不到你的訂單資料，幫不上忙。（你的私人資料不在 AI 腦中）',
    withTool: '您的訂單 #8891 昨天已出貨，預計明天送達 🚚。',
  },
]

const STEP_LABELS = ['🤔 判斷：這題我自己答不準，需要工具', '📞 呼叫工具', '📦 工具回傳結果', '💬 用結果回答']

export function ToolUse() {
  const [idx, setIdx] = useState(0)
  const [step, setStep] = useState(0) // 有工具那側，已揭露到第幾步
  const timer = useRef<number | null>(null)
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const qa = QAS[idx]

  function pick(i: number) {
    if (timer.current) clearInterval(timer.current)
    setIdx(i)
    setStep(0)
  }
  function run() {
    if (timer.current) clearInterval(timer.current)
    setStep(0)
    let s = 0
    timer.current = window.setInterval(() => {
      s++
      setStep(s)
      if (s >= 4) { clearInterval(timer.current!); timer.current = null }
    }, 650)
  }

  const stepContent = [
    STEP_LABELS[0],
    `${STEP_LABELS[1]}：${qa.call}`,
    `${STEP_LABELS[2]}：${qa.result}`,
    `${STEP_LABELS[3]}：${qa.withTool}`,
  ]

  return (
    <LessonLayout slug="tool-use">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        LLM 骨子裡只會做一件事——<b className="text-ink">預測下一個字</b>。所以它<b className="text-ink">不會真的算數學、
        查不到即時天氣、也看不到你的私人資料</b>。就像一個超博學、但身上沒手機沒計算機的人，
        遇到要精算或現查的問題，只能用猜的。解法是給它<b className="text-brand">工具</b>：
        AI 自己判斷「這題我得呼叫工具」，拿到結果再回答——這就叫<b className="text-brand">工具調用（Tool Use）</b>。
      </div>

      <Section
        title="選一個問題，比較「沒工具」和「有工具」的 AI"
        description="這三個問題都是 AI 光靠腦袋答不好的。左邊是沒工具的 AI（只能猜），右邊按下按鈕，看有工具的 AI 怎麼一步步呼叫工具、拿到結果再回答。"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {QAS.map((item, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${i === idx ? 'border-brand bg-brand/10 font-medium text-brand' : 'border-line text-muted hover:border-brand-soft'}`}
            >
              {item.q}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* 沒工具 */}
          <div className="rounded-xl border-2 border-line p-4">
            <div className="text-sm font-medium text-muted">🚫 沒工具的 AI</div>
            <p className="mt-2 text-sm leading-relaxed text-red">{qa.noTool}</p>
          </div>

          {/* 有工具 */}
          <div className="rounded-xl border-2 p-4" style={{ borderColor: step >= 4 ? 'var(--color-lime)' : 'var(--color-brand)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">🛠️ 有工具的 AI（可用 {qa.tool}）</span>
            </div>
            <ol className="mt-2 space-y-1.5">
              {stepContent.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed transition-opacity"
                  style={{ opacity: step > i ? 1 : 0.2 }}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step > i ? 'bg-brand text-white' : 'bg-cream text-muted'}`}>{i + 1}</span>
                  <span className={i === 3 && step > 3 ? 'font-medium text-ink' : 'text-muted'}>{s}</span>
                </li>
              ))}
            </ol>
            {step < 4 && (
              <Button className="mt-3" onClick={run}>▶ 讓 AI 動作</Button>
            )}
            {step >= 4 && (
              <p className="mt-3 text-xs text-muted">✅ 注意流程：<b className="text-ink">AI 自己決定要不要呼叫工具</b>、要帶什麼參數，拿到結果才回答——它沒有硬記答案，而是「現查」。</p>
            )}
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">那「工具」是怎麼接上 AI 的？你常聽到的三個名詞：</b>
        <ul className="mt-2 space-y-2">
          <li>· <b className="text-ink">API</b>——工具對外的「插座規格」。像天氣 API、地圖 API，規定好「怎麼呼叫、要帶什麼、會回什麼」，程式就能取用某個服務。</li>
          <li>· <b className="text-ink">MCP（Model Context Protocol）</b>——一種「<b className="text-ink">統一插座</b>」標準（Anthropic 2024 提出）。讓 AI 用同一種方式接上各式各樣的工具和資料源，不必為每個工具客製一次。</li>
          <li>· <b className="text-ink">Skill</b>——把「怎麼用某個工具、怎麼完成某件事」的一整套知識<b className="text-ink">打包好</b>，讓 AI 隨插即用（你現在用的這套系統就有 Skill）。</li>
        </ul>
        <p className="mt-3">
          一句話：<b className="text-ink">工具讓 AI 從「只會講」變成「能查、能算、能動手」</b>。
          但一個問題常常不是呼叫一次工具就能解決——需要<b className="text-ink">查了再想、想了再做、做完再查</b>，
          一步步推進。當 AI 開始這樣自己跑一連串步驟去達成目標，它就升級成了<b className="text-brand">AI 代理</b>——下一課的主角。
        </p>
      </div>
    </LessonLayout>
  )
}
