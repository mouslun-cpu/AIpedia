import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Challenge } from '../../components/Challenge'
import { Slider } from '../../components/ui/Slider'
import { buildCatTree, catLeaves, catTreeDepth, classifyCat, type CatNode, type Day } from './catTree'

// 情境：要不要帶雨傘？這次用 4 個「真的不一樣」的線索，每一層問一個：
// 🌦️ 氣象預報說會下雨、💧 空氣濕度很悶、☁️ 窗外雲很多、🐦 小鳥飛得很低（老一輩的說法）。
// 判斷規則：4 個線索裡，只要有 2 個以上說「會下雨」，就帶傘（多數決）——
// 這是所有 2⁴=16 種可能組合的完整列表，剛好需要問滿 4 層才能把每一種組合都分對。
const INDICATORS = [
  { icon: '🌦️', short: '會下雨?', label: '氣象預報說會下雨' },
  { icon: '💧', short: '很悶?', label: '空氣濕度很悶' },
  { icon: '☁️', short: '雲多?', label: '窗外雲很多' },
  { icon: '🐦', short: '飛得低?', label: '小鳥飛得很低（老一輩的說法）' },
] as const
const MAX_DEPTH = 4

const DAYS: Day[] = Array.from({ length: 16 }, (_, i) => {
  const f: (0 | 1)[] = [((i >> 3) & 1) as 0 | 1, ((i >> 2) & 1) as 0 | 1, ((i >> 1) & 1) as 0 | 1, (i & 1) as 0 | 1]
  const sum = f[0] + f[1] + f[2] + f[3]
  return { f, c: sum >= 2 ? 1 : 0 }
})
const FEATS = [0, 1, 2, 3]

const cls = (c: 0 | 1) => (c === 1 ? 'var(--color-brand)' : 'var(--color-red)')
const emojiFor = (c: 0 | 1) => (c === 1 ? '☂' : '☀')

function accuracyAt(depth: number): number {
  const t = buildCatTree(DAYS, FEATS, depth)
  return DAYS.filter((d) => classifyCat(t, d.f) === d.c).length / DAYS.length
}

// ── 樹狀圖的位置計算 ──
interface Laid {
  node: CatNode
  x: number
  depth: number
  children: Laid[]
}
function layout(node: CatNode, depth: number, counter: { i: number }): Laid {
  if (node.leaf) {
    const x = counter.i++
    return { node, x, depth, children: [] }
  }
  const l = layout(node.left, depth + 1, counter)
  const r = layout(node.right, depth + 1, counter)
  return { node, x: (l.x + r.x) / 2, depth, children: [l, r] }
}

export function DecisionTree() {
  const [maxDepth, setMaxDepth] = useState(1)

  const tree = useMemo(() => buildCatTree(DAYS, FEATS, maxDepth), [maxDepth])
  const leafCount = catLeaves(tree).length
  const acc = DAYS.filter((d) => classifyCat(tree, d.f) === d.c).length / DAYS.length
  const actualDepth = catTreeDepth(tree)
  const treeStopped = actualDepth < maxDepth

  const accByDepth = useMemo(
    () => Array.from({ length: MAX_DEPTH + 1 }, (_, d) => accuracyAt(d)),
    [],
  )

  const laid = useMemo(() => layout(tree, 0, { i: 0 }), [tree])
  const TW = 480
  const TH = 290
  const colW = leafCount > 1 ? (TW - 40) / (leafCount - 1) : 0
  const rowH = actualDepth > 0 ? (TH - 60) / actualDepth : 0
  const tx = (x: number) => 20 + x * colW
  const ty = (d: number) => 25 + d * rowH

  const nodes: Laid[] = []
  const edges: { a: Laid; b: Laid; tag: '否' | '是' }[] = []
  const walk = (l: Laid) => {
    nodes.push(l)
    l.children.forEach((c, i) => {
      edges.push({ a: l, b: c, tag: i === 0 ? '否' : '是' })
      walk(c)
    })
  }
  walk(laid)

  return (
    <LessonLayout slug="decision-tree">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        早上出門要不要<b className="text-ink">帶雨傘</b>？你可能會一口氣想到好幾個線索：
        <b className="text-ink">氣象預報說會不會下雨</b>、<b className="text-ink">空氣悶不悶</b>、
        <b className="text-ink">窗外雲多不多</b>，甚至老一輩會說<b className="text-ink">小鳥飛得低不低</b>。
        決策樹就是把這種<b className="text-ink">一個一個線索輪流問下去</b>的過程寫成一棵樹：
        每一層問一個新問題，一路問下去，直到答案篤定為止。
        <br />
        這次的規則很單純：<b className="text-brand">4 個線索裡，只要有 2 個以上都說「會下雨」，就帶傘</b>。
        下面列出了這 4 個線索<b className="text-ink">所有可能的組合</b>（2×2×2×2 = 16 種），
        看機器怎麼一層一層問，把每一種組合都判斷對。
      </div>

      <Section
        title="左邊是 16 種可能的日子，右邊是機器問出的判斷樹"
        description="每張卡片是一種組合：亮色圖示代表那個線索「是」，淡色代表「否」，卡片顏色是正確答案（☂帶傘／☀不帶傘）。拉深度滑桿，看機器一層層追問，卡片上答錯的會標出來，右邊的判斷樹也同步長出來——注意樹的每一層問的是不是都是不同的線索！"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* 16 種組合 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">16 種可能的日子</div>
            <div className="grid grid-cols-4 gap-2">
              {DAYS.map((d, i) => {
                const pred = classifyCat(tree, d.f)
                const wrong = pred !== d.c
                return (
                  <div
                    key={i}
                    className="rounded-xl border-2 p-2 text-center transition-opacity"
                    style={{ borderColor: cls(d.c), opacity: wrong ? 0.45 : 1 }}
                    title={INDICATORS.filter((_, k) => d.f[k] === 1).map((ind) => ind.label).join('、') || '4 個線索都沒發生'}
                  >
                    <div className="flex justify-center gap-0.5 text-sm">
                      {INDICATORS.map((ind, k) => (
                        <span key={k} style={{ opacity: d.f[k] ? 1 : 0.18 }}>{ind.icon}</span>
                      ))}
                    </div>
                    <div className="mt-1 text-lg leading-none">{emojiFor(d.c)}</div>
                    {wrong && <div className="mt-0.5 text-[10px] text-red">❌ 猜錯</div>}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              {INDICATORS.map((ind, i) => (
                <span key={i} className="flex items-center gap-1">{ind.icon} {ind.label}</span>
              ))}
            </div>
          </div>

          {/* 樹狀圖 */}
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">對應的判斷樹（每一層問不同的線索）</div>
            <svg viewBox={`0 0 ${TW} ${TH}`} className="w-full rounded-xl border border-line bg-cream">
              {edges.map((e, i) => {
                const mx = (tx(e.a.x) + tx(e.b.x)) / 2
                const my = (ty(e.a.depth) + ty(e.b.depth)) / 2
                return (
                  <g key={i}>
                    <line x1={tx(e.a.x)} y1={ty(e.a.depth)} x2={tx(e.b.x)} y2={ty(e.b.depth)} stroke="var(--color-line)" strokeWidth={1.5} />
                    <text x={mx} y={my - 3} textAnchor="middle" fontSize={10} fill={e.tag === '是' ? 'var(--color-brand)' : 'var(--color-red)'}>{e.tag}</text>
                  </g>
                )
              })}
              {nodes.map((l, i) => {
                if (l.node.leaf) {
                  return (
                    <g key={i}>
                      <circle cx={tx(l.x)} cy={ty(l.depth)} r={13} fill={cls(l.node.cls)} stroke="#fff" strokeWidth={2} />
                      <text x={tx(l.x)} y={ty(l.depth) + 5} textAnchor="middle" fontSize={14} fill="#fff">{emojiFor(l.node.cls)}</text>
                    </g>
                  )
                }
                const ind = INDICATORS[l.node.feat]
                return (
                  <g key={i}>
                    <rect x={tx(l.x) - 34} y={ty(l.depth) - 12} width={68} height={24} rx={6} fill="#fff" stroke="var(--color-brand)" strokeWidth={1.5} />
                    <text x={tx(l.x)} y={ty(l.depth) + 4} textAnchor="middle" fontSize={11} fill="var(--color-ink)">{ind.icon} {ind.short}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <Slider label="樹的最大深度上限（最多允許問幾個線索）" min={0} max={MAX_DEPTH} value={maxDepth} onChange={setMaxDepth} suffix="層" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-muted">切出的區塊數</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-ink">{leafCount}</div>
            </div>
            <div className="rounded-xl bg-cream p-3">
              <div className="text-xs text-muted">判斷正確率</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-brand">{(acc * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* 深度 vs 正確率的階梯 */}
        <div className="mt-4 flex items-end gap-2">
          {accByDepth.map((a, d) => (
            <button key={d} onClick={() => setMaxDepth(d)} className="flex flex-1 flex-col items-center gap-1">
              <span className={`text-xs font-mono ${d === maxDepth ? 'font-semibold text-brand' : 'text-muted'}`}>
                {(a * 100).toFixed(0)}%
              </span>
              <span
                className="w-full rounded-t-md transition-all"
                style={{ height: `${Math.max(6, a * 70)}px`, background: d === maxDepth ? 'var(--color-brand)' : 'var(--color-brand-pale)' }}
              />
              <span className="text-xs text-muted">{d} 層</span>
            </button>
          ))}
        </div>

        {treeStopped && maxDepth > 0 && (
          <div className="mt-4 rounded-xl border border-line bg-cream p-4 text-sm leading-relaxed text-muted">
            <b className="text-ink">為什麼樹只長到 {actualDepth} 層，明明上限設 {maxDepth} 層？</b>{' '}
            因為每一塊區域<b className="text-ink">已經 100% 純淨</b>——
            決策樹只要某一塊已經分乾淨，就<b className="text-brand">自動停止繼續往下問</b>，
            不會為了湊層數硬多問一次。
          </div>
        )}
      </Section>

      <Challenge
        module="decision-tree"
        id="full-acc"
        title="把 16 種組合全部判斷對"
        goal={<>把「樹的最大深度」一路調到 <b className="text-ink">{MAX_DEPTH} 層</b>，讓機器把 4 個線索<b className="text-ink">全部問過一輪</b>，判斷正確率衝到 100%。</>}
        steps={[
          '把「樹的最大深度」滑桿從 0 開始，一次加一層，或直接點下面階梯圖的長條。',
          '每加一層，樹就多問一個「不一樣」的線索——注意觀察右邊樹狀圖每一層問的圖示都不同。',
          '看左邊 16 張卡片：答錯的會變半透明並標「❌ 猜錯」，卡片越來越少變半透明代表判斷越準。',
          `拉到 ${MAX_DEPTH} 層，讓所有卡片都不再半透明，正確率 100% 就達成。`,
        ]}
        hints={[
          <>深度 0 時，樹什麼都不問，只會猜「大多數日子的答案」（16 種裡 11 種要帶傘，所以它一律猜帶傘）。</>,
          <>只問 1 個線索（例如只問氣象預報）其實還不夠準——因為單一線索沒辦法決定「多數決」的結果，還要搭配其他線索一起看。要問到<b className="text-ink">滿 {MAX_DEPTH} 層</b>，把 4 個線索都問過，才能保證猜對每一種組合。</>,
        ]}
        done={acc >= 0.999}
        success={<>你發現了嗎——只問 1 個線索時，正確率完全沒進步！因為判斷規則是「多數決」（4 個裡要有 2 個以上同意），<b className="text-ink">單一線索本來就不足以決定答案</b>，一定要湊齊夠多線索一起看，正確率才會真的往上跳。這正是決策樹「一層問一個線索」的意義：<b className="text-ink">越往下問，能綜合的資訊越多</b>。這個「多個不太準的線索，合起來就很準」的概念，也正是後面「集成學習」的核心精神。</>}
      />

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">深度 0</b>：一個線索都不問，只會給「最常見的答案」，正確率 {(accByDepth[0] * 100).toFixed(0)}%。
        <b className="text-ink">深度 1</b>：只問「氣象預報」——你會發現正確率<b className="text-ink">完全沒變</b>！
        因為規則是 4 個線索的多數決，光看一個線索猜不準，剩下的組合還是像丟銅板一樣混亂。
        繼續往下加線索，正確率才開始明顯往上跳，直到第 {MAX_DEPTH} 層——4 個線索全部問過一輪——
        才終於<b className="text-ink">100%</b> 猜中每一種組合。
        這正說明了「深度」的意義：<b className="text-ink">每多一層，就是多問一個不一樣的線索</b>，
        而不是把同一個問題換句話說再問一次。
      </div>
    </LessonLayout>
  )
}
