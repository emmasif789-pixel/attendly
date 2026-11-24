// Attendance statuses and how they are shown.
export const STATUS_LABEL = { present: 'Present', absent: 'Absent', leave: 'Leave' }

export function statusLabel(status) {
  return STATUS_LABEL[status] ?? status
}

export function statusBadgeClass(status) {
  return status === 'present' ? 'badge ok' : status === 'absent' ? 'badge bad' : 'badge leave'
}

// Leave is excused: it is not counted as present or absent.
export function attendancePercent(present, absent) {
  const counted = present + absent
  return counted === 0 ? null : Math.round((1000 * present) / counted) / 10
}
