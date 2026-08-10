import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Button } from '../../components/ui/Button'

// 情境：機器怎麼認出一個手寫的「7」？
// 我們看到 7 是一眼就認得，但機器只看到一格格黑白像素。它的做法是：
// 把「7」拆成兩個簡單筆畫——① 頂端那一橫 ② 往左下的那一撇，
// 用兩個「筆畫偵測器」（濾鏡）分別去圖上找，兩個筆畫都在對的地方，就判斷是 7。

const N = 9 // 輸入圖 9×9
const FN = N - 2 // 特徵地圖 7×7

type Grid = number[][]
const zeros = (n: number): Grid => Array.from({ length: n }, () => Array(n).fill(0))

// 標準的手寫「7」：row1 一橫，接著一撇往左下
const SEVEN: Grid = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
]
const TOP_BAR = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6]] // 上面那一橫
const DIAGONAL = [[2, 6], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1]] // 那一撇

// 兩個筆畫偵測器：綠格(+1)＝「這裡要有筆畫」、紅格(−1)＝「這裡要留白」。
// 注意綠格排出來的形狀，就長得像它要找的那一筆。
const DETECTORS = {
  橫: { label: '找「頂端一橫」', icon: '─', k: [[-1, -1, -1], [1, 1, 1], [-1, -1, -1]] },
  撇: { label: '找「那一撇」', icon: '╱', k: [[-1, -1, 1], [-1, 1, -1], [1, -1, -1]] },
} as const
type DetKey = keyof typeof DETECTORS

function convAt(img: Grid, k: readonly (readonly number[])[], r: number, c: number): number {
  let s = 0
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += k[i][j] * img[r + i][c + j]
  return Math.max(0, s) / 3 // ReLU + 正規化到 0~1
}
function featureMapOf(img: Grid, k: readonly (readonly number[])[]): Grid {
  const m = zeros(FN)
  for (let r = 0; r < FN; r++) for (let c = 0; c < FN; c++) m[r][c] = convAt(img, k, r, c)
  return m
}
function maxPool2(m: Grid): Grid {
  const size = m.length
  const out = zeros(Math.ceil(size / 2))
  for (let pr = 0; pr < out.length; pr++)
    for (let pc = 0; pc < out.length; pc++) {
      let mx = 0
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const r = pr * 2 + i, c = pc * 2 + j
        if (r < size && c < size) mx = Math.max(mx, m[r][c])
      }
      out[pr][pc] = mx
    }
  return out
}
const gmax = (m: Grid) => Math.max(...m.flat())

// 全連接層：兩個筆畫都夠明顯，才判斷是 7。權重手動設計，真實網路由訓練學出。
const FC_BIAS = -1.5

export function CNN() {
  const [img, setImg] = useState<Grid>(() => SEVEN.map((r) => [...r]))
  const [detKey, setDetKey] = useState<DetKey>('橫')
  const [win, setWin] = useState<{ r: number; c: number } | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [scanning, setScanning] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const det = DETECTORS[detKey]

  function resetScan() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setScanning(false)
    setWin(null)
    setRevealed(new Set())
  }
  function editImg(next: Grid) {
    setImg(next)
    resetScan()
  }

  const featureMap = useMemo(() => featureMapOf(img, det.k), [img, det])
  const pooled = useMemo(() => maxPool2(featureMap), [featureMap])

  // 兩個偵測器各自的「筆畫強度」（= 特徵地圖最大值），供 Step 3 判斷
  const strokeH = useMemo(() => gmax(featureMapOf(img, DETECTORS['橫'].k)), [img])
  const strokeD = useMemo(() => gmax(featureMapOf(img, DETECTORS['撇'].k)), [img])
  const fcScore = strokeH + strokeD + FC_BIAS
  const is7 = fcScore > 0

  function togglePixel(r: number, c: number) {
    if (scanning) return
    editImg(img.map((row, i) => row.map((v, j) => (i === r && j === c ? (v ? 0 : 1) : v))))
  }
  function eraseCells(cells: number[][]) {
    const g = img.map((r) => [...r])
    for (const [r, c] of cells) g[r][c] = 0
    editImg(g)
  }

  function scan() {
    resetScan()
    setScanning(true)
    const order: [number, number][] = []
    for (let r = 0; r < FN; r++) for (let c = 0; c < FN; c++) order.push([r, c])
    let idx = 0
    timer.current = window.setInterval(() => {
      if (idx >= order.length) {
        clearInterval(timer.current!)
        timer.current = null
        setScanning(false)
        setWin(null)
        return
      }
      const [r, c] = order[idx]
      setWin({ r, c })
      setRevealed((prev) => new Set(prev).add(`${r},${c}`))
      idx++
    }, 90)
  }
  const inWindow = (r: number, c: number) => win !== null && r >= win.r && r < win.r + 3 && c >= win.c && c < win.c + 3

  const pooledMax = gmax(pooled)

  return (
    <LessonLayout slug="cnn">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        你一眼就能認出這是「<b className="text-ink">7</b>」，但機器眼中只有一格格黑白像素，它怎麼知道這是 7？
        <b className="text-brand">CNN（卷積神經網路）</b>的訣竅是——<b className="text-ink">先把數字拆成簡單的筆畫</b>。
        一個 7 其實就是兩筆：<b className="text-ink">頂端一橫</b> ＋ <b className="text-ink">往左下的一撇</b>。
        機器準備兩個小小的<b className="text-ink">「筆畫偵測器」</b>，各自在圖上滑動、去找對應的那一筆。
        <b className="text-ink">兩個筆畫都在對的位置出現，就判斷「這是 7」</b>。這一課就帶你走完機器認出 7 的每一步。
      </div>

      {/* ── Step 1 ── */}
      <Section
        title="Step 1｜卷積層：用「筆畫偵測器」在圖上找一筆"
        description="左邊是手寫的 7（點格子可以自己改）。右邊選一個筆畫偵測器——注意它綠色格子排出來的形狀，就長得像它要找的那一筆。按「掃描」，看偵測器像放大鏡一樣滑過整張圖，特徵地圖會在「找到這一筆」的地方亮起來。"
      >
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div>
            <div className="mb-1.5 text-sm font-medium text-muted">✍️ 手寫的 7（點格子塗改）</div>
            <div className="inline-grid gap-0.5 rounded-xl bg-cream p-2" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
              {img.map((row, r) =>
                row.map((v, c) => (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => togglePixel(r, c)}
                    className="h-7 w-7 rounded transition-colors"
                    style={{
                      background: v ? 'var(--color-ink)' : 'var(--color-paper)',
                      outline: inWindow(r, c) ? '3px solid var(--color-orange)' : '1px solid var(--color-line)',
                      outlineOffset: '-1px',
                    }}
                  />
                )),
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => editImg(SEVEN.map((r) => [...r]))} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-brand-soft">↺ 還原成 7</button>
              <button onClick={() => eraseCells(TOP_BAR)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-brand-soft">🧽 擦掉一橫</button>
              <button onClick={() => eraseCells(DIAGONAL)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-brand-soft">🧽 擦掉一撇</button>
              <button onClick={() => editImg(zeros(N))} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-brand-soft">清空</button>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-1.5 text-sm font-medium text-muted">🔍 選一個筆畫偵測器</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DETECTORS) as DetKey[]).map((key) => {
                  const d = DETECTORS[key]
                  const active = key === detKey
                  return (
                    <button
                      key={key}
                      onClick={() => { setDetKey(key); resetScan() }}
                      className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 transition-colors ${active ? 'border-brand bg-brand/5' : 'border-line hover:border-brand-soft'}`}
                    >
                      <div className="grid grid-cols-3 gap-0.5">
                        {d.k.flat().map((w, i) => (
                          <span key={i} className="h-3.5 w-3.5 rounded-sm" style={{ background: w > 0 ? 'var(--color-brand)' : 'var(--color-red)', opacity: w > 0 ? 1 : 0.5 }} />
                        ))}
                      </div>
                      <span className={`text-sm font-medium ${active ? 'text-brand' : 'text-muted'}`}>{d.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-muted">綠格＝這裡要有筆畫、紅格＝這裡要留白。綠格的形狀「{det.icon}」就是它要找的那一筆。</p>
            </div>

            <div>
              <div className="mb-1.5 text-sm font-medium text-muted">✨ 特徵地圖（偵測器越符合就越亮）</div>
              <div className="inline-grid gap-0.5 rounded-xl bg-cream p-2" style={{ gridTemplateColumns: `repeat(${FN}, 1fr)` }}>
                {featureMap.map((row, r) =>
                  row.map((v, c) => {
                    const shown = revealed.has(`${r},${c}`) || !scanning
                    const isWinCell = win !== null && win.r === r && win.c === c
                    return (
                      <div
                        key={`${r}-${c}`}
                        className="h-7 w-7 rounded"
                        style={{
                          background: shown ? `color-mix(in srgb, var(--color-brand) ${Math.round(v * 100)}%, white)` : 'var(--color-paper)',
                          outline: isWinCell ? '3px solid var(--color-orange)' : '1px solid var(--color-line)',
                          outlineOffset: '-1px',
                        }}
                      />
                    )
                  }),
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                {detKey === '橫' ? '「找頂端一橫」偵測器，會在圖的最上面那條橫線亮起來。' : '「找那一撇」偵測器，會沿著那條斜斜的撇畫亮成一條對角線。'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={scan} disabled={scanning}>▶ 掃描整張圖</Button>
              <Button variant="ghost" onClick={resetScan} disabled={scanning}>重置</Button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Step 2 ── */}
      <Section
        title="Step 2｜池化層：退一步，只記得「這一筆在哪一區」"
        description="剛剛的特徵地圖很精細——連筆畫在第幾格都記得。但要認出 7，其實不用這麼講究。池化（Pooling）把地圖切成 2×2 的小塊、每塊只留最大值，地圖變小、但「這一筆有沒有出現」的重點還在。就像看畫往後退幾步，只抓大概輪廓。"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="mb-1.5 text-xs text-muted">「{det.label}」的特徵地圖（{FN}×{FN}）</div>
            <div className="inline-grid gap-0.5 rounded-xl bg-cream p-2" style={{ gridTemplateColumns: `repeat(${FN}, 1fr)` }}>
              {featureMap.map((row, r) => row.map((v, c) => (
                <div key={`${r}-${c}`} className="h-6 w-6 rounded-sm" style={{ background: `color-mix(in srgb, var(--color-brand) ${Math.round(v * 100)}%, white)`, outline: '1px solid var(--color-line)', outlineOffset: '-1px' }} />
              )))}
            </div>
          </div>
          <div className="text-2xl text-muted">→</div>
          <div>
            <div className="mb-1.5 text-xs text-muted">池化後（{pooled.length}×{pooled.length}，每塊取最大值）</div>
            <div className="inline-grid gap-0.5 rounded-xl bg-cream p-2" style={{ gridTemplateColumns: `repeat(${pooled.length}, 1fr)` }}>
              {pooled.map((row, r) => row.map((v, c) => (
                <div key={`${r}-${c}`} className="flex h-10 w-10 items-center justify-center rounded text-xs font-mono" style={{ background: `color-mix(in srgb, var(--color-brand) ${Math.round(v * 100)}%, white)`, outline: '1px solid var(--color-line)', outlineOffset: '-1px', color: v > 0.6 ? 'white' : 'var(--color-muted)' }}>
                  {v > 0 ? v.toFixed(1) : ''}
                </div>
              )))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          池化後最強的一格是 <b className="text-ink">{pooledMax.toFixed(1)}</b>——這個數字就代表「這張圖裡，這一筆最明顯的程度」。
          接下來 Step 3 只需要問兩個偵測器各自的這個數字，就能下判斷。
        </p>
      </Section>

      {/* ── Step 3 ── */}
      <Section
        title="Step 3｜全連接層：兩筆都到齊，才是 7"
        description="最後一步，把兩個偵測器的「筆畫強度」交給一顆神經元投票（就是你在「神經元與感知器」學過的加權加總）。規則很直覺：頂端一橫要夠明顯、那一撇也要夠明顯，兩個都到齊才判斷是 7。"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-40 shrink-0 text-muted">─ 找到「頂端一橫」了嗎</span>
            <div className="h-3 w-40 overflow-hidden rounded-full bg-cream">
              <div className="h-full rounded-full" style={{ width: `${strokeH * 100}%`, background: 'var(--color-brand)', transition: 'width 0.2s' }} />
            </div>
            <span className="font-mono text-ink">{strokeH.toFixed(2)}</span>
            <span className="text-xs">{strokeH >= 0.75 ? '✅ 有！' : '❌ 沒找到'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-40 shrink-0 text-muted">╱ 找到「那一撇」了嗎</span>
            <div className="h-3 w-40 overflow-hidden rounded-full bg-cream">
              <div className="h-full rounded-full" style={{ width: `${strokeD * 100}%`, background: 'var(--color-brand)', transition: 'width 0.2s' }} />
            </div>
            <span className="font-mono text-ink">{strokeD.toFixed(2)}</span>
            <span className="text-xs">{strokeD >= 0.75 ? '✅ 有！' : '❌ 沒找到'}</span>
          </div>
        </div>

        <div
          className="mt-4 rounded-xl border-2 p-4"
          style={{
            borderColor: is7 ? 'var(--color-lime)' : 'var(--color-line)',
            background: is7 ? 'color-mix(in srgb, var(--color-lime) 12%, white)' : 'var(--color-cream)',
          }}
        >
          <div className="text-sm text-muted">
            加權投票：一橫強度 {strokeH.toFixed(2)} ＋ 一撇強度 {strokeD.toFixed(2)} − 門檻 1.5 =
            <b className="font-mono text-ink"> {fcScore.toFixed(2)}</b>
          </div>
          <div className="mt-1 text-lg font-bold" style={{ color: is7 ? 'var(--color-brand)' : 'var(--color-muted)' }}>
            {is7 ? '✅ 機器判斷：這是 7！' : '❌ 機器判斷：不是 7'}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-amber bg-amber/5 p-4 text-sm leading-relaxed text-muted">
          <b className="text-ink">🎯 動手試試（這一步最重要）：</b>{' '}
          回到 Step 1，按 <b className="text-ink">「🧽 擦掉一橫」</b>——只剩一撇，看起來像「1」，
          你會發現這裡的「一橫」強度立刻掉下去，機器馬上改口說<b className="text-ink">「不是 7」</b>。
          再按「🧽 擦掉一撇」試試，或「↺ 還原成 7」讓它變回來。
          這就是重點：<b className="text-ink">機器不是死記整個 7 的樣子，而是檢查「該有的筆畫有沒有到齊」</b>——
          所以你寫得歪一點、位置偏一點，只要兩筆都在，它照樣認得。
        </div>
      </Section>

      {/* ── 收尾 ── */}
      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">🧱 你剛剛看到的，就是一個最小的 CNN：</b>
        <ul className="mt-2 space-y-1.5">
          <li>· <b className="text-ink">卷積層</b>——用「筆畫偵測器」滑過整張圖，找出各種筆畫在哪（Step 1）。同一個偵測器走遍全圖，所以你把 7 寫在角落或中間都認得（這叫權重共享）。</li>
          <li>· <b className="text-ink">池化層</b>——把地圖縮小、只留「這一筆有沒有出現」的重點，順便讓判斷對位置偏移更不敏感（Step 2）。</li>
          <li>· <b className="text-ink">全連接層</b>——綜合所有筆畫線索，投票做出最終判斷（Step 3）。</li>
        </ul>
        <p className="mt-3">
          真實的 CNN 就是這個放大版：不只兩個偵測器，而是<b className="text-ink">幾十、幾百個</b>，去找橫、豎、撇、捺、圈、角……各種筆畫；
          也不只認一個 7，而是把「有哪些筆畫、在哪些位置」交給全連接層，一次分辨 0～9 十個數字（甚至上千種物體）。
          而且會<b className="text-ink">疊很多層</b>：第一層找筆畫，第二層把筆畫組成「圈」「勾」，第三層再組成完整的字——一層比一層看到更完整的形狀。
        </p>
        <p className="mt-3 border-t border-line pt-3">
          <b className="text-ink">📐 兩個補充名詞：</b>{' '}
          偵測器的小窗戶大小叫 <b className="text-ink">kernel size</b>（這裡是 3×3，窗戶越大一次看得越廣、但越慢）；
          偵測器滑到圖片<b className="text-ink">邊界</b>時窗戶會伸出圖外，真實 CNN 會在圖外圍多補一圈 0（叫 <b className="text-ink">padding</b>），
          讓邊緣的筆畫也能被完整掃到。
        </p>
      </div>
    </LessonLayout>
  )
}
