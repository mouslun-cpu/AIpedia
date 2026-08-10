import { useMemo, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'

// 情境：手搖飲菜單上每杯飲料有兩個數字——甜度、熱量。
// 兩者高度連動（越甜通常越肥），能不能壓成「一個數字」：罪惡指數？
// PCA 的答案：找一個投影方向，讓所有飲料投影後「彼此還是分得最開」。
interface Drink {
  name: string
  emoji: string
  sweet: number
  cal: number
}
const MENU: Drink[] = [
  { name: '無糖綠茶', emoji: '🍵', sweet: 4, cal: 6 },
  { name: '微糖烏龍', emoji: '🍂', sweet: 14, cal: 20 },
  { name: '冬瓜青茶', emoji: '🍈', sweet: 20, cal: 14 },
  { name: '四季春', emoji: '🌿', sweet: 26, cal: 18 },
  { name: '翡翠檸檬', emoji: '🍋', sweet: 32, cal: 22 },
  { name: '金桔檸檬', emoji: '🍊', sweet: 40, cal: 30 },
  { name: '蜂蜜綠茶', emoji: '🍯', sweet: 44, cal: 38 },
  { name: '金萱奶綠', emoji: '🍃', sweet: 46, cal: 50 },
  { name: '多多綠', emoji: '🥛', sweet: 52, cal: 44 },
  { name: '觀音拿鐵', emoji: '☕', sweet: 52, cal: 58 },
  { name: '芋頭鮮奶', emoji: '🟣', sweet: 60, cal: 66 },
  { name: '珍珠奶茶', emoji: '🧋', sweet: 70, cal: 72 },
  { name: '布丁奶茶', emoji: '🍮', sweet: 76, cal: 82 },
  { name: '黑糖珍奶', emoji: '🖤', sweet: 84, cal: 86 },
  { name: '草莓冰沙', emoji: '🍓', sweet: 88, cal: 96 },
  { name: '波霸奶蓋', emoji: '👑', sweet: 94, cal: 92 },
]
// 平行宇宙：同一批飲料，但熱量跟甜度「毫無關係」（打亂配對）
const UNCORR_CAL = [66, 20, 86, 14, 58, 92, 6, 72, 30, 96, 44, 18, 82, 38, 50, 62]

function makeDataset(uncorr: boolean) {
  const pts = MENU.map((d, i) => ({ ...d, cal: uncorr ? UNCORR_CAL[i] : d.cal }))
  const mx = pts.reduce((s, p) => s + p.sweet, 0) / pts.length
  const my = pts.reduce((s, p) => s + p.cal, 0) / pts.length
  const dev = pts.map((p) => ({ ...p, dx: p.sweet - mx, dy: p.cal - my }))
  const varTotal =
    dev.reduce((s, p) => s + p.dx * p.dx, 0) / pts.length +
    dev.reduce((s, p) => s + p.dy * p.dy, 0) / pts.length
  // 掃描 0~179 度找最佳角度
  let bestAngle = 0
  let bestPct = 0
  for (let a = 0; a < 180; a++) {
    const r = (a * Math.PI) / 180
    const t = dev.map((p) => p.dx * Math.cos(r) + p.dy * Math.sin(r))
    const m = t.reduce((s, v) => s + v, 0) / t.length
    const v = t.reduce((s, x) => s + (x - m) ** 2, 0) / t.length
    if (v / varTotal > bestPct) {
      bestPct = v / varTotal
      bestAngle = a
    }
  }
  return { dev, varTotal, bestAngle, bestPct }
}
const DATASETS = { corr: makeDataset(false), uncorr: makeDataset(true) }

const S = 360
const PAD = 28
const sx = linearScale([-55, 55], [PAD, S - PAD])
const sy = linearScale([-55, 55], [S - PAD, PAD])

export function PCA() {
  const [universe, setUniverse] = useState<'corr' | 'uncorr'>('corr')
  const [angleDeg, setAngleDeg] = useState(20)
  const [squashed, setSquashed] = useState(false)

  const { dev, varTotal, bestAngle, bestPct } = DATASETS[universe]
  const rad = (angleDeg * Math.PI) / 180
  const ux = Math.cos(rad)
  const uy = Math.sin(rad)

  const proj = useMemo(() => dev.map((p) => p.dx * ux + p.dy * uy), [dev, ux, uy])
  const mean = proj.reduce((s, v) => s + v, 0) / proj.length
  const pct = (proj.reduce((s, v) => s + (v - mean) ** 2, 0) / proj.length / varTotal) * 100
  const isBest = Math.abs(angleDeg - bestAngle) <= 2

  // 罪惡指數排行榜（分數正規化 0~100）
  const tMin = Math.min(...proj)
  const tMax = Math.max(...proj)
  const ranking = useMemo(
    () =>
      dev
        .map((d, i) => ({ d, score: ((proj[i] - tMin) / (tMax - tMin || 1)) * 100 }))
        .sort((a, b) => b.score - a.score),
    [dev, proj, tMin, tMax],
  )

  return (
    <LessonLayout slug="pca">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        手搖店菜單上，每杯飲料有兩個數字：<b className="text-ink">甜度</b>和<b className="text-ink">熱量</b>。
        你想做一張「<b className="text-brand">罪惡指數排行榜</b>」——用<b className="text-ink">一個數字</b>總結每杯有多罪惡。
        問題是：兩個數字怎麼變一個，又不能失去「誰比誰罪惡」的差異？
        這就是 <b className="text-brand">PCA（主成分分析）</b>：找一個投影方向，把每杯飲料「壓」到一條線上，
        讓壓完之後<b className="text-ink">大家還是分得越開越好</b>——分得開，排行榜才排得出來。
      </div>

      <Section
        title="Step 1｜轉動投影軸，再按「壓扁」看結果"
        description="每杯飲料會垂直投影到虛線軸上。轉動角度找出「壓扁後大家還是分最開」的方向，然後按 🫳 壓扁——這就是把兩個欄位變成一個欄位的瞬間。"
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {([['corr', '🧋 本店菜單（甜度、熱量連動）'], ['uncorr', '🌀 平行宇宙（兩者毫無關係）']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setUniverse(key); setSquashed(false) }}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                universe === key ? 'border-brand bg-brand/10 font-medium text-brand' : 'border-line text-muted hover:border-brand-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
            {/* 投影軸 */}
            <line x1={sx(-ux * 70)} y1={sy(-uy * 70)} x2={sx(ux * 70)} y2={sy(uy * 70)} stroke="var(--color-muted)" strokeWidth={1.5} strokeDasharray="5 4" />
            {/* 投影虛線（未壓扁時） */}
            {!squashed &&
              dev.map((p, i) => (
                <line key={i} x1={sx(p.dx)} y1={sy(p.dy)} x2={sx(proj[i] * ux)} y2={sy(proj[i] * uy)} stroke="var(--color-line)" strokeWidth={1} />
              ))}
            {/* 飲料 */}
            {dev.map((p, i) => (
              <g
                key={p.name}
                transform={`translate(${sx(squashed ? proj[i] * ux : p.dx)},${sy(squashed ? proj[i] * uy : p.dy)})`}
                style={{ transition: 'transform 0.6s' }}
              >
                <circle r={9} fill="var(--color-cream)" stroke="var(--color-brand-soft)" strokeWidth={1.5} />
                <text y={4.5} textAnchor="middle" fontSize={12}>
                  {p.emoji}
                  <title>{`${p.name}：甜度 ${p.sweet}、熱量 ${p.cal}`}</title>
                </text>
              </g>
            ))}
            <text x={S - 8} y={sy(0) - 6} textAnchor="end" fontSize={11} fill="var(--color-muted)">🍬 比平均甜 →</text>
            <text x={sx(0) + 6} y={16} fontSize={11} fill="var(--color-muted)">🔥 比平均肥 ↑</text>
          </svg>

          <div className="flex flex-col gap-4">
            <Slider label="投影軸角度" min={0} max={179} value={angleDeg} onChange={setAngleDeg} format={(v) => `${v}°`} />

            <div className="rounded-xl bg-cream p-4">
              <div className="text-xs text-muted">壓扁後保留的差異（誰比誰罪惡的資訊量）</div>
              <div className="mt-1 h-4 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-brand)', transition: 'width 0.1s' }} />
              </div>
              <div className="mt-1 text-right font-mono text-lg font-semibold text-brand">{pct.toFixed(0)}%</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setSquashed((v) => !v)}>{squashed ? '↩️ 還原' : '🫳 壓扁！'}</Button>
              <Button variant="outline" onClick={() => setAngleDeg(bestAngle)}>🔍 跳到最佳角度</Button>
            </div>

            {universe === 'uncorr' ? (
              <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
                🌀 平行宇宙裡甜度和熱量<b className="text-ink">毫無關係</b>，資料是一團圓雲——
                怎麼轉，最多也只能保留 <b className="text-ink">{(bestPct * 100).toFixed(0)}%</b>。
                <b className="text-brand">PCA 只有在欄位彼此相關（資料被拉長）時才壓得動</b>；
                兩個獨立的資訊，就老實留兩個數字吧。
              </div>
            ) : isBest ? (
              <div className="rounded-xl border border-lime bg-lime/10 p-4 text-sm leading-relaxed text-ink">
                ✨ <b>找到第一主成分了！</b>順著資料雲拉長的方向壓，保留 {pct.toFixed(0)}% 的差異——
                「罪惡指數」誕生。往下看排行榜有多合理。
              </div>
            ) : (
              <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
                提示：資料雲斜斜地拉長——把軸轉到<b className="text-ink">順著雲的長邊</b>，
                保留的差異最多；轉到垂直方向，大家全擠成一團（試試 {(bestAngle + 90) % 180}° 附近）。
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Step 2｜罪惡排行榜：一個數字說完整張菜單"
        description="投影後每杯飲料只剩一個數字＝罪惡指數。排行榜跟著上面的角度即時重排——在最佳角度時，順序合情合理；故意轉到爛角度，看看排行怎麼胡言亂語（提示：找找看無糖綠茶排第幾）。"
      >
        <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {ranking.map(({ d, score }, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-7 text-right font-mono text-xs text-muted">{i + 1}.</span>
              <span className="w-28 shrink-0 text-sm text-ink">{d.emoji} {d.name}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, score)}%`,
                    background: `color-mix(in srgb, var(--color-red) ${score}%, var(--color-lime))`,
                    transition: 'width 0.2s',
                  }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-muted">
                {score.toFixed(0)}{i === 0 ? ' 💀' : i === ranking.length - 1 ? ' 😇' : ''}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">你剛剛做的事，資料科學家天天在做：</b>{' '}
        把「甜度、熱量」換成「身高、體重」就是體格指數；換成幾十個問卷題目，壓出來的就是「外向程度」這種人格分數。
        真實世界的 PCA 常把<b className="text-ink">上百個欄位壓成兩三個主成分</b>——
        第一主成分抓最大的差異方向，第二主成分抓剩下的，依此類推。
        而你也在平行宇宙看到它的極限：<b className="text-brand">欄位之間沒有相關性，就沒有東西可壓</b>——
        PCA 是「去除重複資訊」的工具，不是魔法。
      </div>
    </LessonLayout>
  )
}
