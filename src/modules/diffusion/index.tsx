import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonLayout, Section } from '../../components/LessonLayout'
import { Slider } from '../../components/ui/Slider'
import { Button } from '../../components/ui/Button'
import { linearScale } from '../../lib/plot'

// 目標圖案：一顆愛心（經典心形曲線的點雲版本）。
const N_POINTS = 90
function heartPoint(t: number) {
  const x = 16 * Math.sin(t) ** 3
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return { x: x / 18, y: -y / 18 } // 正規化到約 [-1,1]，並翻正
}
const CLEAN = Array.from({ length: N_POINTS }, (_, i) => heartPoint((i / N_POINTS) * Math.PI * 2))

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}
// 每個點各自對應一個「完全隨機」的雜訊位置（固定住，讓拖動滑桿時軌跡平滑一致）
const NOISE_TARGETS = (() => {
  const rnd = seeded(99)
  return CLEAN.map(() => ({ x: (rnd() - 0.5) * 2.4, y: (rnd() - 0.5) * 2.4 }))
})()

const S = 340
const PAD = 20
const sx = linearScale([-1.3, 1.3], [PAD, S - PAD])
const sy = linearScale([-1.3, 1.3], [S - PAD, PAD])

export function Diffusion() {
  const [progress, setProgress] = useState(0) // 0=純雜訊, 1=完全還原
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), [])

  const points = useMemo(
    () => CLEAN.map((p, i) => ({
      x: p.x * progress + NOISE_TARGETS[i].x * (1 - progress),
      y: p.y * progress + NOISE_TARGETS[i].y * (1 - progress),
    })),
    [progress],
  )

  function play() {
    if (timer.current) clearInterval(timer.current)
    setProgress(0)
    setPlaying(true)
    let p = 0
    timer.current = window.setInterval(() => {
      p += 0.02
      if (p >= 1) {
        p = 1
        clearInterval(timer.current!)
        timer.current = null
        setPlaying(false)
      }
      setProgress(p)
    }, 40)
  }

  const stage = progress < 0.15 ? 'noise' : progress < 0.85 ? 'mid' : 'clean'

  return (
    <LessonLayout slug="diffusion">
      <div className="rounded-2xl border border-line bg-cream/60 p-5 leading-relaxed text-muted">
        Midjourney、Stable Diffusion 這類影像生成模型，用的是<b className="text-brand">擴散模型</b>。
        訓練時，它們看過無數張圖片被<b className="text-ink">逐步加上雜訊直到變成一團亂碼</b>的過程，
        學會怎麼「逆轉」這個過程。生成新圖片時，就是<b className="text-ink">從一團純雜訊開始，一步步把雜訊移除</b>，
        直到浮現出一張全新的圖。
      </div>

      <Section
        title="拉滑桿，看雜訊怎麼「去噪」成圖案"
        description="這是簡化過的視覺化示範（真正的擴散模型用神經網路一步步預測要移除的雜訊，這裡直接用插值呈現同樣的概念）。拖到最左邊是純雜訊，拖到最右邊是完全還原的圖案。"
      >
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-cream">
            {points.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="var(--color-coral)" opacity={0.85} />
            ))}
          </svg>

          <div className="flex flex-col gap-4">
            <Slider label="去噪進度" min={0} max={1} step={0.01} value={progress} onChange={setProgress} format={(v) => `${Math.round(v * 100)}%`} />
            <Button variant="outline" onClick={play} disabled={playing}>▶ 從純雜訊開始生成</Button>

            <div className="rounded-xl border border-line p-4 text-sm leading-relaxed text-muted">
              {stage === 'noise' && <p><b className="text-ink">純雜訊階段</b>：這時候完全看不出任何圖案，跟生成剛開始時一樣，模型手上什麼都還沒有。</p>}
              {stage === 'mid' && <p><b className="text-ink">逐步去噪中</b>：雜訊被一點一點移除，圖案的輪廓開始浮現——這個過程通常要重複幾十到上百步。</p>}
              {stage === 'clean' && <p><b className="text-ink">生成完成！</b>一顆全新的愛心浮現了。注意：這顆心從頭到尾<b className="text-ink">不是複製貼上的</b>，是從雜訊中「長」出來的。</p>}
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-8 rounded-2xl border border-brand-pale/60 bg-brand-pale/15 p-5 text-sm leading-relaxed text-muted">
        <b className="text-ink">訓練時方向相反：</b>{' '}
        模型會拿真實圖片，一步步<b className="text-ink">加雜訊</b>直到完全看不出原樣，
        並讓神經網路練習「猜出剛剛加了多少雜訊」。這件事練得夠熟之後，
        生成時就能反過來，從純雜訊出發，一步步移除「模型猜測的雜訊」，最終畫出一張全新的圖片。
      </div>
    </LessonLayout>
  )
}
