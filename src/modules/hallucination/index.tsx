import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { SegmentedControl } from '../../components/ui/SegmentedControl'

interface Case {
  id: string
  label: string
  question: string
  candidates: { text: string; p: number }[]
  finalAnswer: string
  isFictional: boolean
}

// 案例 A：域內、常見知識——模型看過無數次「台灣首都」相關的文字，內部機率非常集中。
// 案例 B：問一個「虛構人物」——模型從沒見過這個人，但候選答案的機率幾乎打平，
// 卻依然會挑一個講得跟真的一樣。
const CASES: Case[] = [
  {
    id: 'known',
    label: '域內問題（模型很熟）',
    question: '台灣的首都是哪裡？',
    candidates: [
      { text: '台北', p: 0.92 }, { text: '高雄', p: 0.03 },
      { text: '台中', p: 0.02 }, { text: '新竹', p: 0.02 }, { text: '花蓮', p: 0.01 },
    ],
    finalAnswer: '台灣的首都是台北。',
    isFictional: false,
  },
  {
    id: 'unknown',
    label: '域外問題（虛構人物）',
    question: '陳大同在 2019 年獲得了什麼文學獎？（陳大同並不存在）',
    candidates: [
      { text: '諾貝爾文學獎', p: 0.24 }, { text: '金鼎獎', p: 0.22 },
      { text: '台灣文學獎', p: 0.21 }, { text: '聯合報文學獎', p: 0.19 }, { text: '時報文學獎', p: 0.14 },
    ],
    finalAnswer: '陳大同在 2019 年獲得了諾貝爾文學獎。',
    isFictional: true,
  },
]

function entropy(probs: number[]) {
  return -probs.reduce((s, p) => (p > 0 ? s + p * Math.log2(p) : s), 0)
}
const MAX_ENTROPY = Math.log2(5) // 5 個候選字全部等機率時的最大不確定度

export function Hallucination() {
  const [caseId, setCaseId] = useState(CASES[0].id)
  const cur = CASES.find((c) => c.id === caseId)!
  const h = entropy(cur.candidates.map((c) => c.p))
  const uncertainty = h / MAX_ENTROPY

  return (
    <LessonLayout slug="hallucination">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        語言模型有時會<b className="text-ink">一本正經地說錯話</b>——這叫<b className="text-brand">幻覺（hallucination）</b>。
        關鍵洞察是：模型內部其實「知道」自己不確定，
        但<b className="text-ink">生成出來的文字語氣完全不會透露這件事</b>。
      </div>

      <Section
        title="切換兩種情境，看內部機率分布的差別"
        description="無論模型有把握還是在瞎猜，最後都要選一個字生成——過程完全一樣，只是候選字的機率分布差很多。"
      >
        <SegmentedControl
          fill
          value={caseId}
          onChange={setCaseId}
          segments={CASES.map((c) => ({ value: c.id, label: c.label }))}
        />

        <div className="mt-4 rounded-xl bg-cream p-4">
          <div className="text-xs text-muted">問題</div>
          <div className="mt-1 font-medium text-ink">{cur.question}</div>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-medium text-muted">模型內部的候選答案機率</div>
            <div className="flex flex-col gap-2">
              {cur.candidates.map((c) => (
                <div key={c.text} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-ink">{c.text}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${c.p * 100}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-xs text-muted">{(c.p * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-line p-3">
              <div className="text-xs text-muted">內部不確定度（熵）</div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${uncertainty * 100}%`, background: uncertainty > 0.6 ? 'var(--color-red)' : 'var(--color-lime)' }}
                />
              </div>
              <div className="mt-1 text-right font-mono text-xs text-muted">{(uncertainty * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-muted">最終生成出來的句子</div>
            <div className="rounded-2xl border border-line bg-white p-4 text-lg text-ink shadow-sm">
              {cur.finalAnswer}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {cur.isFictional ? (
                <>注意：這句話<b className="text-red">語氣跟左邊那個「很有把握」的答案一模一樣</b>——
                完全看不出內部其實在 5 個差不多的選項裡「勉強」選了一個。</>
              ) : (
                <>這個案例裡，模型內部信心確實很高，剛好答案也是對的。</>
              )}
            </p>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">為什麼這麼難防？</b>{' '}
        語言模型的訓練目標是「把話講得流暢」，不是「誠實回報自己有多確定」。
        就算內部機率一片混亂（幾個候選字幾乎打平），生成機制還是會挑一個出來，
        用<b className="text-ink">跟平常一樣流暢自信的語氣</b>講出來。
        這也是為什麼<b className="text-brand">上一課的 RAG</b>這麼重要——
        與其讓模型憑內部模糊的印象瞎猜，不如讓它有真實文件可以依靠。
      </div>
    </LessonLayout>
  )
}
