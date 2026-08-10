// 決策樹（類別型版本）：每個特徵都是 0/1（沒發生／發生），
// 不像 tree.ts 那樣切連續數字的門檻，而是直接問「這個特徵是不是 1？」。
// 目的是讓每一層清楚對應「問了哪一種線索」，而不是同一個數字被問好幾次。

export interface Day {
  /** 4 個是非特徵：[氣象預報下雨, 濕度悶, 窗外雲多, 小鳥飛低]，每個 0=否 1=是 */
  f: (0 | 1)[]
  c: 0 | 1
}

export type CatNode =
  | { leaf: true; cls: 0 | 1; n: number }
  | { leaf: false; feat: number; left: CatNode; right: CatNode }

function gini(rows: Day[]): number {
  if (!rows.length) return 0
  const p1 = rows.filter((r) => r.c === 1).length / rows.length
  return 1 - p1 * p1 - (1 - p1) * (1 - p1)
}
function majority(rows: Day[]): 0 | 1 {
  const ones = rows.filter((r) => r.c === 1).length
  return ones * 2 >= rows.length ? 1 : 0
}
function bestSplit(rows: Day[], feats: number[]): { feat: number; impurity: number } | null {
  let best: { feat: number; impurity: number } | null = null
  for (const f of feats) {
    const no = rows.filter((r) => r.f[f] === 0)
    const yes = rows.filter((r) => r.f[f] === 1)
    if (!no.length || !yes.length) continue
    const imp = (no.length * gini(no) + yes.length * gini(yes)) / rows.length
    if (!best || imp < best.impurity) best = { feat: f, impurity: imp }
  }
  return best
}

/** 建一棵最大深度為 maxDepth 的類別決策樹。每個節點只問一個是非題，答案 0 走左邊、1 走右邊。 */
export function buildCatTree(rows: Day[], feats: number[], maxDepth: number, depth = 0): CatNode {
  const pure = gini(rows) === 0
  if (depth >= maxDepth || pure || rows.length < 2) {
    return { leaf: true, cls: majority(rows), n: rows.length }
  }
  const split = bestSplit(rows, feats)
  if (!split) return { leaf: true, cls: majority(rows), n: rows.length }
  const { feat } = split
  return {
    leaf: false,
    feat,
    left: buildCatTree(rows.filter((r) => r.f[feat] === 0), feats, maxDepth, depth + 1),
    right: buildCatTree(rows.filter((r) => r.f[feat] === 1), feats, maxDepth, depth + 1),
  }
}

export function classifyCat(node: CatNode, f: (0 | 1)[]): 0 | 1 {
  return node.leaf ? node.cls : classifyCat(f[node.feat] === 0 ? node.left : node.right, f)
}
export function catLeaves(node: CatNode): Extract<CatNode, { leaf: true }>[] {
  return node.leaf ? [node] : [...catLeaves(node.left), ...catLeaves(node.right)]
}
export function catTreeDepth(node: CatNode): number {
  return node.leaf ? 0 : 1 + Math.max(catTreeDepth(node.left), catTreeDepth(node.right))
}
