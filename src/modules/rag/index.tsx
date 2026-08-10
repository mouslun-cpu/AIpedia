import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { SegmentedControl } from '../../components/ui/SegmentedControl'

// 刻意用一個「虛構產品」——這樣任何語言模型都不可能真的學過這些事實，
// 才能誠實地示範「沒有 RAG 只能憑空亂猜」這件事，而不是模型剛好背過答案。
interface Doc { id: string; text: string; keywords: string[] }
const KB: Doc[] = [
  { id: 'd1', text: '小智鬧鐘 X3 的電池續航力是 45 天（一次充電）。', keywords: ['電池', '續航', '充電'] },
  { id: 'd2', text: '小智鬧鐘 X3 支援防水等級 IPX7，可承受短暫浸泡。', keywords: ['防水', 'IPX7', '浸泡'] },
  { id: 'd3', text: '小智鬧鐘 X3 於 2026 年 3 月上市，建議售價 1280 元。', keywords: ['上市', '價格', '售價', '2026'] },
  { id: 'd4', text: '小智鬧鐘 X3 的原廠保固期限為兩年。', keywords: ['保固', '兩年'] },
  { id: 'd5', text: '（不相關文件）小智檯燈 L1 支援三段亮度調整。', keywords: ['檯燈', '亮度'] },
]

interface Question {
  id: string
  q: string
  keywords: string[]
  wrongAnswer: string
  correctFromDoc: string
}
const QUESTIONS: Question[] = [
  { id: 'q1', q: '小智鬧鐘 X3 的電池可以用多久？', keywords: ['電池', '續航'], wrongAnswer: '根據我的一般知識，這類智慧鬧鐘的電池續航通常約 7～14 天左右。', correctFromDoc: 'd1' },
  { id: 'q2', q: '小智鬧鐘 X3 的保固期限是多久？', keywords: ['保固'], wrongAnswer: '一般電子產品常見保固為一年，這款應該也差不多是一年。', correctFromDoc: 'd4' },
  { id: 'q3', q: '小智鬧鐘 X3 什麼時候上市、賣多少錢？', keywords: ['上市', '價格', '售價'], wrongAnswer: '我不確定確切上市時間，價格可能落在 1500～2000 元左右。', correctFromDoc: 'd3' },
]

function score(doc: Doc, kws: string[]) {
  return doc.keywords.filter((k) => kws.includes(k)).length
}

export function RAG() {
  const [qId, setQId] = useState(QUESTIONS[0].id)
  const [useRag, setUseRag] = useState(false)
  const question = QUESTIONS.find((q) => q.id === qId)!

  const scored = KB.map((d) => ({ doc: d, s: score(d, question.keywords) })).sort((a, b) => b.s - a.s)
  const bestDoc = scored[0].doc

  return (
    <LessonLayout slug="rag">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        語言模型的知識全部來自訓練資料，遇到<b className="text-ink">訓練時沒看過的事</b>
        （新產品、私有文件、公司內部資料……）就只能用「聽起來合理」的方式亂猜。
        <b className="text-brand">RAG（檢索增強生成）</b>的解法是：回答前先<b className="text-ink">去資料庫查一下</b>，
        找到相關文件，再照著文件內容作答。
      </div>

      <Section
        title="小智鬧鐘 X3 是一款虛構產品——任何模型都不可能「背過」它的規格"
        description="下面是關於它的一份小型知識庫。選一個問題，切換有無 RAG，看答案差在哪。"
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {KB.map((d) => {
            const isHit = useRag && d.id === bestDoc.id
            return (
              <div
                key={d.id}
                className={`rounded-xl border p-3 text-sm transition-colors ${
                  isHit ? 'border-brand bg-brand/10 text-ink' : 'border-line text-muted'
                }`}
              >
                {isHit && <span className="mr-1.5 text-xs font-semibold text-brand">🔍 命中</span>}
                {d.text}
              </div>
            )
          })}
        </div>

        <SegmentedControl
          fill
          value={qId}
          onChange={setQId}
          segments={QUESTIONS.map((q) => ({ value: q.id, label: q.q.length > 12 ? q.q.slice(0, 12) + '…' : q.q }))}
        />

        <div className="mt-4 rounded-xl bg-cream p-4">
          <div className="text-sm text-muted">提問：</div>
          <div className="mt-1 font-medium text-ink">{question.q}</div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
          套用 RAG（先檢索再回答）
        </label>

        <div
          className="mt-3 rounded-xl border p-4 text-sm leading-relaxed"
          style={{
            borderColor: useRag ? 'var(--color-lime)' : 'var(--color-coral)',
            background: useRag ? 'color-mix(in srgb, var(--color-lime) 12%, white)' : 'color-mix(in srgb, var(--color-coral) 12%, white)',
            color: 'var(--color-ink)',
          }}
        >
          {useRag ? (
            <p>✅ <b>檢索到相關文件後回答：</b>{bestDoc.text}</p>
          ) : (
            <p>⚠️ <b>沒有檢索，模型只能憑訓練時的一般知識亂猜：</b>{question.wrongAnswer}</p>
          )}
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">兩個答案都寫得很流暢、很有自信</b>——
        這正是 RAG 要解決的痛點：模型不管知不知道答案，語氣都一樣篤定。
        RAG 讓回答<b className="text-brand">有憑有據</b>，而不是純粹依賴訓練時記住的模糊印象，
        這也是企業導入 AI 客服、內部知識庫問答時<b className="text-ink">幾乎必用</b>的技術。
      </div>
    </LessonLayout>
  )
}
