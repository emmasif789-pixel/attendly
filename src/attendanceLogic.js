// Pure helpers for the attendance screen (kept separate so they can be tested).

export function isDirty(students, marks, saved) {
  return students.some((s) => marks[s.id] !== saved[s.id])
}

export function unmarkedStudents(students, marks) {
  return students.filter((s) => !marks[s.id])
}

// Only rows whose status differs from what is saved in the database.
export function changedRows(students, marks, saved, sectionId, date) {
  return students
    .filter((s) => marks[s.id] !== saved[s.id])
    .map((s) => ({ student_id: s.id, section_id: sectionId, date, status: marks[s.id] }))
}

export function countMarks(students, marks) {
  let present = 0
  let absent = 0
  for (const s of students) {
    if (marks[s.id] === 'present') present++
    else if (marks[s.id] === 'absent') absent++
  }
  return { present, absent, unmarked: students.length - present - absent }
}
