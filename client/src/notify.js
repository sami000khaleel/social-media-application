// Browser (system) notifications. They show while Upswing is open in a tab that is in the background
// or not focused; when you are looking at the page, a small message inside the page is used instead.
const KEY = 'upswing.browserNotifications'

export const supported = () => typeof window !== 'undefined' && 'Notification' in window
export const permission = () => (supported() ? Notification.permission : 'unsupported')
export function enabled() {
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}
export function setEnabled(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private window */ }
}
export async function ask() {
  if (!supported()) return 'unsupported'
  const result = await Notification.requestPermission()
  if (result === 'granted') setEnabled(true)
  return result
}
export const inBackground = () => document.visibilityState !== 'visible' || !document.hasFocus()

// returns true when a system notification was shown
export function show({ title, body, tag, onClick }) {
  if (permission() !== 'granted' || !enabled()) return false
  try {
    const note = new Notification(title, { body, tag, icon: '/favicon.svg' })
    note.onclick = () => { window.focus(); onClick?.(); note.close() }
    return true
  } catch {
    // some mobile browsers only allow notifications from a service worker
    return false
  }
}
