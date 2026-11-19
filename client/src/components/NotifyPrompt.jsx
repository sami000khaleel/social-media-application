import { useState } from 'react'
import Icon from './Icon.jsx'
import * as browser from '../notify.js'

const DISMISS = 'upswing.notifyPromptDismissed'

// Asks once, in the page, before the browser shows its own permission question.
export default function NotifyPrompt({ children = 'Get a notification on your computer when someone writes to you or reacts to your posts while Upswing is in the background.' }) {
  const [state, setState] = useState(() => {
    try { if (localStorage.getItem(DISMISS)) return 'hidden' } catch { /* private window */ }
    return browser.permission()
  })
  if (state !== 'default') return null
  const dismiss = () => { try { localStorage.setItem(DISMISS, '1') } catch { /* private window */ } setState('hidden') }
  return (
    <div className="notify-prompt">
      <span className="note-own"><Icon name="bell" size={18} /></span>
      <p>{children}</p>
      <div className="notify-prompt-actions">
        <button className="btn btn-sm" onClick={dismiss}>Not now</button>
        <button className="btn btn-sm btn-primary" onClick={async () => setState(await browser.ask())}>Turn on</button>
      </div>
    </div>
  )
}
