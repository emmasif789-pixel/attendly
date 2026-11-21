import { lastNDates } from './dashboardLogic.js'

export const PAGE_SIZE = 25

// Remove characters that have a special meaning inside a PostgREST filter string.
export function sanitizeSearch(text) {
  return text.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function pageRange(page, size = PAGE_SIZE) {
  return [page * size, page * size + size - 1]
}

export function lastPage(total, size = PAGE_SIZE) {
  return Math.max(Math.ceil(total / size) - 1, 0)
}

export function pageLabel(page, size, total) {
  if (total === 0) return 'No records'
  const from = page * size + 1
  const to = Math.min(total, (page + 1) * size)
  return `Showing ${from}–${to} of ${total}`
}

export function validateRange(from, to) {
  if (!from || !to) return 'Choose both dates.'
  if (from > to) return 'The start date must not be after the end date.'
  return null
}

export function lastDaysRange(today, days) {
  const d = lastNDates(today, days)
  return { from: d[d.length - 1], to: today }
}

export function presentRate(present, absent) {
  const total = present + absent
  return total === 0 ? null : Math.round((1000 * present) / total) / 10
}
