export function briefToMarkdown(brief, query) {
  const lines = []

  lines.push('# DeepReason Analysis')
  lines.push(`**Question:** ${query.question}`)
  if (query.domain || query.depth) {
    lines.push(`**Domain:** ${query.domain} | **Depth:** ${query.depth}`)
  }
  lines.push('---')

  lines.push('## TL;DR')
  lines.push(brief.executive_summary)
  lines.push('')

  lines.push('## Key Findings')
  for (const f of brief.key_findings) {
    lines.push(`- ${f.finding} *(Confidence: ${f.confidence}/10)*`)
  }
  lines.push('')

  lines.push('## Trade-offs')
  for (const t of brief.trade_offs) {
    lines.push(`### ${t.option}`)
    lines.push('**Pros:**')
    for (const p of t.pros) lines.push(`- ${p}`)
    lines.push('**Cons:**')
    for (const c of t.cons) lines.push(`- ${c}`)
    lines.push('')
  }

  lines.push('## Recommendation')
  lines.push(`**${brief.recommendation.primary}**`)
  lines.push(`Rationale: ${brief.recommendation.rationale}`)
  lines.push(`Conditions: ${brief.recommendation.conditions}`)
  lines.push('')

  lines.push('## Open Questions')
  brief.open_questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q}`)
  })
  lines.push('')

  lines.push('## Confidence Overview')
  lines.push(
    `Overall: ${brief.confidence_overview.overall}/10 — ${brief.confidence_overview.narrative}`
  )

  if (brief.coverage_gaps?.length > 0) {
    lines.push('')
    lines.push('## Coverage Gaps')
    lines.push(brief.coverage_gaps.join(', '))
  }

  return lines.join('\n')
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}
