export const MIN_PASSWORD_LENGTH = 10

// Returns an error message, or null when the new password is acceptable.
export function validatePassword(password, confirm) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password.trim() !== password) return 'The password must not start or end with a space.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Use both letters and numbers.'
  if (password !== confirm) return 'The two passwords do not match.'
  return null
}
