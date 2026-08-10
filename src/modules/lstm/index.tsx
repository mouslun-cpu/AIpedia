import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'

// 情境：上課抄筆記。老師講一長串話，你不會每個字都記——你有「記憶閘門」：
// 重點就寫進筆記本、廢話就略過、舊筆記該保留就保留。
// LSTM 就是幫 RNN 裝上這種閘門，解決 RNN「記不住很久以前的重點」的老毛病。
//
// 這裡用一個故事序列：開頭出現一個「重點」（主角養的是狗🐕），
// 後面全是無關的廢話。看到最後，還記得主角養什麼嗎？
// RNN 的記憶會被廢話一直覆蓋、越來越淡；LSTM 靠閘門把重點鎖住。

interface Token {
  text: string
  key: boolean // 是不是重點
  signal: number // 這個 token 帶進來的「狗訊號」強度（重點=1，廢話≈0）
}
const STORY: Token[] = [
  { text: '🐕 主角養了一隻狗', key: true, signal: 1 },
  { text: '那天天氣很好', key: false, signal: 0 },
  { text: '他們一起去公園', key: false, signal: 0 },
  { text: '路上買了午餐', key: false, signal: 0 },
  { text: '公園裡人很多', key: false, signal: 0 },
  { text: '玩到傍晚才回家', key: false, signal: 0 },
  { text: '晚上看了場電影', key: false, signal: 0 },
  { text: '❓ 主角養的是什麼？', key: false, signal: 0 },
]
const LAST = STORY.length - 1 // 最後一格是提問，不再更新記憶

// RNN：沒有閘門的記憶。每一步都被新輸入覆蓋掉一部分（leaky）。
// m_new = keep * m_old + (1-keep) * signal，keep 固定 0.6 → 重點很快被稀釋。
const RNN_KEEP = 0.6
function rnnMemory(upto: number): number[] {
  const out = [0]
  let m = 0
  for (let i = 0; i < Math.min(upto, LAST); i++) {
    m = RNN_KEEP * m + (1 - RNN_KEEP) * STORY[i].signal
    out.push(m)
  }
  return out
}
// LSTM：cell = forget * cell + input * signal。
// forget 由使用者控制（保留多少舊記憶）；input 閘門「只對重點打開」。
function lstmMemory(upto: number, forget: number): number[] {
  const out = [0]
  let c = 0
  for (let i = 0; i < Math.min(upto, LAST); i++) {
    const input = STORY[i].key ? 1 : 0 // 輸入閘：重點才寫入
    c = forget * c + input * STORY[i].signal
    out.push(c)
  }
  return out
}

const W = 520
const H = 180
const PADL = 40
const PADB = 28
const sx = linearScale([0, LAST], [PADL, W - 12])
const sy = linearScale([0, 1], [H - PADB, 14])

// ── 互動架構圖：點三道閘門，看它們各自對記憶做了什麼 ──
type GateKey = 'forget' | 'input' | 'output'

function GateDiagram({
  forgetPct,
  inputOpen,
  cellValue,
}: {
  forgetPct: number
  inputOpen: boolean
  cellValue: number
}) {
  const [active, setActive] = useState<GateKey | null>(null)
  const [tick, setTick] = useState(0) // 每次點擊 +1，用來重播動畫
  const [animating, setAnimating] = useState(false) // 動畫播放中（播完卸載，避免 SMIL 一直掛著）
  const animTimer = useRef<number | null>(null)
  useEffect(() => () => void (animTimer.current && clearTimeout(animTimer.current)), [])
  function poke(k: GateKey) {
    setActive(k)
    setTick((t) => t + 1)
    setAnimating(true)
    if (animTimer.current) clearTimeout(animTimer.current)
    animTimer.current = window.setTimeout(() => setAnimating(false), 1400)
  }

  const forgetKept = Math.round(forgetPct * 100)
  const forgetLost = 100 - forgetKept

  // 三道閘門：單一名詞 + 一句白話。boxY = 方框中心高度，node = 主幹線上的運算點
  const GATES: { key: GateKey; name: string; desc: string; boxY: number; nodeX: number; op: string; isOpen: boolean }[] = [
    { key: 'forget', name: '🗑️ 忘記閘', desc: '丟掉多少舊記憶', boxY: 54, nodeX: 130, op: '×', isOpen: true },
    { key: 'input', name: '✏️ 輸入閘', desc: '寫入多少新資料', boxY: 122, nodeX: 250, op: '+', isOpen: inputOpen },
    { key: 'output', name: '📤 輸出閘', desc: '拿出多少當答案', boxY: 190, nodeX: 360, op: '×', isOpen: true },
  ]

  return (
    <div>
      <svg viewBox="0 0 560 232" className="w-full max-w-2xl">
        {/* 上方：長期記憶主幹線 */}
        <line x1={24} y1={24} x2={462} y2={24} stroke="var(--color-orange)" strokeWidth={3} />
        <line x1={462} y1={24} x2={470} y2={24} stroke="var(--color-orange)" strokeWidth={3} markerEnd="url(#lstm-arrow-orange)" />
        <text x={20} y={14} fontSize={10} fill="var(--color-orange)">🧠 長期記憶</text>
        {/* 下方：短期印象迴圈 */}
        <path d="M 24 214 L 462 214 L 462 40" fill="none" stroke="var(--color-brand-soft)" strokeWidth={1.8} strokeDasharray="4 3" />
        <text x={20} y={228} fontSize={10} fill="var(--color-brand-soft)">短期印象</text>

        {/* 資料輸入 */}
        <circle cx={48} cy={150} r={22} fill="var(--color-orange)" opacity={0.85} />
        <text x={48} y={155} textAnchor="middle" fontSize={12} fill="#fff" fontWeight={700}>資料</text>

        {/* 閘門方框（可點擊）＋ 連到主幹線運算點 */}
        {GATES.map((g) => {
          const boxTop = g.boxY - 18
          const isSel = active === g.key
          // 連接線：資料 → 方框；方框 → 運算點
          const connector =
            g.nodeX >= 106 && g.nodeX <= 224
              ? `M ${g.nodeX} ${boxTop} L ${g.nodeX} 24`
              : `M 224 ${g.boxY} L ${g.nodeX} ${g.boxY} L ${g.nodeX} 24`
          return (
            <g key={g.key} onClick={() => poke(g.key)} style={{ cursor: 'pointer' }}>
              <line x1={70} y1={150} x2={106} y2={g.boxY} stroke="var(--color-line)" strokeWidth={1.3} />
              <path d={connector} fill="none" stroke={isSel ? 'var(--color-orange)' : 'var(--color-muted)'} strokeWidth={isSel ? 2.5 : 1.5} style={{ transition: 'stroke 0.2s' }} />
              <rect
                x={106} y={boxTop} width={118} height={36} rx={9}
                fill={g.isOpen ? 'var(--color-brand)' : 'white'}
                stroke={isSel ? 'var(--color-orange)' : 'var(--color-brand)'}
                strokeWidth={isSel ? 3 : 1.6}
                style={{ transition: 'all 0.2s' }}
              />
              <text x={165} y={g.boxY - 2} textAnchor="middle" fontSize={12} fontWeight={700} fill={g.isOpen ? '#fff' : 'var(--color-brand)'}>{g.name}</text>
              <text x={165} y={g.boxY + 12} textAnchor="middle" fontSize={9} fill={g.isOpen ? '#fff' : 'var(--color-muted)'}>{g.desc}</text>
              {/* 運算點 */}
              <circle cx={g.nodeX} cy={24} r={11} fill="var(--color-orange)" />
              <text x={g.nodeX} y={28} textAnchor="middle" fontSize={12} fill="#fff" fontWeight={700}>{g.op}</text>
            </g>
          )
        })}

        {/* forget 的比例、tanh 標示 */}
        <text x={130} y={8} textAnchor="middle" fontSize={9} fill="var(--color-orange)" fontFamily="monospace">×{forgetPct.toFixed(2)}</text>
        <text x={315} y={19} textAnchor="middle" fontSize={11} fontStyle="italic" fill="var(--color-ink)">tanh</text>

        {/* 結果 */}
        <circle cx={492} cy={24} r={22} fill="var(--color-brand-pale)" />
        <text x={492} y={22} textAnchor="middle" fontSize={11} fill="var(--color-ink)" fontWeight={700}>結果</text>
        <text x={492} y={38} textAnchor="middle" fontSize={9} fill="var(--color-muted)" fontFamily="monospace">{(cellValue * 100).toFixed(0)}%</text>

        {/* ── 點擊後的流動動畫（播完卸載） ── */}
        {animating && active === 'forget' && (
          <g key={`f${tick}`}>
            {[0, 1, 2].map((i) => (
              <text key={i} fontSize={15} textAnchor="middle" opacity={0}>💨
                <animate attributeName="opacity" values="0;1;0" dur="1.1s" begin={`${i * 0.16}s`} fill="freeze" />
                <animateMotion dur="1.1s" begin={`${i * 0.16}s`} fill="freeze" path={`M 130 20 L ${118 + i * 10} -14`} />
              </text>
            ))}
          </g>
        )}
        {animating && active === 'input' && inputOpen && (
          <circle key={`i${tick}`} r={6} fill="var(--color-brand)" opacity={0}>
            <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.8;1" dur="1s" fill="freeze" />
            <animateMotion dur="1s" fill="freeze" path="M 48 150 L 250 150 L 250 24" />
          </circle>
        )}
        {animating && active === 'input' && !inputOpen && (
          <text key={`ic${tick}`} x={250} y={-2} textAnchor="middle" fontSize={14} opacity={0}>🚫
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="1.1s" fill="freeze" />
          </text>
        )}
        {animating && active === 'output' && (
          <circle key={`o${tick}`} r={6} fill="var(--color-orange)" opacity={0}>
            <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.8;1" dur="1s" fill="freeze" />
            <animateMotion dur="1s" fill="freeze" path="M 360 24 L 470 24" />
          </circle>
        )}

        <defs>
          <marker id="lstm-arrow-orange" markerWidth={7} markerHeight={7} refX={6} refY={3.5} orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--color-orange)" />
          </marker>
        </defs>
      </svg>

      {/* 點擊後的白話說明 */}
      {active === null ? (
        <div className="mt-2 rounded-lg bg-cream px-3 py-2 text-sm text-muted">
          👆 <b className="text-ink">點點看上面三道閘門</b>，看它們各自對記憶做了什麼。
        </div>
      ) : (
        <div className="mt-2 animate-pop-in rounded-lg border border-brand-pale/50 bg-brand-pale/10 px-3 py-2.5 text-sm leading-relaxed text-muted">
          {active === 'forget' && (
            <span><b className="text-ink">🗑️ 忘記閘：</b>每讀一句話，先幫長期記憶「打個折」——
              這一步<b className="text-ink">保留 {forgetKept}%、忘掉 {forgetLost}%</b>，剛剛 💨 飄走的就是被忘掉的那部分。
              把下面的忘記閘滑桿調低，會忘得更快。</span>
          )}
          {active === 'input' && inputOpen && (
            <span><b className="text-ink">✏️ 輸入閘（現在打開 ✅）：</b>這一步讀到的是<b className="text-ink">重點</b>，
              新資料順著箭頭一路寫進長期記憶（在 <b className="font-mono">+</b> 這裡加進去）。</span>
          )}
          {active === 'input' && !inputOpen && (
            <span><b className="text-ink">✏️ 輸入閘（現在關著 🚫）：</b>這一步讀到的是<b className="text-ink">廢話</b>，
              輸入閘關起來，新資料進不去，長期記憶原封不動——<b className="text-ink">這就是重點能一直被留住的關鍵</b>。</span>
          )}
          {active === 'output' && (
            <span><b className="text-ink">📤 輸出閘：</b>決定要從長期記憶<b className="text-ink">拿多少出來</b>，當作這一步對外說出的答案
              （本課固定全開）。目前記憶強度 <b className="text-ink">{Math.round(cellValue * 100)}%</b>。</span>
          )}
        </div>
      )}
    </div>
  )
}

export function LSTM() {
  const [forget, setForget] = useState(0.98)
  const [pos, setPos] = useState(LAST) // 播放到第幾格
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const rnnMem = useMemo(() => rnnMemory(pos), [pos])
  const lstmMem = useMemo(() => lstmMemory(pos, forget), [pos, forget])
  const rnnNow = rnnMem[rnnMem.length - 1]
  const lstmNow = lstmMem[lstmMem.length - 1]
  const atEnd = pos >= LAST

  function play() {
    if (timer.current) clearInterval(timer.current)
    setPos(0)
    setPlaying(true)
    let i = 0
    timer.current = window.setInterval(() => {
      i++
      setPos(i)
      if (i >= LAST) {
        clearInterval(timer.current!)
        timer.current = null
        setPlaying(false)
      }
    }, 800)
  }
  function reset() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
    setPos(LAST)
  }

  const path = (mem: number[]) =>
    mem.map((m, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(m).toFixed(1)}`).join(' ')

  const currentToken = STORY[Math.min(pos, LAST)]

  return (
    <LessonLayout slug="lstm">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        上課抄筆記時，你不會把老師講的每個字都記下來——你會<b className="text-ink">挑重點寫、把廢話略過，重要的舊筆記還會一直留著</b>。
        <b className="text-brand">LSTM（長短期記憶）</b>就是幫上一課的 RNN 裝上這種<b className="text-ink">「記憶閘門」</b>：
        <b className="text-ink">忘記閘</b>決定舊記憶保留多少、<b className="text-ink">輸入閘</b>決定新東西要不要寫進去。
        這解決了 RNN 的老毛病——<b className="text-ink">很久以前的重點，會被後面一堆廢話一直覆蓋、慢慢忘光</b>。
      </div>

      <Section
        title="點點看：LSTM 的三道記憶閘門"
        description="LSTM 的一個記憶單元裡有三道閘門，各管一件事。上方那條橘色粗線就是一路傳下去的「長期記憶」——它只會被這三道閘門「乘一下、加一下」，中間不用整個重算，這正是它能記很久的原因。直接點下面三個方框，看每一道閘門對記憶做了什麼；填滿顏色代表這一步它是「打開」的。"
      >
        <div className="overflow-x-auto rounded-xl border border-line bg-cream p-4">
          <GateDiagram forgetPct={forget} inputOpen={currentToken.key} cellValue={lstmNow} />
        </div>
      </Section>

      <Section
        title="一個記得住、一個記不住：讓故事跑一遍"
        description="故事的第一句是重點「主角養了一隻狗🐕」，後面全是無關的廢話。下面兩條線是『還記得多少那隻狗』的記憶強度：灰線是沒有閘門的 RNN，藍線是有閘門的 LSTM。按播放，看到最後誰還記得。"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {/* 故事序列 */}
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-cream p-4">
              {STORY.map((t, i) => {
                const read = i < pos || (atEnd && i <= LAST)
                const current = i === Math.min(pos, LAST) && !atEnd
                return (
                  <span
                    key={i}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: i === LAST ? 'white' : t.key ? 'var(--color-brand)' : read ? 'var(--color-line)' : 'white',
                      color: t.key ? 'white' : i === LAST ? 'var(--color-ink)' : 'var(--color-muted)',
                      outline: current ? '2.5px solid var(--color-ink)' : i === LAST ? '2px dashed var(--color-brand-soft)' : '1px solid var(--color-line)',
                      opacity: read || current ? 1 : 0.5,
                    }}
                  >
                    {t.text}
                  </span>
                )
              })}
            </div>

            {/* 記憶強度圖 */}
            <div className="mt-4">
              <div className="mb-1.5 text-sm font-medium text-muted">📈 「還記得那隻狗」的記憶強度</div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-cream">
                <line x1={PADL} y1={sy(0)} x2={W - 12} y2={sy(0)} stroke="var(--color-line)" />
                <line x1={PADL} y1={sy(1)} x2={W - 12} y2={sy(1)} stroke="var(--color-line)" strokeDasharray="3 3" />
                <text x={PADL - 6} y={sy(1) + 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">記得</text>
                <text x={PADL - 6} y={sy(0) + 4} textAnchor="end" fontSize={10} fill="var(--color-muted)">忘光</text>
                {/* RNN */}
                <path d={path(rnnMem)} fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeDasharray="5 4" />
                {rnnMem.length > 0 && <circle cx={sx(rnnMem.length - 1)} cy={sy(rnnNow)} r={4} fill="var(--color-muted)" />}
                {/* LSTM */}
                <path d={path(lstmMem)} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} />
                {lstmMem.length > 0 && <circle cx={sx(lstmMem.length - 1)} cy={sy(lstmNow)} r={5} fill="var(--color-brand)" stroke="#fff" strokeWidth={1.5} />}
              </svg>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-muted" /> 🧠 RNN（沒有閘門）</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-brand" /> 🔐 LSTM（有閘門）</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-cream p-3 text-sm leading-relaxed text-muted">
              目前讀到：<b className="text-ink">{currentToken.text}</b>
              {currentToken.key && <span className="text-brand">　← 這是重點！輸入閘打開，寫進長期記憶</span>}
              {!currentToken.key && pos > 0 && pos < LAST && <span>　← 廢話，輸入閘關閉，長期記憶不受影響</span>}
            </div>

            {atEnd && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-line)' }}>
                  <div className="text-xs text-muted">🧠 RNN 的答案</div>
                  <div className="mt-0.5 font-semibold" style={{ color: rnnNow > 0.5 ? 'var(--color-brand)' : 'var(--color-red)' }}>
                    {rnnNow > 0.5 ? '🐕 記得是狗' : `😵 忘了…（剩 ${(rnnNow * 100).toFixed(0)}%）`}
                  </div>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: lstmNow > 0.5 ? 'var(--color-lime)' : 'var(--color-line)' }}>
                  <div className="text-xs text-muted">🔐 LSTM 的答案</div>
                  <div className="mt-0.5 font-semibold" style={{ color: lstmNow > 0.5 ? 'var(--color-brand)' : 'var(--color-red)' }}>
                    {lstmNow > 0.5 ? '🐕 記得是狗！' : `😵 也忘了…（剩 ${(lstmNow * 100).toFixed(0)}%）`}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={play} disabled={playing}>▶ 播放故事</Button>
              <Button variant="ghost" onClick={reset} disabled={playing}>看最終結果</Button>
            </div>
          </div>

          {/* 閘門控制 */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-line p-4">
              <div className="text-sm font-medium text-ink">🔐 LSTM 的忘記閘</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                每讀一句廢話，長期記憶要<b className="text-ink">保留多少</b>？拉高＝抓得牢，重點撐得久；拉低＝很快被沖淡（就退化成 RNN）。
              </p>
              <div className="mt-3">
                <Slider
                  label="保留舊記憶的比例"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={forget}
                  onChange={setForget}
                  format={(v) => `${(v * 100).toFixed(0)}%`}
                />
              </div>
            </div>

            <div className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-muted">
              <div className="font-medium text-ink">輸入閘（自動）</div>
              <p className="mt-1 text-xs">LSTM 判斷「主角養了狗」是重點才打開輸入閘寫進去；後面的廢話一律關閉，不去覆蓋長期記憶。這就是為什麼藍線能一直保持高點。</p>
            </div>

            <div className="rounded-xl border border-line p-3 text-xs leading-relaxed text-muted">
              💡 把忘記閘拉到 <b className="text-ink">50%</b> 再播一次——你會看到藍線也開始往下掉、跟灰線一樣快忘光。閘門一鬆，LSTM 就失去了它的超能力。
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">關鍵差別：</b>{' '}
        RNN 的記憶像一張<b className="text-ink">會滲水的便條紙</b>，每寫一次新東西就蓋掉一點舊的，久了重要的字就糊掉了；
        LSTM 多了一本<b className="text-ink">上鎖的筆記本（記憶單元 cell）</b>，靠三個閘門選擇性地<b className="text-ink">寫入、擦除、讀出</b>——
        重點可以鎖很久，廢話進不來。這就是為什麼 LSTM 能處理「開頭埋的伏筆、結尾才揭曉」這種<b className="text-ink">長距離依賴</b>，
        也是它在翻譯、語音辨識這些長序列任務上，長年打敗普通 RNN 的原因。
      </div>
    </LessonLayout>
  )
}
