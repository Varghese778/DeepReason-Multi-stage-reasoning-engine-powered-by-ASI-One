/**
 * Floating SVG doodles related to deep reasoning — brains, lightbulbs,
 * gears, question marks, network nodes, magnifying glasses, etc.
 * Rendered as a fixed full-screen layer behind all content.
 */

const doodles = [
  {
    // Brain (top-left)
    top: '8%', left: '5%', rotate: -12, size: 48,
    svg: (
      <svg viewBox="0 0 36 42" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C6 2 2 7 2 14c0 4 2 7 4 9-2 2-3 5-3 8 0 5 4 9 9 9s9-4 9-9c0-3-1-6-3-8 2-2 4-5 4-9 0-7-4-12-10-12z" />
        <path d="M12 2v36" strokeDasharray="2 3" />
        <path d="M4 12c4 2 12 2 16 0" />
        <path d="M4 24c4-2 12-2 16 0" />
      </svg>
    ),
  },
  {
    // Lightbulb (top-right)
    top: '10%', right: '8%', rotate: 15, size: 44,
    svg: (
      <svg viewBox="0 0 28 40" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="14" cy="14" r="11" />
        <path d="M10 25h8M11 29h6M12 33h4" strokeLinecap="round" />
        <path d="M14 6v3M9 8l1.5 2.5M19 8l-1.5 2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    // Gear (mid-left)
    top: '42%', left: '3%', rotate: 0, size: 44,
    svg: (
      <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="18" cy="18" r="6" />
        <circle cx="18" cy="18" r="12" strokeDasharray="4 3" />
        <path d="M18 2v4M18 30v4M2 18h4M30 18h4M6.3 6.3l2.8 2.8M26.9 26.9l2.8 2.8M29.7 6.3l-2.8 2.8M9.1 26.9l-2.8 2.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    // Question mark (bottom-right)
    bottom: '18%', right: '6%', rotate: 8, size: 38,
    svg: (
      <svg viewBox="0 0 28 32" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 8c0-4 4-7 8-7s7 3 7 7-3 6-5 7c-1 1-2 2-2 5" strokeLinecap="round" />
        <circle cx="16" cy="27" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    // Network graph (center-right)
    top: '50%', right: '4%', rotate: 0, size: 70,
    svg: (
      <svg viewBox="-15 -25 75 70" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="0" cy="0" r="4" />
        <circle cx="40" cy="-18" r="4" />
        <circle cx="48" cy="22" r="4" />
        <circle cx="18" cy="38" r="4" />
        <circle cx="-10" cy="32" r="3" />
        <line x1="4" y1="-1" x2="36" y2="-16" />
        <line x1="4" y1="2" x2="44" y2="20" />
        <line x1="43" y1="-14" x2="46" y2="18" />
        <line x1="44" y1="24" x2="22" y2="36" />
        <line x1="-2" y1="4" x2="-8" y2="29" />
        <line x1="14" y1="36" x2="-7" y2="32" />
      </svg>
    ),
  },
  {
    // Magnifying glass (bottom-left)
    bottom: '14%', left: '6%', rotate: -20, size: 42,
    svg: (
      <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="14" cy="14" r="11" />
        <line x1="22" y1="22" x2="33" y2="33" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M10 11c0-3 2-5 5-5" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
  },
  {
    // Decision tree (top-center)
    top: '5%', left: '45%', rotate: 0, size: 65,
    svg: (
      <svg viewBox="-35 -5 70 62" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="0" cy="0" r="4" />
        <line x1="0" y1="4" x2="-20" y2="28" />
        <line x1="0" y1="4" x2="20" y2="28" />
        <circle cx="-20" cy="28" r="3.5" />
        <circle cx="20" cy="28" r="3.5" />
        <line x1="-20" y1="31.5" x2="-28" y2="48" />
        <line x1="-20" y1="31.5" x2="-12" y2="48" />
        <line x1="20" y1="31.5" x2="12" y2="48" />
        <line x1="20" y1="31.5" x2="28" y2="48" />
        <circle cx="-28" cy="48" r="2.5" />
        <circle cx="-12" cy="48" r="2.5" />
        <circle cx="12" cy="48" r="2.5" />
        <circle cx="28" cy="48" r="2.5" />
      </svg>
    ),
  },
  {
    // Thought bubble (mid-right upper)
    top: '28%', right: '10%', rotate: 0, size: 42,
    svg: (
      <svg viewBox="-24 -20 48 55" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="0" cy="0" r="16" />
        <circle cx="-14" cy="20" r="5" />
        <circle cx="-20" cy="30" r="3" />
      </svg>
    ),
  },
  {
    // Balance scale (lower-center)
    bottom: '8%', left: '35%', rotate: 0, size: 50,
    svg: (
      <svg viewBox="-5 -2 50 36" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="20" y1="0" x2="20" y2="28" />
        <line x1="2" y1="8" x2="38" y2="8" />
        <line x1="2" y1="8" x2="6" y2="20" />
        <line x1="38" y1="8" x2="34" y2="20" />
        <path d="M1 20q5 6 10 0" />
        <path d="M29 20q5 6 10 0" />
        <path d="M14 28h12" strokeLinecap="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    // Atom (upper-left area)
    top: '22%', left: '14%', rotate: 0, size: 55,
    svg: (
      <svg viewBox="-26 -26 52 52" fill="none" stroke="currentColor" strokeWidth="1.2">
        <ellipse cx="0" cy="0" rx="22" ry="8" />
        <ellipse cx="0" cy="0" rx="22" ry="8" transform="rotate(60)" />
        <ellipse cx="0" cy="0" rx="22" ry="8" transform="rotate(120)" />
        <circle cx="0" cy="0" r="3" fill="currentColor" opacity="0.25" />
      </svg>
    ),
  },
  {
    // Chain links (left mid-lower)
    top: '68%', left: '2%', rotate: 25, size: 36,
    svg: (
      <svg viewBox="-2 -2 18 58" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="0" y="0" width="14" height="22" rx="7" />
        <rect x="0" y="16" width="14" height="22" rx="7" />
        <rect x="0" y="32" width="14" height="22" rx="7" />
      </svg>
    ),
  },
  {
    // Puzzle piece (far upper right)
    top: '4%', right: '22%', rotate: 10, size: 40,
    svg: (
      <svg viewBox="-5 -5 36 36" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M0 0h10c0-4 6-4 6 0h10v10c4 0 4 6 0 6v10H16c0 4-6 4-6 0H0V16c-4 0-4-6 0-6V0z" />
      </svg>
    ),
  },
  {
    // Infinity loop (center-left lower)
    top: '58%', left: '10%', rotate: 0, size: 65,
    svg: (
      <svg viewBox="-5 -12 85 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M0 0c8-10 16-10 20 0s12 10 20 0 12-10 20 0 12 10 20 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    // Target / bullseye (bottom center-right)
    bottom: '22%', right: '20%', rotate: 0, size: 40,
    svg: (
      <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="18" cy="18" r="16" />
        <circle cx="18" cy="18" r="10" />
        <circle cx="18" cy="18" r="4" />
        <circle cx="18" cy="18" r="1.5" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    // Flow arrows (left mid)
    top: '35%', left: '8%', rotate: 5, size: 55,
    svg: (
      <svg viewBox="0 0 60 30" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M0 15h15" strokeLinecap="round" />
        <path d="M12 10l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 15h15" strokeLinecap="round" />
        <path d="M34 10l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44 15h15" strokeLinecap="round" />
        <path d="M56 10l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function BackgroundDoodles() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {doodles.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: d.top,
            left: d.left,
            right: d.right,
            bottom: d.bottom,
            width: d.size,
            height: d.size,
            color: 'var(--accent)',
            opacity: 0.07,
            transform: d.rotate ? `rotate(${d.rotate}deg)` : undefined,
            transition: 'opacity 0.5s',
          }}
        >
          {d.svg}
        </div>
      ))}
    </div>
  )
}
