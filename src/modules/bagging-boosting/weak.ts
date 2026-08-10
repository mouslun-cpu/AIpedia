// 品管專題的弱學習器（決策樹樁）與兩種組隊演算法。
//
// 零件有兩個量測值：x = 尺寸、y = 表面粗糙度。
// 良品 = 尺寸落在公差帶內（0.36~0.62）且表面正常；
// 瑕疵三種：太小、太大、刮痕（尺寸 OK 但表面太粗糙）。
// 「太小或太大都是瑕疵」= 一刀（樹樁）永遠切不乾淨的經典結構。
//
// 數據已用調參腳本驗證：單一樹樁 test ~69%、
// Bagging 9 樁 ~75%（高原）、AdaBoost 9 關 ~97%（爬升）。

export interface Part {
  x: number
  y: number
  label: 1 | -1 // 1 = 良品、-1 = 瑕疵
}

export interface Stump {
  axis: 'x' | 'y'
  thr: number
  sign: 1 | -1
  err: number
}

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}

export function genParts(seed: number, nGood: number, nSmall: number, nBig: number, nScratch: number): Part[] {
  const rnd = seeded(seed)
  const pts: Part[] = []
  for (let i = 0; i < nGood; i++) pts.push({ x: 0.36 + rnd() * 0.26, y: 0.06 + rnd() * 0.68, label: 1 })
  for (let i = 0; i < nSmall; i++) pts.push({ x: 0.04 + rnd() * 0.26, y: 0.06 + rnd() * 0.8, label: -1 })
  for (let i = 0; i < nBig; i++) pts.push({ x: 0.68 + rnd() * 0.28, y: 0.06 + rnd() * 0.8, label: -1 })
  for (let i = 0; i < nScratch; i++) pts.push({ x: 0.3 + rnd() * 0.4, y: 0.84 + rnd() * 0.12, label: -1 })
  return pts
}

/** 樹樁預測：一個是非題 */
export const stumpPredict = (st: Stump, p: { x: number; y: number }): 1 | -1 =>
  (((p[st.axis] < st.thr ? 1 : -1) * st.sign) as 1 | -1)

/** 在（可加權的）零件上找出「最好的一刀」 */
export function fitStump(pts: Part[], w: number[]): Stump {
  let best: Stump | null = null
  for (const axis of ['x', 'y'] as const) {
    const vals = [...new Set(pts.map((p) => p[axis]))].sort((a, b) => a - b)
    for (let i = 0; i < vals.length - 1; i++) {
      const thr = (vals[i] + vals[i + 1]) / 2
      for (const sign of [1, -1] as const) {
        let err = 0
        for (let j = 0; j < pts.length; j++)
          if ((pts[j][axis] < thr ? 1 : -1) * sign !== pts[j].label) err += w[j]
        if (!best || err < best.err) best = { axis, thr, sign, err }
      }
    }
  }
  return best!
}

export interface BagMember {
  st: Stump
  /** bootstrap 抽到的零件索引（可重複） */
  idx: number[]
}

export function bagStumps(pts: Part[], rounds: number, seed: number): BagMember[] {
  const members: BagMember[] = []
  for (let r = 0; r < rounds; r++) {
    const rnd = seeded(seed + r * 97)
    const idx = Array.from({ length: pts.length }, () => Math.floor(rnd() * pts.length))
    const boot = idx.map((i) => pts[i])
    members.push({ st: fitStump(boot, boot.map(() => 1 / boot.length)), idx })
  }
  return members
}

export interface BoostMember {
  st: Stump
  alpha: number
  /** 這一關上場時，每個零件的考題權重 */
  wAtStart: number[]
}

export function adaboost(pts: Part[], rounds: number): BoostMember[] {
  let w = pts.map(() => 1 / pts.length)
  const members: BoostMember[] = []
  for (let r = 0; r < rounds; r++) {
    const st = fitStump(pts, w)
    const err = Math.min(0.499, Math.max(0.001, st.err))
    const alpha = 0.5 * Math.log((1 - err) / err)
    members.push({ st, alpha, wAtStart: [...w] })
    w = pts.map((p, i) => w[i] * Math.exp(-alpha * p.label * stumpPredict(st, p)))
    const total = w.reduce((a, b) => a + b, 0)
    w = w.map((v) => v / total)
  }
  return members
}

/** 前 m 位成員的多數決（平手 → 放行） */
export const bagPredict = (ms: BagMember[], p: { x: number; y: number }, m: number): 1 | -1 => {
  let s = 0
  for (let i = 0; i < m; i++) s += stumpPredict(ms[i].st, p)
  return s >= 0 ? 1 : -1
}

/** 前 m 關的加權投票 */
export const boostPredict = (ms: BoostMember[], p: { x: number; y: number }, m: number): 1 | -1 => {
  let s = 0
  for (let i = 0; i < m; i++) s += ms[i].alpha * stumpPredict(ms[i].st, p)
  return s >= 0 ? 1 : -1
}

// ── 固定資料與預先訓練好的兩支團隊 ──
export const N_MEMBERS = 9
export const TRAIN = genParts(21, 22, 10, 10, 6) // 48 個零件
export const TEST = genParts(87, 14, 7, 7, 4) // 32 個新零件
export const BEST_STUMP = fitStump(TRAIN, TRAIN.map(() => 1 / TRAIN.length))
export const BAG = bagStumps(TRAIN, N_MEMBERS, 700)
export const BOOST = adaboost(TRAIN, N_MEMBERS)
