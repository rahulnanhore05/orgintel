export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  required = false,
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span style={{ color: 'var(--status-danger)', marginLeft: '2px' }}>*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${error ? 'error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        required={required}
        {...props}
      />
      {error && (
        <div id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </div>
      )}
      {!error && hint && (
        <div id={`${inputId}-hint`} className="form-hint">
          {hint}
        </div>
      )}
    </div>
  );
}
