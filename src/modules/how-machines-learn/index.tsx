import { useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SupervisedDemo } from './SupervisedDemo'
import { UnsupervisedDemo } from './UnsupervisedDemo'
import { ReinforcementDemo } from './ReinforcementDemo'

type Paradigm = 'supervised' | 'unsupervised' | 'reinforcement'

const INTRO: Record<Paradigm, { title: string; desc: string }> = {
  supervised: {
    title: '監督式學習：照著歷屆考卷學',
    desc: '給機器一堆「已經知道結果」的例子（像歷屆學長姐的讀書時數和考試成績），讓它從中找出規律，之後用來預測新同學的表現。',
  },
  unsupervised: {
    title: '非監督式學習：自己幫全班分組',
    desc: '資料完全沒有標準答案，機器要自己發現「哪些同學特質相近」，把全班自動分成幾個小組。',
  },
  reinforcement: {
    title: '強化學習：湯姆貓與傑利鼠的試錯之路',
    desc: '沒有標準答案，只有做得好給獎勵、做不好給懲罰。透過一次次嘗試，傑利鼠摸索出躲開湯姆貓、吃到起司的最佳路線。',
  },
}

export function HowMachinesLearn() {
  const [tab, setTab] = useState<Paradigm>('supervised')
  const intro = INTRO[tab]

  return (
    <LessonLayout slug="how-machines-learn">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        我們常說「機器會學習」，但它到底怎麼學？用生活中的例子來理解最直覺：
        機器可以像學生<b className="text-ink">照著歷屆考卷練習</b>、
        像老師<b className="text-ink">自動幫全班分組</b>、
        也可以像<b className="text-ink">傑利鼠躲貓找起司</b>一樣靠不斷試錯找出最佳路線——
        這正是<b className="text-ink">三種學習方式</b>的差別：學習時手上有沒有「答案」。
        下面各挑一個切換，親手玩玩看它們的不同。
      </div>

      <div className="mt-6">
        <SegmentedControl
          fill
          value={tab}
          onChange={setTab}
          segments={[
            { value: 'supervised', label: '監督式', icon: '🎯' },
            { value: 'unsupervised', label: '非監督式', icon: '🔍' },
            { value: 'reinforcement', label: '強化學習', icon: '🎮' },
          ]}
        />
      </div>

      <Section title={intro.title} description={intro.desc}>
        {tab === 'supervised' && <SupervisedDemo />}
        {tab === 'unsupervised' && <UnsupervisedDemo />}
        {tab === 'reinforcement' && <ReinforcementDemo />}
      </Section>

      <div className="mt-10 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5">
        <h3 className="font-semibold text-ink">一句話記住三者的差別</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <b className="text-brand">🎯 監督式</b>：有歷屆考卷也有標準答案 →
            學會後去預測新同學的表現。
          </li>
          <li>
            <b className="text-brand">🔍 非監督式</b>：只有同學資料沒有分組答案 →
            自己把特質相近的歸成一組。
          </li>
          <li>
            <b className="text-brand">🎮 強化學習</b>：沒有標準答案只有得失分 →
            像傑利鼠躲貓一樣，靠試錯找出拿最高分的路線。
          </li>
        </ul>
      </div>
    </LessonLayout>
  )
}
