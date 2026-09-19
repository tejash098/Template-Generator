import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { A11Y, FORM, ICON_SIZE, TRANSITION } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

/** A password field with an eye button that reveals what was typed. */
export function PasswordInput(props: PasswordInputProps) {
  const { t } = useLocale()
  const [shown, setShown] = useState(false)
  const label = shown ? t('auth.hidePassword') : t('auth.showPassword')
  return (
    <div className="relative">
      <input type={shown ? 'text' : 'password'} className={`${FORM.INPUT} pr-10`} {...props} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        aria-label={label}
        title={label}
        className={`absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`}
      >
        {shown ? <EyeOff size={ICON_SIZE.SM} aria-hidden="true" /> : <Eye size={ICON_SIZE.SM} aria-hidden="true" />}
      </button>
    </div>
  )
}
