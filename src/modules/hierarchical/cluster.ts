// 階層式分群（凝聚式，average linkage）。
// 每次把「距離最近的兩群」合併成一群，記錄合併順序與距離，用來畫樹狀圖。

export interface Pt {
  x: number
  y: number
}

export interface MergeStep {
  a: number // 被合併的節點 id（左）
  b: number // 被合併的節點 id（右）
  dist: number // 合併時的距離
  id: number // 新節點的 id
  members: number[] // 這個新節點包含哪些原始點的 index
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * 回傳合併步驟序列，共 n-1 步（n 為點數）。id 0..n-1 是原始點，之後遞增。
 * 用 average linkage（兩群所有成對點的平均距離）——這個算法保證合併距離
 * 單調遞增，不會有「後面的合併距離反而比前面小」的反轉問題，畫出來的
 * 樹狀圖才會是一棵乾淨的樹（每往上一層，高度一定更高）。
 */
export function agglomerative(pts: Pt[]): MergeStep[] {
  const n = pts.length
  interface Cluster {
    id: number
    members: number[]
  }
  let clusters: Cluster[] = pts.map((_, i) => ({ id: i, members: [i] }))
  const steps: MergeStep[] = []
  let nextId = n

  function avgLinkage(a: Cluster, b: Cluster) {
    let sum = 0
    for (const i of a.members)
      for (const j of b.members) sum += dist(pts[i], pts[j])
    return sum / (a.members.length * b.members.length)
  }

  while (clusters.length > 1) {
    let bi = 0
    let bj = 1
    let bd = Infinity
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = avgLinkage(clusters[i], clusters[j])
        if (d < bd) { bd = d; bi = i; bj = j }
      }
    }
    const ca = clusters[bi]
    const cb = clusters[bj]
    const members = [...ca.members, ...cb.members]
    const merged: Cluster = { id: nextId, members }
    steps.push({ a: ca.id, b: cb.id, dist: bd, id: nextId, members })
    nextId++
    clusters = clusters.filter((_, i) => i !== bi && i !== bj)
    clusters.push(merged)
  }
  return steps
}

/** 在「已完成 upTo 步合併」的狀態下，回傳每個原始點屬於哪個群（用群代表 id 標示）。 */
export function clustersAt(
  n: number,
  steps: MergeStep[],
  upTo: number,
): number[] {
  const parent = Array.from({ length: n }, (_, i) => i)
  function find(x: number): number {
    while (parent[x] !== x) x = parent[x]
    return x
  }
  for (let s = 0; s < upTo; s++) {
    const step = steps[s]
    for (const m of step.members) parent[m] = find(step.members[0])
  }
  return Array.from({ length: n }, (_, i) => find(i))
}
