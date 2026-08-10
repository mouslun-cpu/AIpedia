// 多維度 CART 決策樹 + 隨機森林。
// 隨機森林的兩個「隨機」都在這裡實作：
//   1. Bootstrap：每棵樹只看「有放回隨機抽出」的訓練日
//   2. 特徵隨機：每次分裂只從隨機抽出的 mtry 個指標中挑最好的一刀

import type { RFSample } from './data'

export type TreeNode =
  | { leaf: true; pred: 1 | -1 }
  | { leaf: false; feat: number; thr: number; left: TreeNode; right: TreeNode }

function gini(pos: number, n: number) {
  const p = pos / n
  return 1 - p * p - (1 - p) * (1 - p)
}

export function buildTree(
  samples: RFSample[],
  feats: number[],
  maxDepth: number,
  mtry: number,
  rnd: () => number,
  depth = 0,
): TreeNode {
  const pos = samples.filter((s) => s.label === 1).length
  const maj: 1 | -1 = pos * 2 >= samples.length ? 1 : -1
  if (depth >= maxDepth || pos === 0 || pos === samples.length || samples.length < 4)
    return { leaf: true, pred: maj }

  // 特徵隨機：Fisher–Yates 洗牌後取前 mtry 個
  const pool = [...feats]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const cand = pool.slice(0, Math.min(mtry, pool.length))

  let best: { feat: number; thr: number; imp: number } | null = null
  for (const f of cand) {
    const vals = [...new Set(samples.map((s) => s.nf[f]))].sort((a, b) => a - b)
    for (let i = 0; i < vals.length - 1; i++) {
      const thr = (vals[i] + vals[i + 1]) / 2
      let lp = 0
      let ln = 0
      let rp = 0
      let rn = 0
      for (const s of samples) {
        if (s.nf[f] < thr) {
          if (s.label === 1) lp++
          ln++
        } else {
          if (s.label === 1) rp++
          rn++
        }
      }
      if (!ln || !rn) continue
      const imp = (ln * gini(lp, ln) + rn * gini(rp, rn)) / samples.length
      if (!best || imp < best.imp) best = { feat: f, thr, imp }
    }
  }
  if (!best) return { leaf: true, pred: maj }
  const bf = best.feat
  const bt = best.thr
  return {
    leaf: false,
    feat: bf,
    thr: bt,
    left: buildTree(samples.filter((s) => s.nf[bf] < bt), feats, maxDepth, mtry, rnd, depth + 1),
    right: buildTree(samples.filter((s) => s.nf[bf] >= bt), feats, maxDepth, mtry, rnd, depth + 1),
  }
}

export function predictTree(node: TreeNode, nf: number[]): 1 | -1 {
  return node.leaf ? node.pred : predictTree(nf[node.feat] < node.thr ? node.left : node.right, nf)
}

export function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}

/** 種一片森林：每棵樹 = bootstrap 抽樣 + 特徵隨機的深度 4 樹 */
export function buildForest(
  train: RFSample[],
  feats: number[],
  nTrees: number,
  mtry: number,
  depth = 4,
): TreeNode[] {
  const trees: TreeNode[] = []
  for (let i = 0; i < nTrees; i++) {
    const rnd = seeded(5000 + i * 131)
    const boot = Array.from({ length: train.length }, () => train[Math.floor(rnd() * train.length)])
    trees.push(buildTree(boot, feats, depth, mtry, rnd))
  }
  return trees
}
