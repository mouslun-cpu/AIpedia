interface SliderProps {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  /** 顯示在數值旁的單位或說明 */
  suffix?: string
  /** 自訂數值的顯示格式 */
  format?: (value: number) => string
}

/**
 * 參數滑桿。觸控友善（thumb 夠大），數值即時顯示。
 * 所有知識點的「調參數看變化」互動都用這個。
 */
export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  suffix,
  format,
}: SliderProps) {
  const display = format ? format(value) : String(value)
  return (
    <label className="block select-none">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="font-mono text-sm text-brand">
          {display}
          {suffix ? <span className="ml-0.5 text-muted">{suffix}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer"
      />
    </label>
  )
}
