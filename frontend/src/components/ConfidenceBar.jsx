import { useEffect, useState } from 'react'

export default function ConfidenceBar({ score }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setWidth((score / 10) * 100), 50)
    return () => clearTimeout(timer)
  }, [score])

  let barColor = '#66BB6A'
  let textColor = '#66BB6A'
  if (score <= 4) {
    barColor = '#EF5350'
    textColor = '#EF5350'
  } else if (score <= 7) {
    barColor = '#FFA726'
    textColor = '#FFA726'
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--confidence-track)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 8px ${barColor}`,
            transition: 'width 0.6s ease-out',
          }}
        />
      </div>
      <span
        className="text-xs font-semibold w-10 text-right"
        style={{ color: textColor }}
      >
        {score}/10
      </span>
    </div>
  )
}
