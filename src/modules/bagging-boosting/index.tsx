import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'
import {
  BAG, BEST_STUMP, BOOST, N_MEMBERS, TEST, TRAIN,
  bagPredict, boostPredict, stumpPredict,
  type Part, type Stump,
} from './weak'

const GOOD = 'var(--color-brand)'
const BAD = 'var(--color-red)'

// ── 零件散點圖 ──
const S = 300
const PAD = 26
const sx = linearScale([0, 1], [PAD, S - PAD])
const sy = linearScale([0, 1], [S - PAD, PAD])
const GRID = 22
const cellW = (S - 2 * PAD) / GRID

function PartsPlot({
  tint,
  cut,
  radii,
  dims,
}: {
  /** 背景著色：回傳該位置的判斷（0 = 不上色） */
  tint?: (x: number, y: number) => 1 | -1 | 0
  /** 疊一條樹樁切線 */
  cut?: Stump | null
  /** 每個零件的半徑（boosting 權重視覺化） */
  radii?: number[]
  /** 每個零件是否淡化（bagging 沒抽到的零件） */
  dims?: boolean[]
}) {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
      {tint &&
        Array.from({ length: GRID * GRID }, (_, idx) => {
          const i = idx % GRID
          const j = Math.floor(idx / GRID)
          const gx = (i + 0.5) / GRID
          const gy = (j + 0.5) / GRID
          const v = tint(gx, gy)
          if (v === 0) return null
          return (
            <rect
              key={idx}
              x={sx(gx) - cellW / 2}
              y={sy(gy) - cellW / 2}
              width={cellW + 0.5}
              height={cellW + 0.5}
              fill={v === 1 ? GOOD : BAD}
              opacity={0.1}
            />
          )
        })}
      {cut &&
        (cut.axis === 'x' ? (
          <line x1={sx(cut.thr)} y1={sy(0)} x2={sx(cut.thr)} y2={sy(1)} stroke="var(--color-ink)" strokeWidth={2} strokeDasharray="6 4" />
        ) : (
          <line x1={sx(0)} y1={sy(cut.thr)} x2={sx(1)} y2={sy(cut.thr)} stroke="var(--color-ink)" strokeWidth={2} strokeDasharray="6 4" />
        ))}
      {TRAIN.map((p, i) => (
        <circle
          key={i}
          cx={sx(p.x)}
          cy={sy(p.y)}
          r={radii ? radii[i] : 5.5}
          fill={p.label === 1 ? GOOD : BAD}
          stroke="#fff"
          strokeWidth={1.3}
          opacity={dims && dims[i] ? 0.15 : 1}
        >
          <title>{`尺寸 ${(p.x * 100).toFixed(0)}／粗糙度 ${(p.y * 100).toFixed(0)} → ${p.label === 1 ? '✅ 良品' : '❌ 瑕疵'}`}</title>
        </circle>
      ))}
      <text x={S / 2} y={S - 5} textAnchor="middle" fontSize={11} fill="var(--color-muted)">📏 尺寸 →</text>
      <text x={11} y={S / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)" transform={`rotate(-90,11,${S / 2})`}>🔬 表面粗糙度 →</text>
    </svg>
  )
}

const acc = (fn: (p: Part) => 1 | -1, set: Part[]) => set.filter((p) => fn(p) === p.label).length / set.length

// 兩支團隊在「前 m 位」時的考試正確率（預先算好）
const BAG_CURVE = Array.from({ length: N_MEMBERS }, (_, i) => acc((p) => bagPredict(BAG, p, i + 1), TEST))
const BOOST_CURVE = Array.from({ length: N_MEMBERS }, (_, i) => acc((p) => boostPredict(BOOST, p, i + 1), TEST))
const BEST_TEST = acc((p) => stumpPredict(BEST_STUMP, p), TEST)

// 成長曲線圖
const GW = 460
const GH = 220
const gx = linearScale([1, N_MEMBERS], [40, GW - 16])
const gy = linearScale([0.4, 1.02], [GH - 28, 14])

export function BaggingBoosting() {
  // Step 1：你來當實習生
  const [userAxis, setUserAxis] = useState<'x' | 'y'>('x')
  const [userThr, setUserThr] = useState(0.5)
  // Step 2：訓練競賽
  const [bagShown, setBagShown] = useState(N_MEMBERS)
  const [boostShown, setBoostShown] = useState(N_MEMBERS)
  const [racing, setRacing] = useState(false)
  const timers = useRef<number[]>([])
  // Step 3：逐關檢視
  const [inspectR, setInspectR] = useState(1)

  useEffect(() => () => timers.current.forEach(clearInterval), [])

  // 使用者的一刀：方向自動選訓練成績較好的那邊
  const userStump: Stump = useMemo(() => {
    const mk = (sign: 1 | -1): Stump => ({ axis: userAxis, thr: userThr, sign, err: 0 })
    const a1 = acc((p) => stumpPredict(mk(1), p), TRAIN)
    const a2 = acc((p) => stumpPredict(mk(-1), p), TRAIN)
    return mk(a1 >= a2 ? 1 : -1)
  }, [userAxis, userThr])
  const userTrain = acc((p) => stumpPredict(userStump, p), TRAIN)

  function race() {
    timers.current.forEach(clearInterval)
    timers.current = []
    setBagShown(0)
    setBoostShown(0)
    setRacing(true)
    let b = 0
    const t1 = window.setInterval(() => {
      b++
      setBagShown(b)
      if (b >= N_MEMBERS) clearInterval(t1)
    }, 130)
    let s = 0
    const t2 = window.setInterval(() => {
      s++
      setBoostShown(s)
      if (s >= N_MEMBERS) {
        clearInterval(t2)
        setRacing(false)
      }
    }, 520)
    timers.current = [t1, t2]
  }

  const bagAccNow = bagShown ? BAG_CURVE[bagShown - 1] : 0
  const boostAccNow = boostShown ? BOOST_CURVE[boostShown - 1] : 0

  const linePath = (curve: number[], upTo: number) =>
    curve.slice(0, upTo).map((a, i) => `${i ? 'L' : 'M'}${gx(i + 1).toFixed(1)},${gy(a).toFixed(1)}`).join(' ')

  const bm = BAG[inspectR - 1]
  const bo = BOOST[inspectR - 1]
  const sampled = useMemo(() => {
    const seen = new Set(bm.idx)
    return TRAIN.map((_, i) => !seen.has(i))
  }, [bm])
  const wMax = Math.max(...bo.wAtStart)
  const boostRadii = bo.wAtStart.map((w) => 3.5 + (w / wMax) * 8)
  const bagSoloTest = acc((p) => stumpPredict(bm.st, p), TEST)
  const cutText = (st: Stump) =>
    `${st.axis === 'x' ? '📏 尺寸' : '🔬 粗糙度'} ${st.sign === 1 ? '小於' : '大於'} ${(st.thr * 100).toFixed(0)} 算良品`

  return (
    <LessonLayout slug="bagging-boosting">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        你接手一條<b className="text-ink">零件品管線</b>。每個零件量兩個數字：📏尺寸、🔬表面粗糙度；
        瑕疵有三種死法——<b className="text-ink">太小、太大、有刮痕</b>。
        你手上只有一群<b className="text-ink">實習生檢測員</b>：每個人笨到只會問「一個是非題」（決策樹樁）。
        現在要開兩間工廠打對台，用兩種完全不同的哲學把實習生組成團隊：
        <b className="text-brand">🎲 Bagging 廠</b>——大家平行受訓、一人一票；
        <b className="text-orange">🎯 Boosting 廠</b>——接力特訓、每一關專攻前面的人漏掉的瑕疵。
      </div>

      {/* ── Step 1 ── */}
      <Section
        title="Step 1｜你先來當實習生：一刀能有多準？"
        description="實習生只會問一個是非題，等於在圖上切一刀。你自己試試：挑一個量測值、拉動門檻（刀的方向會自動選比較準的那邊）。良品的尺寸「夾在中間」——太小太大都是瑕疵，先感受一刀的極限在哪。"
      >
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <PartsPlot
            cut={userStump}
            tint={(x, y) => stumpPredict(userStump, { x, y })}
          />
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-1.5 text-sm font-medium text-muted">用哪個量測值切？</div>
              <div className="flex gap-2">
                {(['x', 'y'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setUserAxis(a)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      userAxis === a ? 'border-brand bg-brand/10 font-medium text-brand' : 'border-line text-muted hover:border-brand-soft'
                    }`}
                  >
                    {a === 'x' ? '📏 尺寸' : '🔬 表面粗糙度'}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="門檻切在哪" min={0.05} max={0.95} step={0.01} value={userThr} onChange={setUserThr} format={(v) => (v * 100).toFixed(0)} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">你這一刀的正確率</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-ink">{(userTrain * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-xl bg-cream p-3">
                <div className="text-xs text-muted">電腦最強的一刀</div>
                <div className="mt-0.5 font-mono text-lg font-semibold text-muted">{(acc((p) => stumpPredict(BEST_STUMP, p), TRAIN) * 100).toFixed(0)}%</div>
              </div>
            </div>
            <Button variant="outline" onClick={() => { setUserAxis(BEST_STUMP.axis); setUserThr(BEST_STUMP.thr) }}>
              🔍 讓電腦示範最強的一刀
            </Button>
            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              怎麼切都卡在七成上下——因為良品「夾在中間」，<b className="text-ink">一刀注定放走一種瑕疵</b>。
              一個實習生不夠，該組隊了。
            </div>
          </div>
        </div>
      </Section>

      {/* ── Step 2 ── */}
      <Section
        title="Step 2｜兩間工廠開訓：親眼看「平行」和「接力」的差別"
        description="按下開訓：Bagging 廠的 9 位實習生「同時」開練（每人隨機抽一份零件，互不相識）；Boosting 廠必須「一關練完才能開下一關」——因為下一關的考題，就是前面所有關卡錯的零件。"
      >
        <div className="mb-4 flex items-center gap-3">
          <Button onClick={race} disabled={racing}>🏁 兩廠同時開訓！</Button>
          {racing && bagShown >= N_MEMBERS && boostShown < N_MEMBERS && (
            <span className="text-sm text-brand">🎲 Bagging 廠已收工，🎯 Boosting 廠還在第 {boostShown + 1} 關特訓中…</span>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Bagging 廠 */}
          <div className="flex flex-col gap-3">
            <div className="text-center text-sm font-semibold text-brand">🎲 Bagging 廠（平行受訓 → 一人一票）</div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: N_MEMBERS }, (_, i) => (
                <span
                  key={i}
                  className={`rounded-lg border px-2 py-1 font-mono text-xs transition-all ${
                    i < bagShown ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted opacity-30'
                  }`}
                >
                  👷{i + 1}
                </span>
              ))}
            </div>
            <PartsPlot tint={bagShown ? (x, y) => bagPredict(BAG, { x, y }, bagShown) : undefined} />
            <div className="rounded-xl bg-cream p-3 text-sm">
              {bagShown} 位到齊 → 考試正確率{' '}
              <span className="font-mono font-semibold text-brand">{bagShown ? `${(bagAccNow * 100).toFixed(0)}%` : '–'}</span>
            </div>
          </div>

          {/* Boosting 廠 */}
          <div className="flex flex-col gap-3">
            <div className="text-center text-sm font-semibold text-orange">🎯 Boosting 廠（接力特訓 → 聲量加權投票）</div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: N_MEMBERS }, (_, i) => (
                <span
                  key={i}
                  className={`rounded-lg border px-2 py-1 font-mono text-xs transition-all ${
                    i < boostShown ? 'border-orange bg-orange/10 text-orange' : 'border-line text-muted opacity-30'
                  }`}
                >
                  {i < boostShown ? `關${i + 1} α${BOOST[i].alpha.toFixed(1)}` : `關${i + 1} 🔒`}
                </span>
              ))}
            </div>
            <PartsPlot tint={boostShown ? (x, y) => boostPredict(BOOST, { x, y }, boostShown) : undefined} />
            <div className="rounded-xl bg-cream p-3 text-sm">
              {boostShown} 關完成 → 考試正確率{' '}
              <span className="font-mono font-semibold text-orange">{boostShown ? `${(boostAccNow * 100).toFixed(0)}%` : '–'}</span>
            </div>
          </div>
        </div>

        {/* 成長曲線 */}
        <div className="mt-6">
          <div className="mb-1.5 text-sm font-medium text-muted">考試正確率 vs 團隊人數</div>
          <svg viewBox={`0 0 ${GW} ${GH}`} className="w-full max-w-xl rounded-xl border border-line bg-cream">
            <line x1={40} y1={gy(BEST_TEST)} x2={GW - 16} y2={gy(BEST_TEST)} stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={GW - 18} y={gy(BEST_TEST) - 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">單一實習生 {(BEST_TEST * 100).toFixed(0)}%</text>
            {bagShown > 0 && <path d={linePath(BAG_CURVE, bagShown)} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />}
            {boostShown > 0 && <path d={linePath(BOOST_CURVE, boostShown)} fill="none" stroke="var(--color-orange)" strokeWidth={2.5} />}
            {Array.from({ length: N_MEMBERS }, (_, i) => (
              <g key={i}>
                {i < bagShown && <circle cx={gx(i + 1)} cy={gy(BAG_CURVE[i])} r={3.5} fill="var(--color-brand)" />}
                {i < boostShown && <circle cx={gx(i + 1)} cy={gy(BOOST_CURVE[i])} r={3.5} fill="var(--color-orange)" />}
              </g>
            ))}
            <text x={40} y={GH - 10} fontSize={10} fill="var(--color-muted)">1 人</text>
            <text x={GW - 16} y={GH - 10} textAnchor="end" fontSize={10} fill="var(--color-muted)">{N_MEMBERS} 人</text>
          </svg>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-brand" /> 🎲 Bagging</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-orange" /> 🎯 Boosting</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
          <b className="text-ink">看懂這張圖，就看懂兩種哲學：</b>{' '}
          🎲 Bagging 加再多人，成績都在單一實習生附近<b className="text-ink">高原盤旋</b>——
          每個人拿到的都是隨機考題，練出來的還是「差不多的一刀」，投票平均掉的只有運氣成分（<b className="text-brand">降變異</b>）。
          🎯 Boosting 三關之後<b className="text-ink">陡峭爬升</b>——第二關專攻第一關放走的瑕疵、第三關再補前兩關的漏，
          互補的刀疊起來，把「一刀切不出公差帶」這個先天缺陷治好了（<b className="text-orange">降偏差</b>）。
        </div>
      </Section>

      {/* ── Step 3 ── */}
      <Section
        title="Step 3｜走進工廠：第 r 位成員到底在練什麼？"
        description="拉動滑桿，逐位檢視兩廠的成員。左邊看 Bagging 第 r 位「抽到哪些零件」；右邊看 Boosting 第 r 關「考題被加權成什麼樣子」。這就是平行與接力最本質的差別。"
      >
        <div className="mb-4 max-w-xl">
          <Slider label="檢視第幾位成員／第幾關" min={1} max={N_MEMBERS} value={inspectR} onChange={setInspectR} format={(v) => `第 ${v} 位`} />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-brand">🎲 Bagging 的 👷{inspectR} 號</div>
            <PartsPlot cut={bm.st} dims={sampled} />
            <div className="rounded-xl bg-cream p-3 text-xs leading-relaxed text-muted">
              <p>亮的零件＝他隨機抽到的考題（淡的沒抽到）。他練出的一刀：<b className="text-ink">{cutText(bm.st)}</b>，
                單獨考試 <b className="text-ink">{(bagSoloTest * 100).toFixed(0)}%</b>。</p>
              <p className="mt-1.5"><b className="text-brand">他的考題跟「他是第幾位」完全無關</b>——所以 9 個人可以同時開練，
                誰先誰後、少一個多一個都無所謂。這就是「平行」。</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-orange">🎯 Boosting 的第 {inspectR} 關</div>
            <PartsPlot cut={bo.st} radii={boostRadii} />
            <div className="rounded-xl bg-cream p-3 text-xs leading-relaxed text-muted">
              <p>零件的大小＝這一關考題的權重：<b className="text-ink">前面所有關卡錯的零件被放大</b>。
                他練出的一刀：<b className="text-ink">{cutText(bo.st)}</b>，投票聲量 α={bo.alpha.toFixed(2)}。</p>
              <p className="mt-1.5"><b className="text-orange">第 {inspectR} 關的考題由前 {inspectR - 1} 關的錯誤決定</b>——
                前面沒練完，這一關連題目都出不出來。這就是「接力」，順序不可交換、環環相扣。</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 收尾 ── */}
      <div className="mt-10 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">🏭 兩間工廠的對照表：</b>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1.5 pr-3 font-medium"></th>
                <th className="py-1.5 pr-3 font-medium text-brand">🎲 Bagging</th>
                <th className="py-1.5 font-medium text-orange">🎯 Boosting</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              <tr className="border-b border-line/60"><td className="py-1.5 pr-3 text-muted">每人的考題</td><td className="py-1.5 pr-3">隨機抽樣，互不相干</td><td className="py-1.5">全部零件，但錯題被加權放大</td></tr>
              <tr className="border-b border-line/60"><td className="py-1.5 pr-3 text-muted">訓練方式</td><td className="py-1.5 pr-3">平行——可同時練，順序無關</td><td className="py-1.5">接力——上一關決定下一關的考題</td></tr>
              <tr className="border-b border-line/60"><td className="py-1.5 pr-3 text-muted">投票方式</td><td className="py-1.5 pr-3">一人一票</td><td className="py-1.5">表現好的聲量大（α 加權）</td></tr>
              <tr className="border-b border-line/60"><td className="py-1.5 pr-3 text-muted">治什麼病</td><td className="py-1.5 pr-3">高手想太多 → 降變異（穩）</td><td className="py-1.5">學徒想不夠 → 降偏差（準）</td></tr>
              <tr><td className="py-1.5 pr-3 text-muted">代表作</td><td className="py-1.5 pr-3">隨機森林（上一課！）</td><td className="py-1.5">AdaBoost、XGBoost（Kaggle 常勝軍）</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          <b className="text-ink">關鍵洞見——組隊哲學要配成員性格：</b>{' '}
          Bagging 要配「容易想太多的高手」（深決策樹）才發威，這正是上一課的隨機森林；
          Boosting 要配「很笨但肯學的實習生」（樹樁、淺樹），XGBoost 就是這麼做的。
          🧯 也提醒一句：Boosting 會拼命追打做錯的題，如果資料裡有<b className="text-ink">標錯的零件</b>，
          它會為錯誤賣命——雜訊多的場合，Bagging 反而更讓人放心。
        </p>
      </div>
    </LessonLayout>
  )
}
