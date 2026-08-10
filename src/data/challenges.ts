// 各知識點有幾個挑戰——首頁徽章與護照頁用來算「完成幾 / 共幾」。
// 新增挑戰時：在對應模組放 <Challenge>，並在這裡把數字 +1。
export const CHALLENGE_COUNTS: Record<string, number> = {
  'linear-regression': 1,
  'loss-function': 1,
  'gradient-descent': 1,
  'kmeans': 1,
  'decision-tree': 1,
  'random-forest': 1,
}

export const TOTAL_CHALLENGES = Object.values(CHALLENGE_COUNTS).reduce((a, b) => a + b, 0)
