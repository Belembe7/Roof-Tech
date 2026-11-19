import { useId, type InputHTMLAttributes } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

export function TextField({ label, hint, error, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className="field-wrap">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="rt-input"
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        {...inputProps}
      />
      <p className={error ? 'field-error' : 'field-hint'} id={messageId}>
        {error || hint || '\u00a0'}
      </p>
    </div>
  )
}
