// CSV building for exports. Pure functions so they can be tested.

export const BOM = '\uFEFF' // lets Excel read UTF-8 (accents, Urdu) correctly

// A cell that starts with = + - @ (or a tab/CR) can run as a formula in Excel/Sheets.
// Prefix it with an apostrophe so it is treated as plain text.
export function neutralizeFormula(text) {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

export function escapeCell(value) {
  const text = neutralizeFormula(String(value ?? ''))
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// columns: [{ header: 'Date', key: 'date' }, ...]
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => escapeCell(c.header)).join(',')]
  for (const row of rows) lines.push(columns.map((c) => escapeCell(row[c.key])).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}

export function safeFilename(parts, ext = 'csv') {
  const base = parts
    .filter(Boolean)
    .join('_')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'export'}.${ext}`
}
