// Pure helpers for the dashboard (separate so they can be tested).

// Newest first: lastNDates('2026-11-21', 3) -> ['2026-11-21', '2026-11-20', '2026-11-19']
export function lastNDates(today, n) {
  const [y, m, d] = today.split('-').map(Number)
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10))
  }
  return out
}

export function takenStatus(total, marked) {
  if (total === 0) return 'empty'
  if (marked === 0) return 'none'
  if (marked < total) return 'partial'
  return 'full'
}

export function todayBySection(sections, daily, today) {
  return sections.map((s) => {
    const row = daily.find((d) => d.section_id === s.section_id && d.date === today)
    const marked = row?.marked ?? 0
    return {
      section_id: s.section_id,
      name: s.section_name,
      total: s.total_students,
      present: row?.present ?? 0,
      absent: row?.absent ?? 0,
      notMarked: Math.max(s.total_students - marked, 0),
      status: takenStatus(s.total_students, marked),
    }
  })
}

export function weekGrid(sections, daily, dates) {
  return dates.map((date) => ({
    date,
    cells: sections.map((s) => {
      const row = daily.find((d) => d.section_id === s.section_id && d.date === date)
      const marked = row?.marked ?? 0
      const present = row?.present ?? 0
      return {
        section_id: s.section_id,
        present,
        marked,
        pct: marked ? Math.round((1000 * present) / marked) / 10 : null,
      }
    }),
  }))
}
