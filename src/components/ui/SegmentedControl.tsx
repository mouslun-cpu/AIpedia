interface Segment<T extends string> {
  value: T
  label: string
  icon?: string
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
  /** 是否佔滿整個寬度平均分配 */
  fill?: boolean
}

/** 分段切換器 — 用於切換學習範式 / activation function 等互斥選項。 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  fill = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex gap-1 rounded-xl bg-cream p-1 ${
        fill ? 'flex w-full' : ''
      }`}
    >
      {segments.map((seg) => {
        const active = seg.value === value
        return (
          <button
            key={seg.value}
            onClick={() => onChange(seg.value)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[40px] ${
              active
                ? 'bg-brand text-white shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            {seg.icon ? <span className="mr-1">{seg.icon}</span> : null}
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
