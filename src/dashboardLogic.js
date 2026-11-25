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
      leave: row?.on_leave ?? 0,
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
      const counted = present + (row?.absent ?? 0) // leave is excused, so it is not counted
      return {
        section_id: s.section_id,
        present,
        marked,
        counted,
        leave: row?.on_leave ?? 0,
        pct: counted ? Math.round((1000 * present) / counted) / 10 : null,
      }
    }),
  }))
}

// One row per section, one cell per day, oldest day first (reads left to right).
export function weekBySection(sections, daily, dates) {
  const oldestFirst = [...dates].reverse()
  const grid = weekGrid(sections, daily, oldestFirst)
  return sections.map((s, i) => ({
    section_id: s.section_id,
    name: s.section_name,
    days: grid.map((row) => ({ date: row.date, ...row.cells[i] })),
  }))
}

// Colour band for a day's attendance percentage.
export function rateTone(pct) {
  if (pct === null || pct === undefined) return 'none'
  if (pct >= 85) return 'good'
  if (pct >= 75) return 'ok'
  return 'low'
}
