import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon = null,
  type = 'button',
  ...props
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant] || 'btn-primary';

  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="spinner" size={15} aria-hidden="true" />
      ) : Icon ? (
        <Icon size={16} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
