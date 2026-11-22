// Roll numbers sort naturally: 1, 2, 3, 10, 101 (not 1, 10, 101, 2, 3).
export function rollCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

// Sections in their saved order, then roll number within each section.
export function sortStudents(students, sections) {
  const pos = Object.fromEntries(sections.map((s) => [s.id, s.position]))
  return [...students].sort(
    (x, y) => (pos[x.section_id] ?? 99) - (pos[y.section_id] ?? 99) || rollCompare(x.roll_number, y.roll_number)
  )
}
